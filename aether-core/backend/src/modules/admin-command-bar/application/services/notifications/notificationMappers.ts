import type { ActivityFeedItem } from '../ActivityFeedService';
import type { OverviewFeedItem } from '../OverviewFeedService';
import { overviewHighlightHref } from '../OverviewFeedService';
import {
  goalMilestoneNotificationId,
  kindToCategory,
  type MerchantNotification,
  type NotificationKind,
  type NotificationSeverity,
} from './notificationTypes';

export function mapActivityToNotification(item: ActivityFeedItem): MerchantNotification | null {
  if (item.actionType === 'ui.navigation') return null;

  const severity: NotificationSeverity =
    item.status === 'pending' || item.risk === 'high'
      ? 'action'
      : item.status === 'rejected'
        ? 'warning'
        : 'info';

  let href: string | undefined;
  let kind: NotificationKind = 'system';

  if (item.related?.type === 'approval' || item.module.includes('approval')) {
    href = item.related?.id
      ? overviewHighlightHref('approval', item.related.id)
      : '/overview?highlight=section%3Aattention';
    kind = 'approval_needed';
  } else if (item.module.includes('supplier')) {
    href = '/suppliers';
    kind = 'supplier_change';
  } else if (
    item.actionType.includes('autonomy') ||
    item.module.includes('autonomy') ||
    item.status === 'autonomous'
  ) {
    kind = 'agent_action';
    href = overviewHighlightHref('activity', item.id);
  } else {
    href = overviewHighlightHref('activity', item.id);
    kind = 'agent_action';
  }

  return {
    id: `notif-${item.id}`,
    kind,
    title: item.actionLabel,
    body: item.description,
    severity,
    read: false,
    createdAt: item.at,
    href,
    actionLabel: href ? 'Bekijk' : undefined,
    source: 'system',
    category: kindToCategory(kind),
  };
}

export function mapPendingApprovalsNotification(
  pendingCount: number,
  read: boolean,
): MerchantNotification {
  return {
    id: 'inbox-pending-approvals',
    kind: 'approval_needed',
    title: 'Goedkeuringen wachten',
    body:
      pendingCount === 1
        ? '1 beslissing wacht op jou'
        : `${pendingCount} beslissingen wachten op jou`,
    severity: 'action',
    read,
    createdAt: new Date().toISOString(),
    href: '/overview?highlight=section%3Aattention',
    actionLabel: 'Bekijk goedkeuringen',
    source: 'system',
    category: 'high_risk_approval',
  };
}

export function mapProactiveRowToNotification(
  row: {
    id: string;
    title: string;
    summary: string | null;
    command: string;
    riskLevel: string | null;
    createdAt: Date;
  },
  read: boolean,
): MerchantNotification {
  return {
    id: `proactive-${row.id}`,
    kind: 'proactive_suggestion',
    title: row.title,
    body: row.summary ?? row.command,
    severity: row.riskLevel === 'low' ? 'info' : 'warning',
    read,
    createdAt: row.createdAt.toISOString(),
    href: overviewHighlightHref('proactive', row.id),
    actionLabel: 'Bekijk suggestie',
    source: 'system',
    category: 'proactive_suggestion',
  };
}

function isGoalSnapshotNotificationWorthy(payload: Record<string, unknown>): boolean {
  if (payload.isMilestone === true) return true;
  if (payload.milestoneThreshold != null) return true;
  return false;
}

export function mapOverviewFeedItemToNotification(
  item: OverviewFeedItem,
): MerchantNotification | null {
  const payload = item.payload;

  if (item.kind === 'goal_snapshot') {
    if (!isGoalSnapshotNotificationWorthy(payload)) return null;
    const threshold = Number(payload.milestoneThreshold ?? payload.progressPct ?? 0);
    const goalId = String(payload.id ?? item.id);
    const title = String(payload.title ?? 'Doelvoortgang');
    return {
      id: goalMilestoneNotificationId(goalId, threshold),
      kind: 'goal_progress',
      title: `Milestone: ${title}`,
      body:
        threshold >= 100
          ? `Doel bereikt (${threshold}%)`
          : `${threshold}% van doel "${title}" bereikt`,
      severity: 'info',
      read: false,
      createdAt: item.at,
      href: overviewHighlightHref('goal', goalId),
      actionLabel: 'Bekijk doel',
      source: 'system',
      category: 'goal_progress',
    };
  }

  if (item.kind === 'goal_completed') {
    const goalId = String(payload.id ?? item.id);
    const title = String(payload.title ?? 'Doel');
    return {
      id: `goal-completed-${goalId}`,
      kind: 'goal_completed',
      title: `Doel behaald: ${title}`,
      body: 'Gefeliciteerd — je doel is voltooid.',
      severity: 'info',
      read: false,
      createdAt: item.at,
      href: overviewHighlightHref('goal', goalId),
      actionLabel: 'Bekijk doel',
      source: 'system',
      category: 'goal_progress',
    };
  }

  if (item.kind === 'agent_handoff') {
    const fromAgent = String(payload.fromAgentKey ?? 'agent');
    const toAgent = String(payload.toAgentKey ?? 'agent');
    const summary = String(payload.summary ?? payload.intent ?? 'Agent-overdracht');
    return {
      id: `handoff-${item.id}`,
      kind: 'agent_handoff',
      title: `${fromAgent} → ${toAgent}`,
      body: summary,
      severity: 'info',
      read: false,
      createdAt: item.at,
      href: overviewHighlightHref('handoff', item.id),
      actionLabel: 'Bekijk overdracht',
      source: 'system',
      category: 'autonomous_low_risk',
    };
  }

  if (item.kind === 'proactive') {
    return {
      id: `proactive-${item.id}`,
      kind: 'proactive_suggestion',
      title: String(payload.label ?? payload.title ?? 'Proactieve suggestie'),
      body: String(payload.command ?? ''),
      severity: payload.riskLevel === 'low' ? 'info' : 'warning',
      read: false,
      createdAt: item.at,
      href: overviewHighlightHref('proactive', item.id),
      actionLabel: 'Bekijk suggestie',
      source: 'system',
      category: 'proactive_suggestion',
    };
  }

  if (item.kind === 'approval' && payload.status === 'pending') {
    return {
      id: `approval-${item.id}`,
      kind: 'approval_needed',
      title: 'Goedkeuring vereist',
      body: String(payload.actionType ?? payload.module ?? 'Beslissing wacht op jou'),
      severity: 'action',
      read: false,
      createdAt: item.at,
      href: overviewHighlightHref('approval', item.id),
      actionLabel: 'Bekijk goedkeuring',
      source: 'system',
      category: 'high_risk_approval',
    };
  }

  return null;
}
