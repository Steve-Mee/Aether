/**
 * Isolated supplier scrape worker (spawned by WebScraperService).
 * Product identity = hash(url + name + price) — no synthetic SKU labels.
 */

import axios from 'axios';
import crypto from 'crypto';

const url = process.argv[2];
if (!url) {
  console.error(JSON.stringify({ error: 'Missing URL' }));
  process.exit(1);
}

function productId(targetUrl, name, price) {
  return crypto
    .createHash('sha256')
    .update(`${targetUrl}|${name}|${price}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
}

function toRow(targetUrl, name, price) {
  return {
    name,
    sku: `H-${productId(targetUrl, name, price)}`,
    price: Number.isFinite(price) ? price : 0,
    stock: null,
  };
}

async function checkRobotsTxt(targetUrl) {
  const parsed = new URL(targetUrl);
  const robotsUrl = `${parsed.origin}/robots.txt`;
  try {
    const res = await axios.get(robotsUrl, { timeout: 5000 });
    const text = String(res.data);
    const crawlDelayMatch = text.match(/Crawl-delay:\s*(\d+)/i);
    if (crawlDelayMatch) {
      const delaySec = parseInt(crawlDelayMatch[1], 10);
      await new Promise((r) => setTimeout(r, delaySec * 1000));
    }
    const disallowAll = /User-agent:\s*\*[\s\S]*?Disallow:\s*\//i.test(text);
    if (disallowAll && text.includes('Disallow: /')) {
      return { allowed: false, reason: 'robots.txt disallows crawling' };
    }
  } catch {
    // No robots.txt — proceed
  }
  return { allowed: true };
}

async function scrapeWithPlaywright(targetUrl) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const rows = await page.evaluate(() => {
      const prices = [...document.body.innerText.matchAll(/(?:€|EUR)\s*(\d+[.,]\d{2})/gi)];
      const titles = [...document.querySelectorAll('h1,h2,h3')].map((el) => el.textContent?.trim()).filter(Boolean);
      const out = [];
      const count = Math.min(prices.length, titles.length, 10);
      for (let i = 0; i < count; i++) {
        const name = titles[i] || `Product ${i + 1}`;
        const price = parseFloat(String(prices[i][1]).replace(',', '.'));
        out.push({ name, price: Number.isFinite(price) ? price : 0 });
      }
      return out;
    });
    return rows.map((r) => toRow(targetUrl, r.name, r.price));
  } finally {
    await browser.close();
  }
}

async function scrapeWithHttp(targetUrl) {
  const response = await axios.get(targetUrl, {
    timeout: 15000,
    headers: { 'User-Agent': 'AETHER-Supplier-Agent/0.8' },
    maxRedirects: 3,
  });
  const html = String(response.data);
  const priceMatches = [...html.matchAll(/(?:€|EUR)\s*(\d+[.,]\d{2})/gi)];
  const titleMatches = [...html.matchAll(/<h[1-3][^>]*>([^<]{3,80})<\/h[1-3]>/gi)];
  const rows = [];
  const count = Math.min(priceMatches.length, titleMatches.length, 10);
  for (let i = 0; i < count; i++) {
    const price = parseFloat(priceMatches[i][1].replace(',', '.'));
    const name = titleMatches[i][1].trim();
    rows.push(toRow(targetUrl, name, price));
  }
  return rows;
}

async function main() {
  const robots = await checkRobotsTxt(url);
  if (!robots.allowed) {
    console.log(JSON.stringify({ rows: [], scrape_status: 'blocked', reason: robots.reason }));
    return;
  }

  const mode = process.env.SUPPLIER_SCRAPER ?? 'http';
  try {
    const rows = mode === 'playwright' ? await scrapeWithPlaywright(url) : await scrapeWithHttp(url);
    if (rows.length === 0) {
      console.log(JSON.stringify({ rows: [], scrape_status: 'empty' }));
      return;
    }
    console.log(JSON.stringify({ rows, mode, scrape_status: 'ok' }));
  } catch (error) {
    console.error(JSON.stringify({ error: String(error), scrape_status: 'error' }));
    process.exit(1);
  }
}

main();
