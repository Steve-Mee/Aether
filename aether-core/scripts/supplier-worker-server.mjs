#!/usr/bin/env node
/**
 * HTTP wrapper for supplier-scrape-worker.mjs — isolated Docker service.
 * POST /scrape { "url": "https://..." } → worker JSON output
 */
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.SUPPLIER_WORKER_PORT ?? '9090', 10);
const TIMEOUT_MS = parseInt(process.env.SUPPLIER_WORKER_TIMEOUT_MS ?? '120000', 10);

function scrapeUrl(url) {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'supplier-scrape-worker.mjs');
    const child = spawn(process.execPath, [workerPath, url], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Worker timeout after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);
    child.stdout.on('data', (c) => { stdout += c.toString(); });
    child.stderr.on('data', (c) => { stderr += c.toString(); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr || 'Worker failed'));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error('Invalid worker output'));
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  if (req.method !== 'POST' || req.url !== '/scrape') {
    res.writeHead(404);
    res.end();
    return;
  }
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    try {
      const { url } = JSON.parse(body);
      if (!url) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'url required' }));
        return;
      }
      const result = await scrapeUrl(url);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Scrape failed' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(JSON.stringify({ type: 'supplier_worker_started', port: PORT }));
});
