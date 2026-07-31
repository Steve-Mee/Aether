import { prisma } from '../../../../shared/prisma/client';
import type { UserRole } from '../../../../types/express';
import type { AuthRepository, AuthUserRecord } from '../../application/ports/AuthRepository';

export class PrismaAuthRepository implements AuthRepository {
  async findUserByEmail(tenantId: string, email: string): Promise<AuthUserRecord | null> {
    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
      include: { tenant: true },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as UserRole,
      tenantId: user.tenantId,
      tenant: { name: user.tenant.name },
    };
  }
}
