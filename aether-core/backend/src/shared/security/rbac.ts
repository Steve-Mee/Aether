import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../types/express';

const ROLE_RANK: Record<UserRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

export function requireRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.userRole ?? 'viewer';
    if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
      res.status(403).json({ error: `Requires ${minRole} role` });
      return;
    }
    next();
  };
}

export const requireViewer = requireRole('viewer');
export const requireOperator = requireRole('operator');
export const requireAdmin = requireRole('admin');
