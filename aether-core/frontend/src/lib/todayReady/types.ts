export type TodayReadyInsightId =
  | 'pricing'
  | 'supplier'
  | 'approvals'
  | 'margins'
  | 'autonomous'
  | 'summary'
  | 'returns';

export interface TodayReadyInsight {
  id: TodayReadyInsightId;
  variant: TodayReadyInsightId;
  visible: boolean;
  exiting?: boolean;
  executed: boolean;
  sortOrder: number;
  eyebrow: string;
  title: string;
  accent: 'default' | 'success' | 'warning' | 'danger';
  confidence?: { value: string; label?: string };
  metric?: { label: string; value: string; subValue?: string };
  chips?: string[];
  listItems?: { label: string; risk: string }[];
  listOverflow?: string;
  updatedAt?: number;
  /** True when card just became visible (for enter animation) */
  justAppeared?: boolean;
}
