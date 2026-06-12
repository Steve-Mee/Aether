import { Zap } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../lib/i18n';
import {
  autoRunWindowLabel,
  isAutonomousWindowOpen,
} from '../../lib/settings/merchantSettingsTypes';
import { useMerchantSettings } from '../../lib/settings/MerchantSettingsContext';
import InsightState from '../ui/InsightState';

export default function AutoRunWindowCard() {
  const { settings } = useMerchantSettings();

  if (!settings.policyEnabled || !settings.autoApproveLowRisk) return null;

  const windowOpen = isAutonomousWindowOpen(settings);
  const windowLabel = autoRunWindowLabel(settings);

  return (
    <InsightState variant={windowOpen ? 'active' : 'idle'}>
      <div className="flex gap-3">
        <Zap size={18} className="text-warning shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">{t('cockpit.autoRun.title')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {settings.autoRunWindow === 'always'
              ? t('cockpit.autoRun.detail')
              : `${t('settings.autonomy.autoRunWindow')}: ${windowLabel} · ${
                  windowOpen ? t('cockpit.autoRun.active') : t('cockpit.autoRun.inactive')
                }`}
          </p>
          <Link
            to="/settings"
            className="text-xs text-primary/80 hover:underline mt-2 inline-block"
          >
            {t('cockpit.autoRun.settings')} →
          </Link>
        </div>
      </div>
    </InsightState>
  );
}
