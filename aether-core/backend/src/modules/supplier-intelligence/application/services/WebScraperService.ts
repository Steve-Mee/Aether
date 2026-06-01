import { spawn } from 'child_process';
import path from 'path';
import axios from 'axios';
import { SupplierProduct } from '../../domain/entities/SupplierProduct';
import { logger } from '../../../../shared/logging/logger';
import { eventBus } from '../../../../shared/events/eventBus';

interface ScrapedRow {
  name: string;
  sku: string;
  price: number;
  stock: number | null;
}

interface WorkerOutput {
  rows: ScrapedRow[];
  scrape_status?: 'ok' | 'empty' | 'blocked' | 'error';
  reason?: string;
}

export class WebScraperService {
  private readonly allowedDomains = (process.env.SUPPLIER_ALLOWLIST ?? '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);

  async scrape(websiteUrl: string, ctx?: { tenantId?: string }): Promise<SupplierProduct[]> {
    const url = new URL(websiteUrl);
    if (process.env.NODE_ENV === 'production' && this.allowedDomains.length === 0) {
      throw new Error('SUPPLIER_ALLOWLIST is required in production');
    }
    if (this.allowedDomains.length > 0 && !this.allowedDomains.includes(url.hostname)) {
      throw new Error(`Domain ${url.hostname} not in SUPPLIER_ALLOWLIST`);
    }

    logger.info('supplier_scrape_start', { url: websiteUrl, mode: process.env.SUPPLIER_SCRAPER ?? 'http' });

    const result = await this.scrapeViaWorker(websiteUrl);

    if (result.scrape_status === 'empty' || result.scrape_status === 'blocked') {
      if (ctx?.tenantId) {
        await eventBus.publish({
          tenantId: ctx.tenantId,
          type: 'supplier.sync_completed',
          payload: { url: websiteUrl, scrape_status: result.scrape_status, reason: result.reason },
        });
      }
      return [];
    }

    return (result.rows ?? []).map(
      (row, i) =>
        new SupplierProduct(
          `scraped-${i}`,
          '',
          row.name,
          row.sku,
          row.price,
          'EUR',
          row.stock ?? 0,
          new Date()
        )
    );
  }

  private async scrapeViaWorker(websiteUrl: string): Promise<WorkerOutput> {
    const workerUrl = process.env.SUPPLIER_WORKER_URL;
    if (workerUrl) {
      return this.scrapeViaHttpWorker(websiteUrl, workerUrl);
    }
    return this.scrapeViaLocalWorker(websiteUrl);
  }

  private async scrapeViaHttpWorker(websiteUrl: string, baseUrl: string): Promise<WorkerOutput> {
    const res = await axios.post(`${baseUrl.replace(/\/$/, '')}/scrape`, { url: websiteUrl }, {
      timeout: parseInt(process.env.SUPPLIER_WORKER_TIMEOUT_MS ?? '120000', 10),
    });
    return res.data as WorkerOutput;
  }

  private scrapeViaLocalWorker(websiteUrl: string): Promise<WorkerOutput> {
    const timeoutMs = parseInt(process.env.SUPPLIER_WORKER_TIMEOUT_MS ?? '120000', 10);

    return new Promise((resolve, reject) => {
      const workerPath = path.resolve(process.cwd(), '../scripts/supplier-scrape-worker.mjs');
      const child = spawn(process.execPath, [workerPath, websiteUrl], {
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
      });

      let stdout = '';
      let stderr = '';
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          child.kill('SIGTERM');
        } catch {
          /* ignore */
        }
        reject(new Error(`Scrape worker timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (code !== 0) {
          try {
            const err = JSON.parse(stderr.trim());
            reject(new Error(err.error || 'Scrape worker failed'));
          } catch {
            reject(new Error(stderr || 'Scrape worker failed'));
          }
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim()) as WorkerOutput;
          resolve(parsed);
        } catch {
          reject(new Error('Invalid worker output'));
        }
      });
    });
  }
}
