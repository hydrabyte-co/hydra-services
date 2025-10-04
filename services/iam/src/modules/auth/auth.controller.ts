import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginData, ChangeUserPasswordData, RefreshTokenData } from './auth.dto';
import { TokenData } from './auth.entity';
import { JwtAuthGuard } from '@hydrabyte/base';
import { User } from '../user/user.schema';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async login(@Body() data: LoginData): Promise<TokenData> {
    return this.authService.login(data);
  }

  @Get('verify-token')
  @UseGuards(JwtAuthGuard)
  async verifyToken(@Request() req): Promise<{
    valid: boolean;
    user: any;
  }> {
    // Nếu đến được đây nghĩa là token hợp lệ (đã qua JwtAuthGuard)
    return {
      valid: true,
      user: req.user, // req.user được set bởi JwtStrategy.validate()
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req): Promise<Partial<User>> {
    const userId = req.user.sub || req.user.userId;
    return this.authService.getProfile(userId);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async changePassword(
    @Body() data: ChangeUserPasswordData,
    @Request() req
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user.sub || req.user.userId;
    return this.authService.changePassword(
      userId,
      data.oldPassword,
      data.newPassword
    );
  }

  @Post('refresh-token')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async refreshToken(@Body() data: RefreshTokenData): Promise<TokenData> {
    return this.authService.refreshToken(data.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Request() req,
    @Headers('authorization') authHeader: string,
    @Body() body: { refreshToken?: string }
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user.sub || req.user.userId;

    // Extract access token from Authorization header
    const accessToken = authHeader?.replace('Bearer ', '') || '';

    return this.authService.logout(accessToken, body.refreshToken, userId);
  }
}
