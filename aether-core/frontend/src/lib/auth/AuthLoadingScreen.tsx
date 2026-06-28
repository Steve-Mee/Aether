import { Spinner } from '@/components/ui';
import AetherBrandMark from '@/components/shell/AetherBrandMark';
import { t } from '@/lib/i18n';

export function AuthLoadingScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-6"
      data-testid="auth-loading"
      role="status"
      aria-live="polite"
    >
      <AetherBrandMark size="md" />
      <Spinner size="lg" label={t('auth.loading')} />
    </div>
  );
}
