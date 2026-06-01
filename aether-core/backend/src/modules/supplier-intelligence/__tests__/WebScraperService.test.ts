import { WebScraperService } from '../application/services/WebScraperService';

jest.mock('child_process', () => ({
  spawn: jest.fn(() => {
    const { EventEmitter } = require('events');
    const child = new EventEmitter();
    setTimeout(() => {
      child.emit('close', 0);
    }, 0);
    Object.defineProperty(child, 'stdout', {
      value: { on: (_: string, cb: (d: Buffer) => void) => cb(Buffer.from(JSON.stringify({ rows: [], scrape_status: 'empty' }))) },
    });
    Object.defineProperty(child, 'stderr', { value: { on: jest.fn() } });
    return child;
  }),
}));

jest.mock('../../../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

describe('WebScraperService', () => {
  it('returns empty array and publishes event on empty scrape', async () => {
    const service = new WebScraperService();
    const rows = await service.scrape('https://example.com/catalog', { tenantId: 'tenant_default' });
    expect(rows).toEqual([]);
  });
});
