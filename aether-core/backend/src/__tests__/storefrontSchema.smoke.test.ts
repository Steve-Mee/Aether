import * as fs from 'fs';
import * as path from 'path';

/**
 * P01 schema smoke: migration folder + tenant unique constraints for SiteProject/Category.
 * No DB required — filesystem + schema.prisma parse only.
 */
describe('Storefront builder Prisma schema (P01)', () => {
  const prismaRoot = path.resolve(__dirname, '../../prisma');
  const schemaPath = path.join(prismaRoot, 'schema.prisma');
  const migrationsRoot = path.join(prismaRoot, 'migrations');

  const schema = fs.readFileSync(schemaPath, 'utf8');

  function modelBlock(name: string): string {
    const re = new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`);
    const match = schema.match(re);
    if (!match) throw new Error(`model ${name} not found in schema.prisma`);
    return match[0];
  }

  it('migration folder *_storefront_builder exists with migration.sql', () => {
    const folders = fs
      .readdirSync(migrationsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.endsWith('_storefront_builder'))
      .map((d) => d.name);
    expect(folders.length).toBeGreaterThanOrEqual(1);
    const sqlPath = path.join(migrationsRoot, folders[0], 'migration.sql');
    expect(fs.existsSync(sqlPath)).toBe(true);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    expect(sql).toContain('SiteProject');
    expect(sql).toContain('MediaAsset');
    expect(sql).toContain('ProductMedia');
  });

  it('defines Site* and commerce gap models', () => {
    const required = [
      'SiteProject',
      'SiteRevision',
      'SitePage',
      'SiteAsset',
      'BuildJob',
      'DeployTarget',
      'Category',
      'MediaAsset',
      'ProductMedia',
      'Cart',
      'CartItem',
      'Promotion',
      'Shipment',
      'Refund',
    ];
    for (const name of required) {
      expect(schema).toContain(`model ${name} {`);
    }
  });

  it('enforces @@unique([tenantId, slug]) on SiteProject and Category', () => {
    expect(modelBlock('SiteProject')).toMatch(/@@unique\(\[tenantId,\s*slug\]\)/);
    expect(modelBlock('Category')).toMatch(/@@unique\(\[tenantId,\s*slug\]\)/);
  });

  it('Product uses MediaAsset join (not inline images Json)', () => {
    const product = modelBlock('Product');
    expect(product).toContain('seoTitle');
    expect(product).toContain('seoDescription');
    expect(product).toContain('categoryId');
    expect(product).not.toMatch(/\bimages\s+Json/);
    expect(schema).toContain('model ProductMedia {');
    expect(schema).toContain('model MediaAsset {');
  });

  it('rejects missing tenant slug unique (security/tenancy regression)', () => {
    // Failure case: if someone drops tenant unique, smoke fails.
    const siteProject = modelBlock('SiteProject');
    expect(siteProject).not.toMatch(/@@unique\(\[slug\]\)\s*$/m);
    expect(siteProject).toContain('tenantId');
  });

  it('seed creates ≥1 ProductMedia for Birth catalog (kom-aarde)', () => {
    const seedPath = path.join(prismaRoot, 'seed.ts');
    const seed = fs.readFileSync(seedPath, 'utf8');
    expect(seed).toContain("slug: 'kom-aarde'");
    expect(seed).toMatch(/productMedia\.upsert/);
    expect(seed).toContain('placehold.co');
    // Failure/security: seed must not reintroduce Product.images Json blob.
    expect(seed).not.toMatch(/images:\s*\[/);
  });
});
