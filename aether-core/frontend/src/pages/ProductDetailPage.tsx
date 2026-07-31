import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, TextField } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { commerceApi } from '@/features/commerce';
import { formatCurrency, t } from '@/lib/i18n';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';
import { cn } from '@/lib/utils';

const TABS = ['general', 'variants', 'media', 'seo', 'stock', 'log'] as const;
type Tab = (typeof TABS)[number];

export default function ProductDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('general');
  const [sku, setSku] = useState('');
  const [variantPrice, setVariantPrice] = useState('0');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  const query = useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => commerceApi.getProduct(id),
    enabled: Boolean(id),
  });

  const product = query.data;

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setDescription(product.description ?? '');
    setSeoTitle(product.seoTitle ?? '');
    setSeoDescription(product.seoDescription ?? '');
    setPrice(String(product.price));
    setStock(String(product.stock));
  }, [product]);

  const save = useMutation({
    mutationFn: () =>
      commerceApi.updateProduct(id, {
        name,
        description,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.product(id) }),
  });

  const addVariant = useMutation({
    mutationFn: () =>
      commerceApi.createVariant(id, { sku, price: Number(variantPrice) || 0, stock: 0 }),
    onSuccess: () => {
      setSku('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.product(id) });
    },
  });

  const uploadMedia = useMutation({
    mutationFn: (input: { filename: string; mimeType: string; contentBase64: string }) =>
      commerceApi.uploadMedia(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.product(id) }),
  });

  function onMediaFileSelected(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      const contentBase64 = comma >= 0 ? result.slice(comma + 1) : result;
      if (!contentBase64) return;
      uploadMedia.mutate({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        contentBase64,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <ModulePageLayout
      title={product?.name ?? t('nav.productDetail')}
      subtitle={t('products.detail.subtitle')}
      featureKey="product-catalog"
      testId="product-detail-page"
      loading={query.isLoading}
      error={aetherErrorMessage(query.error)}
      onRetry={() => void query.refetch()}
      headerExtra={
        <Button
          data-testid="product-save"
          onClick={() => save.mutate()}
          disabled={save.isPending || !product}
        >
          {t('products.detail.save')}
        </Button>
      }
    >
      <div className="mb-4">
        <Link
          to="/products"
          className="text-sm text-muted-foreground hover:text-foreground"
          aria-label={t('nav.products')}
        >
          ← {t('nav.products')}
        </Link>
      </div>
      {!query.isLoading && !product && !query.error ? (
        <p className="text-sm text-muted-foreground" role="status" data-testid="product-empty">
          {t('products.detail.notFound') || 'Product not found.'}
        </p>
      ) : null}
      {product ? (
        <div className="space-y-6">
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label={t('products.detail.subtitle')}
            onKeyDown={(e) => {
              const currentIndex = TABS.indexOf(tab);
              if (currentIndex < 0) return;
              let nextIndex = currentIndex;
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                nextIndex = (currentIndex + 1) % TABS.length;
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
              } else if (e.key === 'Home') {
                e.preventDefault();
                nextIndex = 0;
              } else if (e.key === 'End') {
                e.preventDefault();
                nextIndex = TABS.length - 1;
              } else {
                return;
              }
              const next = TABS[nextIndex];
              setTab(next);
              document.getElementById(`product-tab-${next}`)?.focus();
            }}
          >
            {TABS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`product-tab-${key}`}
                aria-selected={tab === key}
                aria-controls={`product-tab-panel-${key}`}
                tabIndex={tab === key ? 0 : -1}
                data-testid={`product-tab-${key}`}
                onClick={() => setTab(key)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  tab === key
                    ? 'bg-muted/50 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/25',
                )}
              >
                {t(`products.tabs.${key}`)}
              </button>
            ))}
          </div>

          {tab === 'general' ? (
            <div
              className="grid gap-4 max-w-xl"
              role="tabpanel"
              id="product-tab-panel-general"
              aria-labelledby="product-tab-general"
              data-testid="product-tab-panel-general"
            >
              <label className="block space-y-1 text-sm" htmlFor="product-name">
                <span>{t('products.col.name')}</span>
                <TextField
                  id="product-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm" htmlFor="product-description">
                <span>{t('products.detail.description')}</span>
                <TextField
                  id="product-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm" htmlFor="product-price">
                <span>{t('products.col.price')}</span>
                <TextField
                  id="product-price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
              <p className="text-sm text-muted-foreground">
                {t('products.col.status')}: {product.status}
              </p>
            </div>
          ) : null}

          {tab === 'variants' ? (
            <div className="space-y-4" data-testid="product-tab-panel-variants">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-widest">
                    <th className="py-2">SKU</th>
                    <th className="py-2">{t('products.col.price')}</th>
                    <th className="py-2">{t('products.col.stock')}</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((v) => (
                    <tr key={v.id} className="border-t border-border/40">
                      <td className="py-3">{v.sku}</td>
                      <td className="py-3">{formatCurrency(v.price)}</td>
                      <td className="py-3">{v.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-wrap gap-2 items-end">
                <label className="block space-y-1 text-sm">
                  <span>SKU</span>
                  <TextField value={sku} onChange={(e) => setSku(e.target.value)} />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>{t('products.col.price')}</span>
                  <TextField
                    type="number"
                    value={variantPrice}
                    onChange={(e) => setVariantPrice(e.target.value)}
                  />
                </label>
                <Button
                  data-testid="product-add-variant"
                  disabled={!sku.trim() || addVariant.isPending}
                  onClick={() => addVariant.mutate()}
                >
                  {t('products.detail.addVariant')}
                </Button>
              </div>
            </div>
          ) : null}

          {tab === 'media' ? (
            <div data-testid="product-tab-panel-media" className="space-y-3">
              {product.media.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('products.detail.mediaEmpty')}</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-3">
                  {product.media.map((m) => (
                    <li key={m.id} className="border border-border/40 rounded-aether p-3 text-sm">
                      <div className="truncate">{m.url}</div>
                      <div className="text-muted-foreground">{m.mimeType}</div>
                    </li>
                  ))}
                </ul>
              )}
              <label className="inline-flex flex-col gap-2 text-sm">
                <span className="text-muted-foreground">
                  {uploadMedia.isPending
                    ? t('products.detail.uploading')
                    : t('products.detail.uploadMedia')}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  data-testid="product-media-upload"
                  disabled={uploadMedia.isPending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    onMediaFileSelected(file);
                    e.target.value = '';
                  }}
                />
              </label>
              {uploadMedia.isError ? (
                <p className="text-sm text-destructive" role="alert">
                  {aetherErrorMessage(uploadMedia.error)}
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === 'seo' ? (
            <div className="grid gap-4 max-w-xl" data-testid="product-tab-panel-seo">
              <label className="block space-y-1 text-sm">
                <span>{t('products.detail.seoTitle')}</span>
                <TextField value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t('products.detail.seoDescription')}</span>
                <TextField
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                />
              </label>
            </div>
          ) : null}

          {tab === 'stock' ? (
            <div className="max-w-xs space-y-3" data-testid="product-tab-panel-stock">
              <label className="block space-y-1 text-sm">
                <span>{t('products.col.stock')}</span>
                <TextField type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
              </label>
              <p className="text-sm text-muted-foreground">
                {t('products.detail.variantStock')}:{' '}
                {product.variants.reduce((sum, v) => sum + v.stock, 0)}
              </p>
            </div>
          ) : null}

          {tab === 'log' ? (
            <p className="text-sm text-muted-foreground" data-testid="product-tab-panel-log">
              {t('products.detail.logEmpty')}
            </p>
          ) : null}
        </div>
      ) : null}
    </ModulePageLayout>
  );
}
