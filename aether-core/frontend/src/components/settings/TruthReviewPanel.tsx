import { useState } from 'react';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { OperatingMetrics } from '../../lib/api';
import { adminRepository } from '@/lib/data';
import { invalidateAfterTruthReview } from '@/lib/data/invalidateAfterMutation';
import { useAetherMutation } from '@/lib/query/hooks';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui';
import { t } from '../../lib/i18n';
import { toUserMessage } from '@/lib/api/errors';
import { trackBusinessEvent, trackMutationFailure } from '@/lib/observability/businessEvents';

interface TruthReviewPanelProps {
  metrics: OperatingMetrics;
  onComplete: () => void;
}

export default function TruthReviewPanel({ metrics, onComplete }: TruthReviewPanelProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const mutation = useAetherMutation({
    mutationFn: () => adminRepository.submitTruthReview(),
    meta: { domain: 'admin', handled: true },
    onSuccess: (res) => {
      trackBusinessEvent('truth.review_submitted', { featureId: 'truth-review' });
      setMessage(res.message);
      invalidateAfterTruthReview(queryClient);
      onComplete();
    },
    onError: (err) => {
      trackMutationFailure('admin', err);
      setMessage(toUserMessage(err));
    },
  });

  if (!metrics.truthReviewDue) return null;

  return (
    <Card className="border-warning/40">
      <p className="text-sm text-muted-foreground mb-3">{t('settings.truthReview.yes')}</p>
      <Button
        variant="primary"
        size="sm"
        disabled={mutation.isPending}
        onClick={() => void mutation.mutate()}
      >
        {t('settings.truthReview.action')}
      </Button>
      {message && <p className="text-xs text-success mt-2">{message}</p>}
    </Card>
  );
}
