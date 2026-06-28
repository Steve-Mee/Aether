import {
  Card,
  RangeInput,
  SegmentedControl,
  SettingRow,
  Switch,
  TimeInput,
} from '@/components/ui';
import { t } from '@/lib/i18n';
import {
  AUTONOMY_ACTION_CATEGORIES,
  defaultCategorySchedule,
  type AutonomyActionCategory,
  type AutonomyCategoryPolicy,
  type AutonomyPrefs,
  type CategoryScheduleMode,
} from '@/lib/settings/autonomyTypes';

interface Props {
  autonomyPrefs: AutonomyPrefs;
  onChange: (prefs: AutonomyPrefs) => void;
  disabled?: boolean;
}

function updateCategory(
  prefs: AutonomyPrefs,
  category: AutonomyActionCategory,
  patch: Partial<AutonomyCategoryPolicy>,
): AutonomyPrefs {
  return {
    ...prefs,
    preset: 'custom',
    actionCategories: {
      ...prefs.actionCategories,
      [category]: { ...prefs.actionCategories[category], ...patch },
    },
  };
}

export default function AutonomyCategoryGrid({ autonomyPrefs, onChange, disabled }: Props) {
  const scheduleOptions: { value: CategoryScheduleMode; label: string }[] = [
    { value: 'continuous', label: t('settings.autonomy.category.scheduleContinuous') },
    { value: 'custom', label: t('settings.autonomy.category.scheduleCustom') },
  ];

  return (
    <Card variant="elevated" padding="lg" data-testid="autonomy-category-grid">
      <h3 className="text-base font-semibold text-foreground mb-1">
        {t('settings.autonomy.categories.title')}
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        {t('settings.autonomy.categories.subtitle')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {AUTONOMY_ACTION_CATEGORIES.map((category) => {
          const policy = autonomyPrefs.actionCategories[category];
          const schedule = policy.schedule ?? defaultCategorySchedule();
          const isCustom = schedule.mode === 'custom';

          return (
            <div
              key={category}
              className="rounded-xl border border-border/30 p-4 space-y-3"
              data-testid={`autonomy-category-${category}`}
            >
              <div>
                <p className="font-medium text-foreground">
                  {t(`settings.autonomy.category.${category}.label`)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(`settings.autonomy.category.${category}.hint`)}
                </p>
              </div>

              <SettingRow label={t('settings.autonomy.category.enabled')}>
                <Switch
                  checked={policy.enabled}
                  disabled={disabled}
                  onCheckedChange={(enabled) =>
                    onChange(updateCategory(autonomyPrefs, category, { enabled }))
                  }
                />
              </SettingRow>

              <SettingRow label={t('settings.autonomy.category.lowRiskAuto')}>
                <Switch
                  checked={policy.allowLowRiskAutoExecute}
                  disabled={disabled || !policy.enabled}
                  onCheckedChange={(allowLowRiskAutoExecute) =>
                    onChange(updateCategory(autonomyPrefs, category, { allowLowRiskAutoExecute }))
                  }
                />
              </SettingRow>

              <SettingRow label={t('settings.autonomy.category.mediumRiskAuto')}>
                <Switch
                  checked={policy.allowMediumRiskAutoExecute}
                  disabled={disabled || !policy.enabled}
                  onCheckedChange={(allowMediumRiskAutoExecute) =>
                    onChange(updateCategory(autonomyPrefs, category, { allowMediumRiskAutoExecute }))
                  }
                />
              </SettingRow>

              <SettingRow
                label={t('settings.autonomy.category.schedule')}
                description={t('settings.autonomy.category.scheduleHint')}
              >
                <SegmentedControl
                  options={scheduleOptions}
                  value={schedule.mode}
                  disabled={disabled || !policy.enabled}
                  onChange={(mode) =>
                    onChange(
                      updateCategory(autonomyPrefs, category, {
                        schedule: {
                          ...schedule,
                          mode,
                          ...(mode === 'continuous'
                            ? { useOutsideOfficePreset: false }
                            : {}),
                        },
                      }),
                    )
                  }
                  data-testid={`autonomy-category-schedule-${category}`}
                />
              </SettingRow>

              {isCustom && (
                <div className="space-y-3 pl-1 border-l-2 border-border/40 ml-1">
                  <SettingRow label={t('settings.autonomy.category.outsideOfficePreset')}>
                    <Switch
                      checked={schedule.useOutsideOfficePreset ?? false}
                      disabled={disabled || !policy.enabled}
                      onCheckedChange={(useOutsideOfficePreset) =>
                        onChange(
                          updateCategory(autonomyPrefs, category, {
                            schedule: { ...schedule, mode: 'custom', useOutsideOfficePreset },
                          }),
                        )
                      }
                    />
                  </SettingRow>
                  {!schedule.useOutsideOfficePreset && (
                    <div className="flex flex-wrap gap-4">
                      <label className="text-sm">
                        <span className="text-muted-foreground block mb-1">
                          {t('settings.autonomy.windowStart')}
                        </span>
                        <TimeInput
                          value={schedule.windowStart ?? '09:00'}
                          disabled={disabled || !policy.enabled}
                          onChange={(e) =>
                            onChange(
                              updateCategory(autonomyPrefs, category, {
                                schedule: {
                                  ...schedule,
                                  mode: 'custom',
                                  windowStart: e.target.value,
                                },
                              }),
                            )
                          }
                        />
                      </label>
                      <label className="text-sm">
                        <span className="text-muted-foreground block mb-1">
                          {t('settings.autonomy.windowEnd')}
                        </span>
                        <TimeInput
                          value={schedule.windowEnd ?? '18:00'}
                          disabled={disabled || !policy.enabled}
                          onChange={(e) =>
                            onChange(
                              updateCategory(autonomyPrefs, category, {
                                schedule: {
                                  ...schedule,
                                  mode: 'custom',
                                  windowEnd: e.target.value,
                                },
                              }),
                            )
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
