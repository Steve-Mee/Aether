import { useState } from 'react';
import React from 'react';
import { apiFetch, OperatingMetrics } from '../../lib/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { t } from '../../lib/i18n';

interface TruthReviewPanelProps {
  metrics: OperatingMetrics;
  onComplete: () => void;
}

export default function TruthReviewPanel({ metrics, onComplete }: TruthReviewPanelProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!metrics.truthReviewDue) return null;

  const complete = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiFetch<{ success: boolean; message: string }>('/api/admin/truth-review', {
        method: 'POST',
      });
      setMessage(res.message);
      onComplete();
    } catch (e) {
      setMessage(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-[var(--color-warning)]/40">
      <p className="text-sm text-[var(--color-text-muted)] mb-3">{t('settings.truthReview.yes')}</p>
      <Button variant="primary" size="sm" disabled={loading} onClick={() => void complete()}>
        {t('settings.truthReview.action')}
      </Button>
      {message && <p className="text-xs text-[var(--color-success)] mt-2">{message}</p>}
    </Card>
  );
}
