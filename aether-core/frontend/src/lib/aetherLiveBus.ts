import type { ActivityItem } from '@/types/activity';
import type { PushNotificationInput } from '@/lib/notifications/types';
import type { NotificationStateChangedEvent } from '@/types/notification';
import type { TodayReadyInsightId } from '@/lib/todayReadyDemo';

export const NOTIFICATION_EVENT = 'aether:notification';
export const NOTIFICATION_STATE_EVENT = 'aether:notification-state';
export const ACTIVITY_ITEM_EVENT = 'aether:activity-item';
export const SUPPLIER_CHANGE_EVENT = 'aether:supplier-change';
export const INSIGHT_APPEARED_EVENT = 'aether:insight-appeared';
export const NAVIGATE_EVENT = 'aether:navigate';

export interface SupplierChangeDetail {
  supplierId: string;
  hasRecentPriceDrop?: boolean;
  recentChangeCountDelta?: number;
  lastSyncAt?: string;
}

export interface InsightAppearedDetail {
  insightId: TodayReadyInsightId;
}

export function dispatchNotificationState(event: NotificationStateChangedEvent): void {
  window.dispatchEvent(
    new CustomEvent<NotificationStateChangedEvent>(NOTIFICATION_STATE_EVENT, { detail: event }),
  );
}

export function subscribeNotificationState(
  handler: (event: NotificationStateChangedEvent) => void,
): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<NotificationStateChangedEvent>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(NOTIFICATION_STATE_EVENT, listener);
  return () => window.removeEventListener(NOTIFICATION_STATE_EVENT, listener);
}

export function dispatchNotification(input: PushNotificationInput): void {
  window.dispatchEvent(
    new CustomEvent<PushNotificationInput>(NOTIFICATION_EVENT, { detail: input }),
  );
}

export function dispatchActivityItem(item: ActivityItem): void {
  window.dispatchEvent(new CustomEvent<ActivityItem>(ACTIVITY_ITEM_EVENT, { detail: item }));
}

export function dispatchSupplierChange(detail: SupplierChangeDetail): void {
  window.dispatchEvent(new CustomEvent<SupplierChangeDetail>(SUPPLIER_CHANGE_EVENT, { detail }));
}

export function dispatchInsightAppeared(detail: InsightAppearedDetail): void {
  window.dispatchEvent(new CustomEvent<InsightAppearedDetail>(INSIGHT_APPEARED_EVENT, { detail }));
}

export function dispatchNavigate(path: string): void {
  window.dispatchEvent(new CustomEvent<string>(NAVIGATE_EVENT, { detail: path }));
}

export function subscribeNavigate(handler: (path: string) => void): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<string>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(NAVIGATE_EVENT, listener);
  return () => window.removeEventListener(NAVIGATE_EVENT, listener);
}

export function subscribeNotification(handler: (input: PushNotificationInput) => void): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<PushNotificationInput>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(NOTIFICATION_EVENT, listener);
  return () => window.removeEventListener(NOTIFICATION_EVENT, listener);
}

export function subscribeActivityItem(handler: (item: ActivityItem) => void): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<ActivityItem>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(ACTIVITY_ITEM_EVENT, listener);
  return () => window.removeEventListener(ACTIVITY_ITEM_EVENT, listener);
}

export function subscribeSupplierChange(
  handler: (detail: SupplierChangeDetail) => void,
): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<SupplierChangeDetail>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(SUPPLIER_CHANGE_EVENT, listener);
  return () => window.removeEventListener(SUPPLIER_CHANGE_EVENT, listener);
}

export function subscribeInsightAppeared(
  handler: (detail: InsightAppearedDetail) => void,
): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<InsightAppearedDetail>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(INSIGHT_APPEARED_EVENT, listener);
  return () => window.removeEventListener(INSIGHT_APPEARED_EVENT, listener);
}
