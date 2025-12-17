import { Injectable, UnauthorizedException } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { TokenData } from './auth.entity';
import { LoginData } from './auth.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccessTokenTypes } from '../../core/enums/other.enum';
import { UserStatuses } from '../../core/enums/user.enum';
import {
  verifyPasswordWithAlgorithm,
  hashPasswordWithAlgorithm,
} from '../../core/utils/encryption.util';
import { Organization } from '../organization/organization.schema';
import { User } from '../user/user.schema';
import { TokenStorageService } from './token-storage.service';
import { LicenseService } from '../license/license.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Organization.name) private readonly orgRepo: Model<Organization>,
    @InjectModel(User.name) private readonly userRepo: Model<User>,
    private readonly tokenStorage: TokenStorageService,
    private readonly licenseService: LicenseService
  ) {}

  async login(data: LoginData): Promise<TokenData> {
    // Find user by username
    const user = await this.userRepo.findOne({
      username: data.username,
      status: UserStatuses.Active,
      isDeleted: false,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await verifyPasswordWithAlgorithm(
      data.password,
      user.password.hashedValue,
      user.password.algorithm,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate JWT secret
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';

    // Fetch licenses for organization
    const orgId = user.owner?.orgId || '';
    let licenses: Record<string, string> = {};
    if (orgId) {
      try {
        licenses = await this.licenseService.getLicensesForJWT(orgId);
      } catch (error) {
        console.error('Failed to fetch licenses for JWT:', error.message);
        // Continue with empty licenses if fetch fails
      }
    }

    // Create JWT payload
    const jwtPayload = {
      sub: user._id.toString(),
      username: user.username,
      status: user.status,
      roles: user.roles || [],
      orgId,
      groupId: user.owner?.groupId || '',
      agentId: user.owner?.agentId || '',
      appId: user.owner?.appId || '',
      licenses, // Add licenses to JWT payload
    };

    // Sign access token
    // @ts-expect-error - TypeScript has issues with jsonwebtoken types
    const accessToken = sign(jwtPayload, jwtSecret, {
      expiresIn: jwtExpiresIn,
    });

    // Calculate expiration time in seconds
    const expiresIn = this.parseExpirationTime(jwtExpiresIn);

    // Generate refresh token (valid for 7 days)
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshExpiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
    const refreshExpiresAt = Date.now() + refreshExpiresIn * 1000;

    // Store refresh token
    this.tokenStorage.storeRefreshToken(
      refreshToken,
      user._id.toString(),
      refreshExpiresAt
    );

    const tokenData: TokenData = {
      accessToken,
      expiresIn,
      refreshToken,
      refreshExpiresIn,
      tokenType: AccessTokenTypes.Bearer,
    };

    return tokenData;
  }

  /**
   * Get user profile by user ID
   * @param userId - User ID from JWT token
   * @returns User profile without password
   */
  async getProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userRepo
      .findOne({
        _id: userId,
        status: UserStatuses.Active,
        isDeleted: false,
      })
      .select('-password -isDeleted -deletedAt')
      .exec();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Change user password
   * @param userId - User ID from JWT token
   * @param oldPassword - Current password
   * @param newPassword - New password
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    // Find user
    const user = await this.userRepo.findOne({
      _id: userId,
      status: UserStatuses.Active,
      isDeleted: false,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify old password
    const isOldPasswordValid = await verifyPasswordWithAlgorithm(
      oldPassword,
      user.password.hashedValue,
      user.password.algorithm
    );

    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    // Hash new password
    const newHashedPassword = await hashPasswordWithAlgorithm(
      newPassword,
      user.password.algorithm
    );

    // Update password
    await this.userRepo.updateOne(
      { _id: userId },
      {
        $set: {
          'password.hashedValue': newHashedPassword,
          updatedAt: new Date(),
        },
      }
    );

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Refresh token
   * @returns New token data
   */
  async refreshToken(refreshToken: string): Promise<TokenData> {
    // Validate refresh token
    const userId = this.tokenStorage.validateRefreshToken(refreshToken);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user
    const user = await this.userRepo.findOne({
      _id: userId,
      status: UserStatuses.Active,
      isDeleted: false,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';

    // Fetch CURRENT licenses from database (passive update)
    const orgId = user.owner?.orgId || '';
    let licenses: Record<string, string> = {};
    if (orgId) {
      try {
        licenses = await this.licenseService.getLicensesForJWT(orgId);
      } catch (error) {
        console.error('Failed to fetch licenses for JWT:', error.message);
        // Continue with empty licenses if fetch fails
      }
    }

    // Create new JWT payload
    const jwtPayload = {
      sub: user._id.toString(),
      username: user.username,
      status: user.status,
      roles: user.roles || [],
      orgId,
      groupId: user.owner?.groupId || '',
      agentId: user.owner?.agentId || '',
      appId: user.owner?.appId || '',
      licenses, // Add updated licenses to JWT payload
    };

    // Sign new access token
    // @ts-expect-error - TypeScript has issues with jsonwebtoken types
    const accessToken = sign(jwtPayload, jwtSecret, {
      expiresIn: jwtExpiresIn,
    });

    const expiresIn = this.parseExpirationTime(jwtExpiresIn);

    return {
      accessToken,
      expiresIn,
      refreshToken, // Return same refresh token
      refreshExpiresIn: 7 * 24 * 60 * 60,
      tokenType: AccessTokenTypes.Bearer,
    };
  }

  /**
   * Logout user - blacklist access token and revoke refresh token
   * @param accessToken - Access token to blacklist
   * @param refreshToken - Optional refresh token to revoke
   * @param userId - User ID
   */
  async logout(
    accessToken: string,
    refreshToken: string | undefined,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    // Decode access token to get expiration
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    try {
      const decoded = verify(accessToken, jwtSecret) as any;
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds

      // Blacklist access token
      this.tokenStorage.blacklistAccessToken(accessToken, expiresAt);

      // Revoke refresh token if provided
      if (refreshToken) {
        this.tokenStorage.revokeRefreshToken(refreshToken);
      }

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      // Even if token is invalid, try to revoke refresh token
      if (refreshToken) {
        this.tokenStorage.revokeRefreshToken(refreshToken);
      }

      return {
        success: true,
        message: 'Logged out successfully',
      };
    }
  }

  /**
   * Parse expiration time string to seconds
   * @param expiresIn - Time string like '1h', '3600', '30m'
   * @returns Time in seconds
   */
  private parseExpirationTime(expiresIn: string): number {
    if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn.replace('h', '')) * 3600;
    } else if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn.replace('m', '')) * 60;
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn.replace('d', '')) * 86400;
    } else {
      return parseInt(expiresIn);
    }
  }
}
