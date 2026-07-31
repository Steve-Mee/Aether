import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Globe } from 'lucide-react';
import { Button, EmptyState, ModuleListPageSkeleton, TextField } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { t } from '@/lib/i18n';
import { moduleLinks } from '@/lib/navigation/moduleLinks';
import { COMMAND_CENTER_PATH } from '@/lib/navigation/routes';
import { cn, interactiveSurface } from '@/lib/utils';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { useActiveWebsiteProject, useCreateWebsiteProject } from '@/features/website';

export default function WebsiteHubPage() {
  const navigate = useNavigate();
  const { project, isEmpty, loading, error, reload } = useActiveWebsiteProject();
  const [prompt, setPrompt] = useState('');
  const create = useCreateWebsiteProject({
    onSuccess: () => {
      void navigate(moduleLinks.websitePreview);
    },
  });

  return (
    <ModulePageLayout
      title={t('nav.website')}
      subtitle={t('website.hub.subtitle')}
      featureKey="storefront-builder"
      testId="website-hub-page"
      loading={loading}
      error={error}
      onRetry={reload}
      skeleton={<ModuleListPageSkeleton />}
      headerExtra={
        project ? (
          <Button variant="secondary" onClick={() => void navigate(moduleLinks.websiteBrief)}>
            {t('website.hub.newVersion')}
          </Button>
        ) : null
      }
    >
      {isEmpty || !project ? (
        <div className="space-y-6" data-testid="website-empty-state">
          <EmptyState
            variant="premium"
            title={t('website.empty.title')}
            description={t('website.empty.description')}
            icon={<Globe size={32} />}
            actionLabel={t('website.empty.commandCenter')}
            onAction={() => void navigate(COMMAND_CENTER_PATH)}
          />
          <form
            className="max-w-xl mx-auto space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(prompt);
            }}
          >
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="website-brief-prompt"
            >
              {t('website.empty.promptLabel')}
            </label>
            <TextField
              id="website-brief-prompt"
              data-testid="website-create-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('website.empty.promptPlaceholder')}
              disabled={create.isPending}
            />
            <Button
              type="submit"
              data-testid="website-create-submit"
              disabled={create.isPending || !prompt.trim()}
            >
              {create.isPending ? t('website.create.pending') : t('website.create.submit')}
            </Button>
            {create.isError ? (
              <p
                className="text-sm text-destructive"
                data-testid="website-create-error"
                role="alert"
              >
                {aetherErrorMessage(create.error)}
              </p>
            ) : null}
          </form>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2" data-testid="website-hub-summary">
          <div className="rounded-aether border border-border/40 bg-card p-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{project.slug}</h2>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {project.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('website.hub.latestRevision')}: {project.latestRevisionId?.slice(0, 12) ?? '—'}
            </p>
            {project.latestQaScore != null && (
              <p className="text-sm text-muted-foreground">
                {t('website.hub.qaScore')}: {project.latestQaScore.toFixed(2)}
              </p>
            )}
            {project.latestPreviewUrl ? (
              <a
                href={project.latestPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {t('website.hub.openPreview')}
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>

          <div className="rounded-aether border border-border/40 bg-card p-6 space-y-2">
            <h2 className="text-base font-semibold">{t('website.hub.quickLinks')}</h2>
            {(
              [
                [moduleLinks.websiteBrief, t('nav.websiteBrief')],
                [moduleLinks.websitePreview, t('nav.websitePreview')],
                [moduleLinks.websitePages, t('nav.websitePages')],
                [moduleLinks.pages, t('nav.pages')],
                [moduleLinks.websitePublish, t('nav.websitePublish')],
              ] as const
            ).map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  interactiveSurface(),
                  'block rounded-lg px-3 py-2 text-sm border border-transparent hover:border-border/40',
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </ModulePageLayout>
  );
}
