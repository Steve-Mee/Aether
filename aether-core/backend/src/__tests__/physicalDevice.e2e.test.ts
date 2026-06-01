import http from 'http';
import { HttpDeviceAdapter } from '../modules/physical-digital-symbiosis/infrastructure/adapters/DeviceAdapter';

describe('Physical device E2E harness', () => {
  let server: http.Server;
  let port: number;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      if (req.url === '/shelf/sync' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ itemsUpdated: 2 }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    server.listen(0, () => {
      const addr = server.address();
      port = typeof addr === 'object' && addr ? addr.port : 0;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('syncs inventory via HTTP device adapter against mock shelf server', async () => {
    const adapter = new HttpDeviceAdapter(`http://127.0.0.1:${port}`);
    const result = await adapter.syncShelf('shelf-1', [
      { sku: 'SKU-1', quantity: 5 },
      { sku: 'SKU-2', quantity: 3 },
    ]);
    expect(result.shelfId).toBe('shelf-1');
    expect(result.itemsUpdated).toBe(2);
  });
});
