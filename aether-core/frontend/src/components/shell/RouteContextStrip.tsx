import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { StatChip } from '@/components/ui/page-header';
import { useRouteContext } from '@/lib/RouteContext';
import { t } from '@/lib/i18n';
import { moduleLinks } from '@/lib/navigation/moduleLinks';
import { cn, focusRing } from '@/lib/utils';

interface RouteContextStripProps {
  children?: React.ReactNode;
}

function ContextLink({
  to,
  label,
  state,
}: {
  to: string;
  label: string;
  state?: Record<string, unknown>;
}) {
  return (
    <Link
      to={to}
      state={state}
      className={cn(
        'inline-flex items-center h-8 px-3 rounded-lg text-meta',
        'text-muted-foreground hover:text-foreground hover:bg-muted/25 transition-colors duration-fast',
        focusRing(),
      )}
    >
      {label}
    </Link>
  );
}

export default function RouteContextStrip({ children }: RouteContextStripProps) {
  const { module } = useRouteContext();

  if (module === 'command-center' || module === 'settings') {
    return children ? <div className="mb-6">{children}</div> : null;
  }

  const chips: React.ReactNode[] = [];

  if (module === 'approvals') {
    chips.push(
      <ContextLink
        key="workstream"
        to={moduleLinks.workstream}
        label={t('routeContext.workstream')}
      />,
      <ContextLink key="insights" to={moduleLinks.insights} label={t('nav.insights')} />,
      <ContextLink key="activity" to={moduleLinks.activity} label={t('nav.timeline')} />,
    );
  }
  if (module === 'insights') {
    chips.push(
      <ContextLink key="approvals" to={moduleLinks.approvals} label={t('nav.approvals')} />,
      <ContextLink key="activity" to={moduleLinks.activity} label={t('nav.timeline')} />,
    );
  }
  if (module === 'timeline') {
    chips.push(
      <ContextLink key="approvals" to={moduleLinks.approvals} label={t('nav.approvals')} />,
      <ContextLink key="insights" to={moduleLinks.insights} label={t('nav.insights')} />,
    );
  }
  if (module === 'suppliers') {
    chips.push(
      <ContextLink
        key="approvals"
        to={moduleLinks.approvals}
        label={t('suppliers.link.approvals')}
      />,
      <StatChip key="suppliers-hint">{t('routeContext.suppliersHint')}</StatChip>,
    );
  }
  if (module === 'workstream') {
    chips.push(
      <ContextLink key="approvals" to={moduleLinks.approvals} label={t('nav.approvals')} />,
      <StatChip key="workstream-hint">{t('routeContext.workstreamHint')}</StatChip>,
    );
  }
  if (module === 'emails') {
    chips.push(
      <ContextLink key="approvals" to={moduleLinks.approvals} label={t('nav.approvals')} />,
      <StatChip key="emails-hint">{t('routeContext.emailsHint')}</StatChip>,
    );
  }
  if (module === 'orders') {
    chips.push(<StatChip key="orders-hint">{t('routeContext.ordersHint')}</StatChip>);
  }
  if (module === 'products') {
    chips.push(
      <ContextLink key="insights" to={moduleLinks.insights} label={t('nav.insights')} />,
      <StatChip key="products-hint">{t('routeContext.productsHint')}</StatChip>,
    );
  }
  if (module === 'autonomous') {
    chips.push(
      <ContextLink key="activity" to={moduleLinks.activity} label={t('nav.timeline')} />,
      <StatChip key="autonomous-hint">{t('routeContext.autonomousHint')}</StatChip>,
    );
  }
  if (module === 'outcomes') {
    chips.push(<StatChip key="outcomes-hint">{t('routeContext.outcomesHint')}</StatChip>);
  }
  if (module === 'negotiations') {
    chips.push(<StatChip key="negotiations-hint">{t('routeContext.negotiationsHint')}</StatChip>);
  }
  if (module === 'website') {
    chips.push(
      <ContextLink key="website" to={moduleLinks.website} label={t('nav.website')} />,
      <ContextLink
        key="website-preview"
        to={moduleLinks.websitePreview}
        label={t('nav.websitePreview')}
      />,
      <ContextLink key="website-pages" to={moduleLinks.websitePages} label={t('nav.websitePages')} />,
      <ContextLink key="pages-cms" to={moduleLinks.pages} label={t('nav.pages')} />,
      <ContextLink
        key="website-publish"
        to={moduleLinks.websitePublish}
        label={t('nav.websitePublish')}
      />,
      <ContextLink key="approvals" to={moduleLinks.approvals} label={t('nav.approvals')} />,
      <StatChip key="website-hint">{t('routeContext.websiteHint')}</StatChip>,
    );
  }
  if (module === 'other') {
    chips.push(
      <ContextLink
        key="workstream"
        to={moduleLinks.workstream}
        label={t('routeContext.workstream')}
      />,
    );
  }

  if (chips.length === 0 && !children) return null;

  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border/35 bg-card/30 px-4 py-3"
      data-testid="route-context-strip"
    >
      {chips}
      {children}
    </div>
  );
}
