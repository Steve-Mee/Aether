import { DEMO_SUPPLIER_IDS } from '@/lib/suppliersPageDemo';
import { createLiveActivityItem } from '@/lib/activityPageDemo';
import {
  dispatchActivityItem,
  dispatchInsightAppeared,
  dispatchNavigate,
  dispatchNotification,
  dispatchSupplierChange,
} from '@/lib/aetherLiveBus';
import { notifyApprovalsChanged } from '@/lib/approvalsCommandCenterSync';
import { showCalmToast } from '@/lib/toast';
import { t } from '@/lib/i18n';

export type LiveDemoScenarioId =
  | 'price_drop'
  | 'autonomous_sync'
  | 'approval_pending'
  | 'approval_handled'
  | 'insight_supplier';

const SCENARIO_ORDER: LiveDemoScenarioId[] = [
  'price_drop',
  'autonomous_sync',
  'approval_pending',
  'approval_handled',
  'insight_supplier',
];

let scenarioIndex = 0;

export function nextLiveDemoScenario(): LiveDemoScenarioId {
  const id = SCENARIO_ORDER[scenarioIndex % SCENARIO_ORDER.length]!;
  scenarioIndex += 1;
  return id;
}

export function runLiveDemoScenario(id: LiveDemoScenarioId): void {
  switch (id) {
    case 'price_drop': {
      showCalmToast({
        variant: 'warning',
        title: t('liveDemo.priceDrop.title'),
        description: t('liveDemo.priceDrop.body'),
        action: { label: t('liveDemo.view'), onClick: () => dispatchNavigate('/suppliers') },
      });
      dispatchNotification({
        title: t('liveDemo.priceDrop.title'),
        body: t('liveDemo.priceDrop.body'),
        severity: 'action',
        href: '/suppliers',
        actionLabel: t('liveDemo.viewSupplier'),
        source: 'live-demo',
        category: 'supplier_change',
      });
      dispatchSupplierChange({
        supplierId: DEMO_SUPPLIER_IDS.nordic,
        hasRecentPriceDrop: true,
        recentChangeCountDelta: 1,
        lastSyncAt: new Date().toISOString(),
      });
      break;
    }
    case 'autonomous_sync': {
      const item = createLiveActivityItem();
      showCalmToast({
        variant: 'success',
        title: t('liveDemo.sync.title'),
        description: t('liveDemo.sync.body'),
      });
      dispatchNotification({
        title: t('liveDemo.sync.title'),
        body: t('liveDemo.sync.body'),
        severity: 'info',
        href: '/timeline',
        source: 'live-demo',
        category: 'autonomous_low_risk',
      });
      dispatchActivityItem(item);
      break;
    }
    case 'approval_pending': {
      dispatchNotification({
        title: t('liveDemo.approvalPending.title'),
        body: t('liveDemo.approvalPending.body'),
        severity: 'action',
        href: '/approvals',
        actionLabel: t('liveDemo.openApprovals'),
        source: 'live-demo',
        category: 'high_risk_approval',
      });
      notifyApprovalsChanged(3);
      break;
    }
    case 'approval_handled': {
      showCalmToast({
        variant: 'success',
        title: t('liveDemo.approvalHandled.title'),
        description: t('liveDemo.approvalHandled.body'),
      });
      dispatchNotification({
        title: t('liveDemo.approvalHandled.title'),
        body: t('liveDemo.approvalHandled.body'),
        severity: 'info',
        href: '/approvals',
        source: 'live-demo',
      });
      break;
    }
    case 'insight_supplier': {
      dispatchNotification({
        title: t('liveDemo.insight.title'),
        body: t('liveDemo.insight.body'),
        severity: 'info',
        href: '/command-center',
        source: 'live-demo',
      });
      dispatchInsightAppeared({ insightId: 'supplier' });
      break;
    }
    default:
      break;
  }
}
