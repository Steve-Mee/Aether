import express from 'express';
import request from 'supertest';
import productRouter from '../index';

const productA = {
  id: 'prod_a',
  name: 'Kom Aarde',
  description: 'Handmade',
  slug: 'kom-aarde',
  status: 'active',
  price: 42,
  stock: 12,
  seoTitle: null,
  seoDescription: null,
  categoryId: null,
  createdAt: new Date('2026-07-26T08:00:00.000Z'),
  updatedAt: new Date('2026-07-26T08:00:00.000Z'),
  variants: [],
  media: [],
};

const listProducts = { execute: jest.fn() };
const createProduct = { execute: jest.fn() };
const getProduct = { execute: jest.fn() };
const updateProduct = { execute: jest.fn() };
const deleteProduct = { execute: jest.fn() };
const listProductVariants = { execute: jest.fn() };
const createProductVariant = { execute: jest.fn() };
const updateProductVariant = { execute: jest.fn() };
const deleteProductVariant = { execute: jest.fn() };
const uploadProductMedia = { execute: jest.fn() };

jest.mock('../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: () => ({
    listProducts,
    createProduct,
    getProduct,
    updateProduct,
    deleteProduct,
    listProductVariants,
    createProductVariant,
    updateProductVariant,
    deleteProductVariant,
    uploadProductMedia,
  }),
}));

jest.mock('../../../shared/security/rbac', () => ({
  requireViewer: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.tenantId = (req.header('X-Test-Tenant') as string) || 'tenant_a';
    req.actorId = 'actor_1';
    next();
  },
  requireOperator: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.tenantId = (req.header('X-Test-Tenant') as string) || 'tenant_a';
    req.actorId = 'actor_1';
    next();
  },
}));

function createTestApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/products', productRouter);
  return app;
}

describe('Products HTTP (P11)', () => {
  const app = createTestApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /:id returns product for tenant', async () => {
    getProduct.execute.mockResolvedValue(productA);

    const res = await request(app).get('/api/products/prod_a').set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('prod_a');
    expect(getProduct.execute).toHaveBeenCalledWith('tenant_a', 'prod_a');
  });

  it('GET /:id returns 404 for missing product (tenant isolation)', async () => {
    getProduct.execute.mockResolvedValue(null);

    const res = await request(app).get('/api/products/prod_other').set('X-Test-Tenant', 'tenant_b');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    expect(getProduct.execute).toHaveBeenCalledWith('tenant_b', 'prod_other');
  });

  it('PATCH /:id updates product fields', async () => {
    updateProduct.execute.mockResolvedValue({ ...productA, name: 'Kom Aarde XL', price: 48 });

    const res = await request(app)
      .patch('/api/products/prod_a')
      .set('X-Test-Tenant', 'tenant_a')
      .send({ name: 'Kom Aarde XL', price: 48 });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Kom Aarde XL');
    expect(updateProduct.execute).toHaveBeenCalledWith('tenant_a', 'prod_a', {
      name: 'Kom Aarde XL',
      price: 48,
    });
  });

  it('DELETE /:id returns 204', async () => {
    deleteProduct.execute.mockResolvedValue(true);

    const res = await request(app).delete('/api/products/prod_a').set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(204);
  });

  it('POST /:id/variants creates a variant', async () => {
    createProductVariant.execute.mockResolvedValue({
      id: 'var_1',
      productId: 'prod_a',
      sku: 'KOM-S',
      price: 40,
      currency: 'EUR',
      stock: 5,
    });

    const res = await request(app)
      .post('/api/products/prod_a/variants')
      .set('X-Test-Tenant', 'tenant_a')
      .send({ sku: 'KOM-S', price: 40, stock: 5 });

    expect(res.status).toBe(201);
    expect(res.body.sku).toBe('KOM-S');
  });

  it('POST /:id/media uploads media payload', async () => {
    uploadProductMedia.execute.mockResolvedValue({
      ...productA,
      media: [
        {
          id: 'pm_1',
          mediaAssetId: 'ma_1',
          url: '/api/media/tenant_a/file.png',
          mimeType: 'image/png',
          alt: 'Hero',
          sortOrder: 0,
        },
      ],
    });

    const res = await request(app)
      .post('/api/products/prod_a/media')
      .set('X-Test-Tenant', 'tenant_a')
      .send({
        filename: 'hero.png',
        mimeType: 'image/png',
        contentBase64: Buffer.from('png-bytes').toString('base64'),
        alt: 'Hero',
      });

    expect(res.status).toBe(201);
    expect(res.body.product.media).toHaveLength(1);
    expect(uploadProductMedia.execute).toHaveBeenCalledWith(
      'tenant_a',
      'prod_a',
      expect.objectContaining({ filename: 'hero.png', mimeType: 'image/png' })
    );
  });
});
