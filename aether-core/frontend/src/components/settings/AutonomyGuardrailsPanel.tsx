import { useId } from 'react';
import {
  Card,
  RangeInput,
  SegmentedControl,
  SettingRow,
  Switch,
  TimeInput,
} from '@/components/ui';
import { t } from '@/lib/i18n';
import type { AutoRunWindow, MerchantSettings } from '@/lib/settings/merchantSettingsTypes';

interface Props {
  draft: MerchantSettings;
  onChange: (patch: Partial<MerchantSettings>) => void;
}

export default function AutonomyGuardrailsPanel({ draft, onChange }: Props) {
  const policyId = useId();
  const marginRangeId = useId();
  const priceRangeId = useId();

  const windowOptions: { value: AutoRunWindow; label: string }[] = [
    { value: 'always', label: t('settings.autonomy.autoRunAlways') },
    { value: 'outside_office', label: t('settings.autonomy.autoRunOutside') },
    { value: 'custom', label: t('settings.autonomy.autoRunCustom') },
  ];

  const marginHint = t('settings.autonomy.maxMarginHintDynamic').replace(
    '{max}',
    `€${draft.maxMarginImpactEuro}`,
  );

  return (
    <Card variant="elevated" padding="lg" data-testid="autonomy-guardrails">
      <h3 className="text-base font-semibold text-foreground mb-1">
        {t('settings.autonomy.guardrails.title')}
      </h3>
      <p className="text-sm text-muted-foreground mb-6">{t('settings.autonomy.guardrails.subtitle')}</p>

      <SettingRow
        label={t('settings.autonomy.policyEnabled')}
        description={t('settings.autonomy.policyEnabledHint')}
        htmlFor={policyId}
      >
        <Switch
          id={policyId}
          checked={draft.policyEnabled}
          onCheckedChange={(v) => onChange({ policyEnabled: v })}
          data-testid="policy-enabled"
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.maxMargin')}
        description={marginHint}
        htmlFor={marginRangeId}
      >
        <RangeInput
          id={marginRangeId}
          min={50}
          max={5000}
          step={50}
          value={draft.maxMarginImpactEuro}
          onChange={(e) => onChange({ maxMarginImpactEuro: Number(e.target.value) })}
          valueLabel={`€${draft.maxMarginImpactEuro}`}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.maxPricePct')}
        description={t('settings.autonomy.maxPricePctHint')}
        htmlFor={priceRangeId}
      >
        <RangeInput
          id={priceRangeId}
          min={1}
          max={25}
          step={1}
          value={draft.maxAutoPriceChangePct}
          onChange={(e) => onChange({ maxAutoPriceChangePct: Number(e.target.value) })}
          valueLabel={`${draft.maxAutoPriceChangePct}%`}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.autoRunWindow')}
        description={
          draft.autoRunWindow === 'outside_office'
            ? t('settings.autonomy.autoRunOutsideHint')
            : t('settings.autonomy.autoRunHint')
        }
      >
        <SegmentedControl
          options={windowOptions}
          value={draft.autoRunWindow}
          onChange={(v) => onChange({ autoRunWindow: v })}
          data-testid="auto-run-window"
          aria-label={t('settings.autonomy.autoRunWindow')}
        />
      </SettingRow>

      {draft.autoRunWindow === 'custom' && (
        <div className="flex flex-wrap gap-4 py-4 border-b border-border/30">
          <label className="text-sm">
            <span className="text-muted-foreground block mb-1">
              {t('settings.autonomy.windowStart')}
            </span>
            <TimeInput
              value={draft.autoRunWindowStart ?? '18:00'}
              onChange={(e) => onChange({ autoRunWindowStart: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground block mb-1">
              {t('settings.autonomy.windowEnd')}
            </span>
            <TimeInput
              value={draft.autoRunWindowEnd ?? '08:00'}
              onChange={(e) => onChange({ autoRunWindowEnd: e.target.value })}
            />
          </label>
        </div>
      )}
    </Card>
  );
}
