import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, TextField } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { commerceApi } from '@/features/commerce';
import { t } from '@/lib/i18n';
import { queryKeys } from '@/lib/query/keys';

export default function ProductNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('0');
  const [stock, setStock] = useState('0');
  const [description, setDescription] = useState('');

  const create = useMutation({
    mutationFn: () =>
      commerceApi.createProduct({
        name: name.trim(),
        slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-'),
        description: description.trim() || undefined,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
      }),
    onSuccess: (product) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      void navigate(`/products/${product.id}`);
    },
  });

  return (
    <ModulePageLayout
      title={t('nav.productNew')}
      subtitle={t('products.new.subtitle')}
      featureKey="product-catalog"
      testId="product-new-page"
      loading={false}
      error={null}
    >
      <form
        className="max-w-xl space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <label className="block space-y-1 text-sm">
          <span>{t('products.col.name')}</span>
          <TextField
            data-testid="product-new-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Slug</span>
          <TextField
            data-testid="product-new-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="kom-aarde"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t('products.col.price')}</span>
          <TextField
            data-testid="product-new-price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t('products.col.stock')}</span>
          <TextField
            data-testid="product-new-stock"
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t('products.detail.description')}</span>
          <TextField
            data-testid="product-new-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <Button
          type="submit"
          data-testid="product-new-submit"
          disabled={create.isPending || !name.trim()}
        >
          {create.isPending ? t('products.new.pending') : t('products.new.submit')}
        </Button>
        {create.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {t('products.new.error')}
          </p>
        ) : null}
      </form>
    </ModulePageLayout>
  );
}
