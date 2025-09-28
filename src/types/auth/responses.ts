import type { UserWithRole } from "./user.js";

export interface LoginResponse {
  user: UserWithRole;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface JWTPayload {
  user_id: number;
  email: string;
  role: string;
  permissions: string[];
  session_id: number;
}