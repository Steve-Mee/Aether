import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, ModuleListPageSkeleton, TextField } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { commerceApi } from '@/features/commerce';
import { t } from '@/lib/i18n';
import { COMMAND_CENTER_PATH } from '@/lib/navigation/routes';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';

function formatWindow(startsAt?: string | null, endsAt?: string | null): string {
  if (!startsAt && !endsAt) return '—';
  const start = startsAt ? new Date(startsAt).toLocaleDateString() : '…';
  const end = endsAt ? new Date(endsAt).toLocaleDateString() : '…';
  return `${start} – ${end}`;
}

export default function PromotionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [value, setValue] = useState('10');
  const [showCreate, setShowCreate] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.promotions(),
    queryFn: () => commerceApi.listPromotions(),
  });

  const create = useMutation({
    mutationFn: () =>
      commerceApi.createPromotion({
        name: name.trim(),
        type: 'percent',
        value: Number(value) || 0,
      }),
    onSuccess: () => {
      setName('');
      setShowCreate(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.promotions() });
    },
  });

  const promotions = query.data ?? [];

  return (
    <ModulePageLayout
      title={t('nav.promotions')}
      subtitle={t('promotions.subtitle')}
      featureKey="promotions"
      testId="promotions-page"
      loading={query.isLoading}
      error={aetherErrorMessage(query.error)}
      onRetry={() => void query.refetch()}
      skeleton={<ModuleListPageSkeleton />}
      headerExtra={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowCreate((v) => !v)}>
            {t('promotions.createDraft')}
          </Button>
          <Button variant="secondary" onClick={() => void navigate(COMMAND_CENTER_PATH)}>
            {t('promotions.aiPropose')}
          </Button>
        </div>
      }
    >
      {showCreate ? (
        <div
          className="mb-4 p-4 rounded-aether border border-border/40 bg-muted/10 space-y-3"
          data-testid="promotions-create-form"
        >
          <label className="block space-y-1 text-sm">
            <span>{t('promotions.col.name')}</span>
            <TextField value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t('promotions.col.value')}</span>
            <TextField
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button
              disabled={!name.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {t('promotions.createSubmit')}
            </Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              {t('promotions.cancel')}
            </Button>
          </div>
          {create.isError ? (
            <p className="text-sm text-destructive">{aetherErrorMessage(create.error)}</p>
          ) : null}
        </div>
      ) : null}

      <div className="bg-card border border-border/40 rounded-aether overflow-x-auto">
        {promotions.length === 0 ? (
          <EmptyState
            variant="premium"
            title={t('promotions.empty')}
            description={t('promotions.emptyDesc')}
            actionLabel={t('promotions.empty.commandCenter')}
            onAction={() => void navigate(COMMAND_CENTER_PATH)}
          />
        ) : (
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs text-muted-foreground uppercase tracking-widest">
                <th className="px-8 py-5">{t('promotions.col.name')}</th>
                <th className="px-8 py-5">{t('promotions.col.type')}</th>
                <th className="px-8 py-5">{t('promotions.col.status')}</th>
                <th className="px-8 py-5">{t('promotions.col.window')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {promotions.map((promo) => (
                <tr key={promo.id}>
                  <td className="px-8 py-6 font-medium">{promo.name}</td>
                  <td className="px-8 py-6">
                    {promo.type} {promo.value}
                  </td>
                  <td className="px-8 py-6">{promo.status}</td>
                  <td className="px-8 py-6 text-muted-foreground">
                    {formatWindow(promo.startsAt, promo.endsAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ModulePageLayout>
  );
}
