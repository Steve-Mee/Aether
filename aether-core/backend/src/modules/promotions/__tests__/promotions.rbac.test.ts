import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import { requireOperator, requireViewer } from '../../../shared/security/rbac';

describe('Promotions admin RBAC (P12)', () => {
  it('requireOperator rejects viewer; requireViewer allows viewer', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn();

    requireOperator(
      { userRole: 'viewer' } as express.Request,
      { status, json } as unknown as express.Response,
      next
    );
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'Requires operator role' });
    expect(next).not.toHaveBeenCalled();

    status.mockClear();
    json.mockClear();
    next.mockClear();

    requireViewer(
      { userRole: 'viewer' } as express.Request,
      { status, json } as unknown as express.Response,
      next
    );
    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });

  it('PromotionsController: list is viewer; create is operator', () => {
    const controllerPath = path.resolve(
      __dirname,
      '../api/controllers/PromotionsController.ts'
    );
    const source = fs.readFileSync(controllerPath, 'utf8');
    expect(source).toMatch(/static list = \[\s*requireViewer/m);
    expect(source).toMatch(/static create = \[\s*requireOperator/m);
  });
});
