import type { ActivityItem, ActivityRelated } from '@/types/activity';

/** Demo approval IDs cannot load /api/admin/explain. */
export function isLiveRelatedId(id: string): boolean {
  return !id.startsWith('demo-');
}

export function canExplainApproval(related: ActivityRelated | undefined): boolean {
  return related?.type === 'approval' && isLiveRelatedId(related.id);
}

export function relatedRowLinkKey(item: ActivityItem): string | null {
  if (!item.related) return null;
  switch (item.related.type) {
    case 'approval':
      return 'activity.row.moreDetails';
    case 'insight':
      return 'activity.detail.viewInsight';
    case 'email':
      return 'activity.detail.viewEmail';
    default:
      return 'activity.row.moreDetails';
  }
}
