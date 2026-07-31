import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import { requireOperator, requireViewer } from '../../../shared/security/rbac';

describe('Payments admin RBAC (P12)', () => {
  it('requireOperator rejects viewer for mutations', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn();

    requireOperator(
      { userRole: 'viewer' } as express.Request,
      { status, json } as unknown as express.Response,
      next
    );
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('PaymentFulfillmentController: summary/payouts viewer; reconcile operator', () => {
    const controllerPath = path.resolve(
      __dirname,
      '../api/controllers/PaymentFulfillmentController.ts'
    );
    const source = fs.readFileSync(controllerPath, 'utf8');
    expect(source).toMatch(/listPayments = \[\s*requireViewer/m);
    expect(source).toMatch(/getSummary = \[\s*requireViewer/m);
    expect(source).toMatch(/listPayouts = \[\s*requireViewer/m);
    expect(source).toMatch(/reconcile = \[\s*requireOperator/m);
  });
});
