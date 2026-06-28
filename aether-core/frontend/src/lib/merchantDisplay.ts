import { t } from '@/lib/i18n';
import { env } from '@/lib/config';

export function merchantDisplayName(): string {
  if (env.merchantDisplayName) return env.merchantDisplayName;
  return t('brand.merchantFallback');
}
