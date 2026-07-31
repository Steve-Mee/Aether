import { signAccessToken } from '../../../shared/auth/jwtService';
import { verifyPassword } from '../../../shared/auth/passwordService';
import type { UserRole } from '../../../types/express';
import type { AuthRepository } from './ports/AuthRepository';

export interface AuthUserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResult {
  accessToken: string;
  tenantId: string;
  merchantName: string;
  user: AuthUserDto;
}

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'Merchant';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export class LoginUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(tenantId: string, email: string, password: string): Promise<LoginResult> {
    const normalized = email.trim().toLowerCase();
    const user = await this.authRepository.findUserByEmail(tenantId, normalized);

    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const passwordOk = await verifyPassword(user.passwordHash, password);
    if (!passwordOk) {
      throw new Error('Invalid credentials');
    }

    const role = user.role;
    if (!['admin', 'operator', 'viewer'].includes(role)) {
      throw new Error('Invalid credentials');
    }

    const accessToken = signAccessToken({
      sub: user.id,
      tenantId: user.tenantId,
      role,
      email: user.email,
    });

    return {
      accessToken,
      tenantId: user.tenantId,
      merchantName: user.tenant.name,
      user: {
        id: user.id,
        name: displayNameFromEmail(user.email),
        email: user.email,
        role,
      },
    };
  }
}

export function sessionFromTokenPayload(payload: {
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
  merchantName: string;
}): LoginResult {
  return {
    accessToken: '',
    tenantId: payload.tenantId,
    merchantName: payload.merchantName,
    user: {
      id: payload.sub,
      name: displayNameFromEmail(payload.email),
      email: payload.email,
      role: payload.role,
    },
  };
}
