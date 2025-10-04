import { AccessTokenTypes } from "../../core/enums/other.enum";

export type TokenData = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
  tokenType: AccessTokenTypes;
};
