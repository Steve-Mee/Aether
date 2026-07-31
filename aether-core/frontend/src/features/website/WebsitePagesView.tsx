import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, ModuleListPageSkeleton } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { t } from '@/lib/i18n';
import { moduleLinks } from '@/lib/navigation/moduleLinks';
import { cn, interactiveSurface } from '@/lib/utils';
import { websiteApi } from './api';
import { useWebsitePages } from './hooks/useWebsitePages';

export type WebsitePagesVariant = 'website' | 'cms';

/**
 * Shared page tree for `/website/pages` and CMS mirror `/pages`.
 * Pilot content-edit: allowlisted Hero headline/subheadline → new revision.
 */
export function WebsitePagesView({ variant }: { variant: WebsitePagesVariant }) {
  const { project, isEmpty, pages, loading, error, reload } = useWebsitePages();
  const isCms = variant === 'cms';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  async function saveCopy(pageId: string) {
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);
    try {
      const result = await websiteApi.updatePageCopy(pageId, {
        ...(headline.trim() ? { headline: headline.trim() } : {}),
        ...(subheadline.trim() ? { subheadline: subheadline.trim() } : {}),
      });
      setSaveOk(
        t('website.pages.copySaved').replace('{version}', String(result.revision.version))
      );
      setEditingId(null);
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModulePageLayout
      title={isCms ? t('nav.pages') : t('nav.websitePages')}
      subtitle={isCms ? t('website.pages.cmsSubtitle') : t('website.pages.subtitle')}
      featureKey="storefront-builder"
      testId={isCms ? 'pages-cms-page' : 'website-pages-page'}
      loading={loading}
      error={error}
      onRetry={reload}
      skeleton={<ModuleListPageSkeleton />}
    >
      {isEmpty || !project ? (
        <EmptyState
          variant="premium"
          title={t('website.pages.needProjectTitle')}
          description={t('website.pages.needProjectDescription')}
          action={
            <Button asChild>
              <Link to={moduleLinks.website}>{t('nav.website')}</Link>
            </Button>
          }
        />
      ) : pages.length === 0 ? (
        <EmptyState
          variant="premium"
          title={t('website.pages.emptyTitle')}
          description={t('website.pages.emptyDescription')}
          action={
            <Button asChild variant="secondary">
              <Link to={moduleLinks.websitePreview}>{t('nav.websitePreview')}</Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-aether border border-border/40 bg-card overflow-hidden">
          <p className="px-6 py-3 text-xs text-muted-foreground border-b border-border/40">
            {t('website.pages.copyEditHint')}
          </p>
          {saveOk ? (
            <p className="px-6 py-2 text-xs text-foreground" data-testid="website-pages-copy-ok">
              {saveOk}
            </p>
          ) : null}
          {saveError ? (
            <p className="px-6 py-2 text-xs text-destructive" data-testid="website-pages-copy-error">
              {saveError}
            </p>
          ) : null}
          <ul className="divide-y divide-border/40" data-testid="website-pages-list">
            {pages.map((page) => (
              <li key={page.id} className="px-6 py-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <div className="font-medium text-foreground">{page.title}</div>
                    <div className="text-muted-foreground font-mono text-xs">{page.path}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingId(editingId === page.id ? null : page.id);
                        setHeadline('');
                        setSubheadline('');
                        setSaveError(null);
                      }}
                    >
                      {t('website.pages.editCopy')}
                    </Button>
                    <Link
                      to={moduleLinks.websitePreview}
                      className={cn(interactiveSurface(), 'text-xs text-muted-foreground')}
                    >
                      {t('nav.websitePreview')}
                    </Link>
                  </div>
                </div>
                {editingId === page.id ? (
                  <div
                    className="mt-3 grid gap-2 max-w-lg"
                    data-testid={`website-pages-copy-form-${page.id}`}
                  >
                    <label className="text-xs text-muted-foreground">
                      {t('website.pages.headline')}
                      <input
                        className="mt-1 w-full rounded-aether border border-border/40 bg-background px-3 py-2 text-sm"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder={t('website.pages.headlinePlaceholder')}
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      {t('website.pages.subheadline')}
                      <input
                        className="mt-1 w-full rounded-aether border border-border/40 bg-background px-3 py-2 text-sm"
                        value={subheadline}
                        onChange={(e) => setSubheadline(e.target.value)}
                        placeholder={t('website.pages.subheadlinePlaceholder')}
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={saving || (!headline.trim() && !subheadline.trim())}
                        onClick={() => void saveCopy(page.id)}
                      >
                        {t('website.pages.saveRevision')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={saving}
                        onClick={() => setEditingId(null)}
                      >
                        {t('website.pages.cancelEdit')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="px-6 py-3 text-xs text-muted-foreground border-t border-border/40">
            {t('website.pages.iterateHint')}
          </p>
        </div>
      )}
    </ModulePageLayout>
  );
}
