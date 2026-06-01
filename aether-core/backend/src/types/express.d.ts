import 'express-serve-static-core';

export type UserRole = 'admin' | 'operator' | 'viewer';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userRole?: UserRole;
      actorId?: string;
    }
  }
}

export {};
