import { EmailContextProvider } from '../application/services/EmailContextProvider';
import type { EmailContextPort } from '../application/ports/EmailContextPort';

describe('EmailContextProvider', () => {
  it('returns database context when customer exists', async () => {
    const port: EmailContextPort = {
      loadContext: jest.fn().mockResolvedValue({
        customerEmail: 'jane@shop.com',
        customerName: 'Jane Doe',
        recentOrderCount: 2,
        recentOrderTotal: 80,
        priorEmailCount: 2,
        source: 'database',
      }),
    };
    const provider = new EmailContextProvider(port);
    const ctx = await provider.getContext('jane@shop.com', 'tenant_default');
    expect(ctx.source).toBe('database');
    expect(ctx.customerName).toBe('Jane Doe');
    expect(ctx.recentOrderCount).toBe(2);
    expect(ctx.recentOrderTotal).toBe(80);
    expect(ctx.priorEmailCount).toBe(2);
  });
});
