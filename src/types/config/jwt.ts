export interface JWTConfig {
  secret: string;
  access_token_expires_in: string;
  refresh_token_expires_in: string;
  issuer: string;
  audience: string;
}