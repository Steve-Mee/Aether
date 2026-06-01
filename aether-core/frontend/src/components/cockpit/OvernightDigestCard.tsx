import { Link } from 'react-router-dom';
import { Moon } from 'lucide-react';
import React from 'react';
import { useDashboard } from '../../lib/DashboardContext';
import { t } from '../../lib/i18n';
import Card from '../ui/Card';
import InsightState from '../ui/InsightState';

/**
 * P3.1 minimal: post-fact digest hint from autonomy audit volume (7d).
 */
export default function OvernightDigestCard() {
  const { data } = useDashboard();
  const count = data?.autonomousActions7d ?? 0;
  if (count === 0) return null;

  return (
    <InsightState variant="idle">
      <Card className="border-0 bg-transparent p-0 shadow-none">
        <div className="flex gap-3">
          <Moon size={18} className="text-[var(--color-intent)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">{t('cockpit.digest.title')}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {count} {t('cockpit.digest.detail')}
            </p>
            <Link to="/autonomous" className="text-xs text-[var(--color-intent)] hover:underline mt-2 inline-block">
              {t('cockpit.view')} →
            </Link>
          </div>
        </div>
      </Card>
    </InsightState>
  );
}
