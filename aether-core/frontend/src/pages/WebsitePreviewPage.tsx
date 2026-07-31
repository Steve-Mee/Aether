import { Link } from 'react-router-dom';
import { Button, EmptyState, ModuleListPageSkeleton, SegmentedControl, TextField } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { t } from '@/lib/i18n';
import { moduleLinks } from '@/lib/navigation/moduleLinks';
import { cn } from '@/lib/utils';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { useWebsitePreview } from '@/features/website';

export default function WebsitePreviewPage() {
  const {
    project,
    isEmpty,
    previewUrl,
    device,
    setDevice,
    iteratePrompt,
    setIteratePrompt,
    revisions,
    loading,
    error,
    reload,
    iterate,
    rebuild,
  } = useWebsitePreview();

  return (
    <ModulePageLayout
      title={t('nav.websitePreview')}
      subtitle={t('website.preview.subtitle')}
      featureKey="storefront-builder"
      testId="website-preview-page"
      maxWidth="6xl"
      loading={loading}
      error={error}
      onRetry={reload}
      skeleton={<ModuleListPageSkeleton />}
    >
      {isEmpty || !project ? (
        <EmptyState
          variant="premium"
          title={t('website.preview.needProjectTitle')}
          description={t('website.preview.needProjectDescription')}
          action={
            <Button asChild>
              <Link to={moduleLinks.website}>{t('nav.website')}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <SegmentedControl
              options={[
                { value: 'desktop' as const, label: t('website.preview.desktop') },
                { value: 'mobile' as const, label: t('website.preview.mobile') },
              ]}
              value={device}
              onChange={setDevice}
              data-testid="website-preview-device"
              aria-label={t('website.preview.subtitle')}
            />
            <div
              className={cn(
                'rounded-aether border border-border/40 bg-muted/20 overflow-hidden mx-auto',
                device === 'mobile' ? 'max-w-[390px] aspect-[9/16]' : 'w-full aspect-[16/10]',
              )}
            >
              {previewUrl ? (
                <iframe
                  title={t('website.preview.iframeTitle')}
                  src={previewUrl}
                  className="h-full w-full border-0 bg-background"
                  data-testid="website-preview-iframe"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              ) : (
                <div
                  className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground"
                  role="status"
                >
                  {t('website.preview.noUrl')}
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-aether border border-border/40 bg-card p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold mb-2">{t('website.preview.changelog')}</h2>
              {revisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('website.preview.noRevisions')}</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {revisions.slice(0, 8).map((rev) => (
                    <li key={rev.id} className="text-sm text-muted-foreground">
                      v{rev.version}
                      {rev.createdByAgent ? ` · ${rev.createdByAgent}` : ''}
                      {rev.qaScore != null ? ` · QA ${rev.qaScore.toFixed(2)}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                iterate.mutate(iteratePrompt);
              }}
            >
              <label className="text-sm font-medium" htmlFor="website-iterate-prompt">
                {t('website.preview.iterateLabel')}
              </label>
              <TextField
                id="website-iterate-prompt"
                data-testid="website-iterate-prompt"
                value={iteratePrompt}
                onChange={(e) => setIteratePrompt(e.target.value)}
                placeholder={t('website.preview.iteratePlaceholder')}
                disabled={iterate.isPending}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={iterate.isPending || !iteratePrompt.trim()}
                  data-testid="website-iterate-submit"
                >
                  {t('website.preview.iterate')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={rebuild.isPending}
                  onClick={() => rebuild.mutate()}
                >
                  {t('website.preview.rebuild')}
                </Button>
              </div>
              {iterate.isError ? (
                <p
                  className="text-sm text-destructive"
                  data-testid="website-iterate-error"
                  role="alert"
                >
                  {aetherErrorMessage(iterate.error)}
                </p>
              ) : null}
            </form>
          </aside>
        </div>
      )}
    </ModulePageLayout>
  );
}
