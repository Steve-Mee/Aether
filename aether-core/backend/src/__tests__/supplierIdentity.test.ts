import crypto from 'crypto';

function productSku(url: string, name: string, price: number): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${url}|${name}|${price}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
  return `H-${hash}`;
}

describe('supplier identity (hash-based SKU)', () => {
  it('produces stable H-prefixed SKU from url+name+price', () => {
    const sku = productSku('https://supplier.example/catalog', 'Widget Pro', 29.99);
    expect(sku).toMatch(/^H-[A-F0-9]{16}$/);
    expect(productSku('https://supplier.example/catalog', 'Widget Pro', 29.99)).toBe(sku);
  });

  it('differs when price changes', () => {
    const a = productSku('https://supplier.example/catalog', 'Widget Pro', 29.99);
    const b = productSku('https://supplier.example/catalog', 'Widget Pro', 31.99);
    expect(a).not.toBe(b);
  });

  it('does not use synthetic SKU- prefix', () => {
    const sku = productSku('https://supplier.example/catalog', 'Widget Pro', 29.99);
    expect(sku.startsWith('SKU-')).toBe(false);
  });
});
