import { Link } from 'react-router-dom';
import { Button, EmptyState, ModuleListPageSkeleton, TextField } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { t } from '@/lib/i18n';
import { moduleLinks } from '@/lib/navigation/moduleLinks';
import { useWebsiteBrief } from '@/features/website';

export default function WebsiteBriefPage() {
  const { project, isEmpty, draft, setDraft, loading, error, reload, save } = useWebsiteBrief();

  return (
    <ModulePageLayout
      title={t('nav.websiteBrief')}
      subtitle={t('website.brief.subtitle')}
      featureKey="storefront-builder"
      testId="website-brief-page"
      loading={loading}
      error={error}
      onRetry={reload}
      skeleton={<ModuleListPageSkeleton />}
    >
      {isEmpty || !project ? (
        <EmptyState
          variant="premium"
          title={t('website.brief.needProjectTitle')}
          description={t('website.brief.needProjectDescription')}
          action={
            <Button asChild variant="primary">
              <Link to={moduleLinks.website}>{t('nav.website')}</Link>
            </Button>
          }
        />
      ) : (
        <form
          className="space-y-4 max-w-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field
            label={t('website.brief.prompt')}
            value={String(draft.prompt ?? '')}
            onChange={(v) => setDraft((d) => ({ ...d, prompt: v }))}
            multiline
          />
          <Field
            label={t('website.brief.tone')}
            value={String(draft.tone ?? '')}
            onChange={(v) => setDraft((d) => ({ ...d, tone: v }))}
          />
          <Field
            label={t('website.brief.audience')}
            value={String(draft.audience ?? '')}
            onChange={(v) => setDraft((d) => ({ ...d, audience: v }))}
          />
          <Field
            label={t('website.brief.locales')}
            value={(draft.locales ?? []).join(', ')}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                locales: v
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
          />
          <Field
            label={t('website.brief.brandName')}
            value={String(draft.brand?.name ?? '')}
            onChange={(v) => setDraft((d) => ({ ...d, brand: { ...d.brand, name: v } }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('website.brief.primaryColor')}
              value={String(draft.brand?.primaryColor ?? '')}
              onChange={(v) => setDraft((d) => ({ ...d, brand: { ...d.brand, primaryColor: v } }))}
            />
            <Field
              label={t('website.brief.accentColor')}
              value={String(draft.brand?.accentColor ?? '')}
              onChange={(v) => setDraft((d) => ({ ...d, brand: { ...d.brand, accentColor: v } }))}
            />
          </div>
          <Field
            label={t('website.brief.mustHavePages')}
            value={(draft.mustHavePages ?? []).join(', ')}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                mustHavePages: v
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
          />
          <Button type="submit" disabled={save.isPending} data-testid="website-brief-save">
            {save.isPending ? t('website.brief.saving') : t('website.brief.save')}
          </Button>
        </form>
      )}
    </ModulePageLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {multiline ? (
        <textarea
          className="w-full min-h-[120px] rounded-xl border border-border/40 bg-card/50 px-3 py-2.5 text-sm text-foreground placeholder:text-caption-accessible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <TextField value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
