import type { VectorStorePort } from '../VectorStorePort';
import type { VectorDocument, VectorMatch, VectorQuery } from '../types';
import { VECTOR_DIMENSION } from '../types';

type LanceRow = {
  id: string;
  tenantId: string;
  content: string;
  metadata: string;
  vector: number[];
};

/**
 * Portable JSON-file vector store for self-hosted tier v1.
 * Not native @lancedb/lancedb — see intelligence-layer.md.
 */
export class JsonFileVectorStoreAdapter implements VectorStorePort {
  private rows: LanceRow[] = [];
  private loaded = false;
  private dbPath: string;

  constructor(dbPath = process.env.LANCE_DB_PATH ?? './data/brain-lance') {
    this.dbPath = dbPath;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const fs = await import('fs/promises');
      const raw = await fs.readFile(`${this.dbPath}/brain.json`, 'utf8');
      this.rows = JSON.parse(raw) as LanceRow[];
    } catch {
      this.rows = [];
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    await fs.mkdir(path.dirname(`${this.dbPath}/brain.json`), { recursive: true });
    await fs.writeFile(`${this.dbPath}/brain.json`, JSON.stringify(this.rows));
  }

  private cosine(a: number[], b: number[]): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
  }

  async upsert(tenantId: string, doc: VectorDocument): Promise<void> {
    await this.ensureLoaded();
    if (!doc.embedding?.length) throw new Error('embedding required');
    const idx = this.rows.findIndex((r) => r.id === doc.id && r.tenantId === tenantId);
    const row: LanceRow = {
      id: doc.id,
      tenantId,
      content: doc.content,
      metadata: JSON.stringify(doc.metadata ?? {}),
      vector: doc.embedding,
    };
    if (idx >= 0) this.rows[idx] = row;
    else this.rows.push(row);
    await this.persist();
  }

  async search(tenantId: string, query: VectorQuery): Promise<VectorMatch[]> {
    await this.ensureLoaded();
    const limit = query.limit ?? 5;
    const matches = this.rows
      .filter((r) => r.tenantId === tenantId && r.vector.length === VECTOR_DIMENSION)
      .map((r) => ({
        id: r.id,
        content: r.content,
        score: this.cosine(query.embedding, r.vector),
        metadata: JSON.parse(r.metadata) as Record<string, unknown>,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return matches;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.ensureLoaded();
    this.rows = this.rows.filter((r) => !(r.tenantId === tenantId && r.id === id));
    await this.persist();
  }

  /** Test helper */
  clear(): void {
    this.rows = [];
    this.loaded = true;
  }
}
