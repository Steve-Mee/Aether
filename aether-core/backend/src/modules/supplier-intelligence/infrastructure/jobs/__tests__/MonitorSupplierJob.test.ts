import { MonitorSupplierJob } from '../MonitorSupplierJob';

jest.mock('../../../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: jest.fn(() => ({
    monitorSupplierUseCase: { execute: jest.fn().mockResolvedValue({ changes: [] }) },
  })),
}));

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    supplier: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

describe('MonitorSupplierJob', () => {
  it('runAll completes with no suppliers', async () => {
    const job = new MonitorSupplierJob();
    await expect(job.runAll()).resolves.toBeUndefined();
  });
});
