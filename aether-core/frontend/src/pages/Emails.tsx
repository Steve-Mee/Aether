import { Mail, HelpCircle } from 'lucide-react';
import React from 'react';
import {
  AsyncBoundary,
  Button,
  Card,
  EmptyState,
  ModuleListPageSkeleton,
  Skeleton,
  RiskBadge,
} from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import AgentExplainabilitySheet from '@/components/explainability/AgentExplainabilitySheet';
import { cn, interactiveSurface } from '@/lib/utils';
import { formatDate, t } from '../lib/i18n';
import type { RiskBand } from '../lib/intentNavigation';
import { useEmailsPage } from '@/hooks/useEmailsPage';

function mapRisk(level: string | null): RiskBand {
  if (level === 'high') return 'high';
  if (level === 'low') return 'low';
  return 'medium';
}

function EmailDetailSkeleton() {
  return (
    <div className="p-6 space-y-4" aria-busy="true">
      <Skeleton className="h-6 w-3/4" variant="text" />
      <Skeleton className="h-4 w-1/2" variant="text" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export default function Emails() {
  const page = useEmailsPage();

  return (
    <ModulePageLayout
      title={t('emails.title')}
      subtitle={t('emails.subtitle')}
      featureKey="aether-mail"
      testId="emails-page"
      loading={page.loading}
      error={page.error}
      onRetry={page.reload}
      skeleton={<ModuleListPageSkeleton />}
    >
      <div className="flex flex-col lg:flex-row gap-6 min-h-[60vh]">
        <div className="flex-1 min-w-0">
          {!page.emails || page.emails.length === 0 ? (
            <EmptyState
              variant="premium"
              title={t('emails.empty.title')}
              description={t('emails.empty.description')}
              icon={<Mail size={32} />}
            />
          ) : (
            <div className="space-y-2">
              {page.emails.map((email) => (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => page.setSelectedId(email.id)}
                  className={cn(
                    interactiveSurface(
                      'w-full text-left p-4 rounded-xl border bg-card/50 hover:border-border/60',
                    ),
                    page.selectedId === email.id ? 'border-primary/30 bg-card' : 'border-border/40',
                  )}
                >
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-body font-medium truncate">
                        {email.subject ?? t('emails.noSubject')}
                      </p>
                      <p className="text-meta text-muted-foreground truncate">{email.from}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <RiskBadge band={mapRisk(email.riskLevel)} />
                      <p className="text-caption text-muted-foreground mt-1">{email.status}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside
          aria-label={t('emails.detailLabel')}
          className="w-full lg:w-96 shrink-0 border border-border/40 rounded-xl bg-card/30 overflow-hidden"
        >
          {!page.selectedId ? (
            <p className="p-8 text-meta text-muted-foreground">{t('emails.selectPrompt')}</p>
          ) : (
            <AsyncBoundary
              loading={page.detailLoading}
              error={page.detailError}
              onRetry={page.reloadDetail}
              skeleton={<EmailDetailSkeleton />}
            >
              {page.detail && (
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-title font-medium">
                      {page.detail.subject ?? t('emails.noSubject')}
                    </p>
                    <p className="text-meta text-muted-foreground">{page.detail.from}</p>
                    <p className="text-caption text-muted-foreground mt-2">
                      {formatDate(page.detail.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <RiskBadge band={mapRisk(page.detail.riskLevel)} />
                    {page.detail.category && (
                      <span className="text-caption px-2 py-1 rounded-lg bg-muted/30 text-muted-foreground">
                        {page.detail.category}
                      </span>
                    )}
                  </div>

                  {page.detail.body && (
                    <Card
                      padding="sm"
                      className="text-body text-muted-foreground whitespace-pre-wrap max-h-40 overflow-auto"
                    >
                      {page.detail.body}
                    </Card>
                  )}

                  {page.detail.draftReply && (
                    <div>
                      <p className="text-meta uppercase tracking-wide text-muted-foreground mb-2">
                        {t('emails.draftLabel')}
                      </p>
                      <Card padding="sm" className="text-body text-success/90 whitespace-pre-wrap">
                        {page.detail.draftReply}
                      </Card>
                    </div>
                  )}

                  <Button variant="ghost" size="sm" onClick={() => page.setExplainOpen(true)}>
                    <HelpCircle size={14} className="inline mr-1" />
                    {t('approval.explain')}
                  </Button>
                </div>
              )}
            </AsyncBoundary>
          )}
        </aside>

        {page.selectedId && (
          <AgentExplainabilitySheet
            entityType="email"
            entityId={page.selectedId}
            open={page.explainOpen}
            onClose={() => page.setExplainOpen(false)}
          />
        )}
      </div>
    </ModulePageLayout>
  );
}
