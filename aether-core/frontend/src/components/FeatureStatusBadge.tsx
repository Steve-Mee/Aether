import { FeatureStatus } from '../lib/api';
import { t } from '../lib/i18n';

const styles: Record<FeatureStatus, string> = {
  live: 'bg-emerald-500/20 text-emerald-400',
  partial: 'bg-amber-500/20 text-amber-400',
  experimental: 'bg-purple-500/20 text-purple-400',
};

const labelKeys: Record<FeatureStatus, string> = {
  live: 'status.live',
  partial: 'status.partial',
  experimental: 'status.experimental',
};

export default function FeatureStatusBadge({ status }: { status: FeatureStatus }) {
  return (
    <span className={`text-xs uppercase tracking-widest px-3 py-1 rounded-full ${styles[status]}`}>
      {t(labelKeys[status])}
    </span>
  );
}
