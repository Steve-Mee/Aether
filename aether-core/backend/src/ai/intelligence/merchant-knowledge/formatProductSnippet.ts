import type { BrainProductRecord } from '../../../modules/admin-command-bar/application/ports/AdminDataPort';

/** Margin indicator derived from price — v1 heuristic for RAG context. */
function marginIndicator(price: number): string {
  if (price < 25) return 'low';
  if (price < 50) return 'moderate';
  return 'healthy';
}

/** Stable, searchable document format for product knowledge in the vector store. */
export function formatProductSnippet(product: BrainProductRecord): string {
  const margin = marginIndicator(product.price);
  return `[product] ${product.name} | price=${product.price.toFixed(2)} EUR | stock=${product.stock} | marginIndicator=${margin} | slug=${product.slug}`;
}
