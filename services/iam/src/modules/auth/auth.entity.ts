import { ApiProperty } from '@nestjs/swagger';
import { AccessTokenTypes } from "../../core/enums/other.enum";

export class TokenData {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Access token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Refresh token for getting new access token',
    example: '0583c49a8ff26132464091da3e1e48d7ae7901af1bd1b6874d...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Refresh token expiration time in seconds',
    example: 604800,
  })
  refreshExpiresIn: number;

  @ApiProperty({
    description: 'Token type',
    enum: AccessTokenTypes,
    example: AccessTokenTypes.Bearer,
  })
  tokenType: AccessTokenTypes;
}
