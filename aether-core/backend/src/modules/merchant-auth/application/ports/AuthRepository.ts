import type { UserRole } from '../../../../types/express';

export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  role: UserRole;
  tenantId: string;
  tenant: { name: string };
}

export interface AuthRepository {
  findUserByEmail(tenantId: string, email: string): Promise<AuthUserRecord | null>;
}
