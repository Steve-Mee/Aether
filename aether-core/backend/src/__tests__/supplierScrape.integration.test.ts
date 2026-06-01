import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import path from 'path';

const describeIfCi = process.env.CI === 'true' ? describe : describe.skip;

function productSku(url: string, name: string, price: number): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${url}|${name}|${price}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
  return `H-${hash}`;
}

describeIfCi('Supplier scrape integration (Playwright + fixture HTML)', () => {
  let server: http.Server;
  let baseUrl: string;
  const fixturePath = path.join(__dirname, 'fixtures', 'supplier-catalog.html');
  const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fixtureHtml);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('Failed to bind fixture server');
    baseUrl = `http://127.0.0.1:${addr.port}/catalog`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it(
    'scrapes fixture catalog and produces hash-based SKUs',
    async () => {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

      const titleLocators = page.locator('h1,h2,h3');
      const titleCount = await titleLocators.count();
      const titles: string[] = [];
      for (let i = 0; i < titleCount; i++) {
        const text = await titleLocators.nth(i).textContent();
        if (text?.trim()) titles.push(text.trim());
      }
      const bodyText = await page.locator('body').innerText();
      const prices = [...bodyText.matchAll(/(?:€|EUR)\s*(\d+[.,]\d{2})/gi)];

      const rows: { name: string; price: number }[] = [];
      const count = Math.min(prices.length, titles.length, 10);
      for (let i = 0; i < count; i++) {
        const name = titles[i] || `Product ${i + 1}`;
        const price = parseFloat(String(prices[i][1]).replace(',', '.'));
        rows.push({ name, price: Number.isFinite(price) ? price : 0 });
      }

      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const sku = productSku(baseUrl, row.name, row.price);
        expect(sku).toMatch(/^H-[A-F0-9]{16}$/);
        expect(sku.startsWith('SKU-')).toBe(false);
      }
    } finally {
      await browser.close();
    }
  },
  30000
  );
});
