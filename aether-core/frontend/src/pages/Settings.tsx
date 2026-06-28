import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import React from 'react';
import { AsyncBoundary, ErrorState, SettingsSectionNav } from '@/components/ui';
import { SettingsSectionSkeleton } from '@/components/ui/skeletons/SettingsSectionSkeleton';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { PageHeader } from '@/components/ui/page-header';
import { t } from '@/lib/i18n';
import AutonomyConfigPanel from '@/components/settings/AutonomyConfigPanel';
import ExplainabilitySection from '@/components/settings/ExplainabilitySection';
import ProactiveBehaviorSection from '@/components/settings/ProactiveBehaviorSection';
import GoalPursuitSection from '@/components/settings/GoalPursuitSection';
import NotificationsSection from '@/components/settings/NotificationsSection';
import ConnectedServicesSection from '@/components/settings/ConnectedServicesSection';
import GeneralPreferencesSection from '@/components/settings/GeneralPreferencesSection';
import OverviewLayoutSection from '@/components/settings/OverviewLayoutSection';
import DataPrivacySection from '@/components/settings/DataPrivacySection';
import GlobalKnowledgePanel from '@/components/settings/GlobalKnowledgePanel';
import MemoryPanel from '@/components/settings/MemoryPanel';
import ReflectionTimelinePanel from '@/components/settings/ReflectionTimelinePanel';
import ContributionHistoryPanel from '@/components/settings/ContributionHistoryPanel';
import FederatedDeploymentsPanel from '@/components/settings/FederatedDeploymentsPanel';
import BilateralExchangePanel from '@/components/settings/BilateralExchangePanel';
import { useCurrentUser } from '@/lib/auth/AuthProvider';
import { roleMeetsMin } from '@/lib/auth/permissions';

const SECTIONS = [
  { id: 'autonomy', labelKey: 'settings.section.autonomy' },
  { id: 'personalMemory', labelKey: 'settings.section.personalMemory' },
  { id: 'reflectionTimeline', labelKey: 'settings.section.reflectionTimeline' },
  { id: 'globalKnowledge', labelKey: 'settings.section.globalKnowledge' },
  { id: 'contributionHistory', labelKey: 'settings.section.contributionHistory' },
  { id: 'notifications', labelKey: 'settings.section.notifications' },
  { id: 'services', labelKey: 'settings.section.services' },
  { id: 'general', labelKey: 'settings.section.general' },
  { id: 'overview', labelKey: 'settings.section.overview' },
  { id: 'privacy', labelKey: 'settings.section.privacy' },
  { id: 'bilateralExchange', labelKey: 'settings.section.bilateralExchange' },
  { id: 'platform', labelKey: 'settings.section.platform', operatorOnly: true },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function SectionContent({ id }: { id: SectionId }) {
  switch (id) {
    case 'autonomy':
      return (
        <div className="space-y-6">
          <AutonomyConfigPanel />
          <ExplainabilitySection />
          <ProactiveBehaviorSection />
          <GoalPursuitSection />
        </div>
      );
    case 'personalMemory':
      return <MemoryPanel />;
    case 'reflectionTimeline':
      return <ReflectionTimelinePanel />;
    case 'globalKnowledge':
      return <GlobalKnowledgePanel />;
    case 'contributionHistory':
      return <ContributionHistoryPanel />;
    case 'notifications':
      return <NotificationsSection />;
    case 'services':
      return <ConnectedServicesSection />;
    case 'general':
      return <GeneralPreferencesSection />;
    case 'overview':
      return <OverviewLayoutSection />;
    case 'privacy':
      return <DataPrivacySection />;
    case 'bilateralExchange':
      return <BilateralExchangePanel />;
    case 'platform':
      return <FederatedDeploymentsPanel />;
  }
}

const SECTION_IDS = new Set<SectionId>(SECTIONS.map((s) => s.id));

function parseSectionId(value: string | null): SectionId {
  if (value && SECTION_IDS.has(value as SectionId)) return value as SectionId;
  return 'autonomy';
}

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useCurrentUser();
  const visibleSections = SECTIONS.filter(
    (s) =>
      !('operatorOnly' in s && s.operatorOnly) || roleMeetsMin(user?.role ?? 'viewer', 'operator'),
  );
  const [active, setActive] = useState<SectionId>(() =>
    parseSectionId(searchParams.get('section')),
  );
  const { loading, error, reload } = useMerchantSettings();

  useEffect(() => {
    const param = searchParams.get('section');
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    const fromHash = hash && SECTION_IDS.has(hash as SectionId) ? (hash as SectionId) : null;
    const next =
      fromHash ?? (param && SECTION_IDS.has(param as SectionId) ? (param as SectionId) : null);
    if (next && next !== active) {
      setActive(next);
    }
  }, [searchParams, active]);

  const selectSection = (id: SectionId) => {
    setActive(id);
    setSearchParams({ section: id }, { replace: true });
  };

  const navSections = visibleSections.map((s) => ({ id: s.id, label: t(s.labelKey) }));

  return (
    <div className="max-w-5xl space-y-6" data-testid="settings-page">
      <PageHeader
        title={t('nav.settings')}
        subtitle={t('settings.subtitle')}
        featureKey="frontend-admin"
      />

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-52 shrink-0">
          <div className="lg:sticky lg:top-0">
            <SettingsSectionNav
              sections={navSections}
              activeId={active}
              onSelect={(id) => selectSection(id as SectionId)}
            />
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          {error && !loading ? (
            <ErrorState message={error} onRetry={() => void reload()} />
          ) : (
            <AsyncBoundary loading={loading} error={null} skeleton={<SettingsSectionSkeleton />}>
              <SectionContent id={active} />
            </AsyncBoundary>
          )}
        </div>
      </div>
    </div>
  );
}
