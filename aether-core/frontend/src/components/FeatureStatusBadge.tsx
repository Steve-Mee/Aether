import { FeatureStatus } from '@/lib/api';
import { Badge } from '@/components/ui';
import { t } from '@/lib/i18n';

const variantMap: Record<FeatureStatus, 'live' | 'partial' | 'experimental'> = {
  live: 'live',
  partial: 'partial',
  experimental: 'experimental',
};

const labelKeys: Record<FeatureStatus, string> = {
  live: 'status.live',
  partial: 'status.partial',
  experimental: 'status.experimental',
};

export default function FeatureStatusBadge({ status }: { status: FeatureStatus }) {
  return <Badge variant={variantMap[status]}>{t(labelKeys[status])}</Badge>;
}
