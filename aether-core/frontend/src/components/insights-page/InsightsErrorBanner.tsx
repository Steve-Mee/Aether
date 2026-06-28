import React from 'react';
import { ErrorState } from '@/components/ui';
import { t } from '@/lib/i18n';

interface InsightsErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export default function InsightsErrorBanner({ message, onRetry }: InsightsErrorBannerProps) {
  return (
    <ErrorState
      message={message}
      hint={t('insights.errorFallback')}
      onRetry={onRetry}
      className="mb-6"
      data-testid="insights-error-banner"
    />
  );
}
