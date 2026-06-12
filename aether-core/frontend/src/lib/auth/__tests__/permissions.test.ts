import { describe, expect, it } from 'vitest';
import { can, roleMeetsMin } from '../permissions';
import type { User } from '../types';

const admin: User = { id: '1', name: 'Admin', role: 'admin' };
const operator: User = { id: '2', name: 'Ops', role: 'operator' };
const viewer: User = { id: '3', name: 'View', role: 'viewer' };

describe('permissions', () => {
  it('grants approvals.view to all roles', () => {
    expect(can(admin, 'approvals.view')).toBe(true);
    expect(can(operator, 'approvals.view')).toBe(true);
    expect(can(viewer, 'approvals.view')).toBe(true);
  });

  it('restricts approveHighRisk to operator and admin', () => {
    expect(can(admin, 'approvals.approveHighRisk')).toBe(true);
    expect(can(operator, 'approvals.approveHighRisk')).toBe(true);
    expect(can(viewer, 'approvals.approveHighRisk')).toBe(false);
  });

  it('restricts settings.manage to admin only', () => {
    expect(can(admin, 'settings.manage')).toBe(true);
    expect(can(operator, 'settings.manage')).toBe(false);
    expect(can(viewer, 'settings.manage')).toBe(false);
  });

  it('returns false for null user', () => {
    expect(can(null, 'command.execute')).toBe(false);
  });

  it('roleMeetsMin compares rank', () => {
    expect(roleMeetsMin('operator', 'viewer')).toBe(true);
    expect(roleMeetsMin('viewer', 'admin')).toBe(false);
  });
});
