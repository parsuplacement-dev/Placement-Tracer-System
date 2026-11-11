import type { CoordinatorScopeGrant, Role } from "@/types";

export interface AuthUser {
  id: string;
  providerUserId: string;
  name: string;
  nameConfirmedAt: string | null;
  email: string;
  pictureUrl: string | null;
  role: Role;
  coordinatorGrants: CoordinatorScopeGrant[];
  emailVerified: boolean;
  enabled: boolean;
  roleChangeNotice: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthProvider {
  getCurrentUser(): Promise<AuthUser | null>;
  getGoogleAuthorizationUrl(origin: string): Promise<string>;
  completeOAuth(code: string, state?: string | null): Promise<AuthUser>;
  refreshSession(): Promise<void>;
  signOut(): Promise<void>;
  consumeRoleChangeNotice(user: AuthUser): Promise<string | null>;
}
