import FeatureStatusBadge from './FeatureStatusBadge';
import { useFeatureStatus } from '../lib/useFeatureStatus';

export default function FeatureStatusFromTruth({ featureKey }: { featureKey: string }) {
  const status = useFeatureStatus(featureKey);
  if (status === 'loading') return null;
  return <FeatureStatusBadge status={status} />;
}
