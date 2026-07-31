import { Link, useNavigate } from 'react-router-dom';
import { Button, EmptyState, ModuleListPageSkeleton } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { t } from '@/lib/i18n';
import { approvalDetail, moduleLinks } from '@/lib/navigation/moduleLinks';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { useWebsitePublish } from '@/features/website';

export default function WebsitePublishPage() {
  const navigate = useNavigate();
  const { project, isEmpty, revisionId, qaReport, qaScore, loading, error, reload, propose } =
    useWebsitePublish({
      onSuccess: (result) => {
        void navigate(approvalDetail(result.approval.id));
      },
    });

  return (
    <ModulePageLayout
      title={t('nav.websitePublish')}
      subtitle={t('website.publish.subtitle')}
      featureKey="storefront-builder"
      testId="website-publish-page"
      loading={loading}
      error={error}
      onRetry={reload}
      skeleton={<ModuleListPageSkeleton />}
    >
      {isEmpty || !project || !revisionId ? (
        <EmptyState
          variant="premium"
          title={t('website.publish.needProjectTitle')}
          description={t('website.publish.needProjectDescription')}
          action={
            <Button asChild>
              <Link to={moduleLinks.website} aria-label={t('nav.website')}>
                {t('nav.website')}
              </Link>
            </Button>
          }
        />
      ) : (
        <div
          className="space-y-6 max-w-2xl"
          data-testid="website-publish-panel"
          aria-labelledby="website-publish-heading"
        >
          <h2 id="website-publish-heading" className="sr-only">
            {t('nav.websitePublish')}
          </h2>
          <section
            className="rounded-aether border border-border/40 bg-card p-6 space-y-3"
            aria-labelledby="website-publish-diff-title"
          >
            <h3 id="website-publish-diff-title" className="text-base font-semibold">
              {t('website.publish.diffTitle')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('website.publish.diffBody')
                .replace(
                  '{live}',
                  project.liveRevisionId?.slice(0, 10) ?? t('website.publish.none'),
                )
                .replace('{next}', revisionId.slice(0, 10))}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('website.publish.project')}: {project.slug} · {project.status}
            </p>
          </section>

          <section
            className="rounded-aether border border-border/40 bg-card p-6 space-y-3"
            aria-labelledby="website-publish-qa-title"
          >
            <h3 id="website-publish-qa-title" className="text-base font-semibold">
              {t('website.publish.qaTitle')}
            </h3>
            <p
              className="text-sm text-muted-foreground"
              data-testid="website-publish-qa-score"
              role="status"
              aria-live="polite"
            >
              {t('website.publish.qaScore')}:{' '}
              {qaScore != null ? qaScore.toFixed(2) : t('website.publish.qaUnavailable')}
            </p>
            {qaReport?.warnings?.length ? (
              <ul
                className="list-disc pl-5 text-sm text-muted-foreground space-y-1"
                aria-label={t('website.publish.qaTitle')}
              >
                {qaReport.warnings.slice(0, 5).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            {qaReport?.errors?.length ? (
              <ul
                className="list-disc pl-5 text-sm text-destructive space-y-1"
                role="alert"
                aria-live="assertive"
              >
                {qaReport.errors.slice(0, 5).map((errMsg) => (
                  <li key={errMsg}>{errMsg}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="flex flex-wrap items-center gap-3" role="group" aria-label={t('nav.websitePublish')}>
            <Button
              data-testid="website-publish-request"
              disabled={propose.isPending}
              onClick={() => propose.mutate()}
              aria-busy={propose.isPending}
            >
              {propose.isPending
                ? t('website.publish.requesting')
                : t('website.publish.requestApproval')}
            </Button>
            <Button asChild variant="secondary">
              <Link to={moduleLinks.approvals} data-testid="website-publish-approvals-link">
                {t('website.publish.viewApprovals')}
              </Link>
            </Button>
          </div>
          {propose.isError ? (
            <p
              className="text-sm text-destructive"
              data-testid="website-publish-error"
              role="alert"
            >
              {aetherErrorMessage(propose.error)}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground" id="website-publish-hint">
            {t('website.publish.approvalHint')}
          </p>
        </div>
      )}
    </ModulePageLayout>
  );
}
