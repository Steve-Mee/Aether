import { SettingRow } from '@/components/ui';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { KnowledgeTransferCategoryPrefs } from '@/lib/settings/merchantSettingsTypes';
import { t } from '@/lib/i18n';

const CATEGORIES: Array<{ key: keyof KnowledgeTransferCategoryPrefs; label: string }> = [
  { key: 'pricing', label: 'Pricing' },
  { key: 'conversion', label: 'Conversion' },
  { key: 'trend', label: 'Trend' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'marketing', label: 'Marketing' },
];

export default function KnowledgeTransferCategoriesSection() {
  const { settings, updateSettings } = useMerchantSettings();
  const cats = settings.proactivePrefs.knowledgeTransferCategories ?? {
    pricing: true,
    conversion: true,
    trend: true,
    inventory: true,
    marketing: true,
  };

  const toggle = async (key: keyof KnowledgeTransferCategoryPrefs, enabled: boolean) => {
    await updateSettings({
      proactivePrefs: {
        ...settings.proactivePrefs,
        knowledgeTransferCategories: {
          ...cats,
          [key]: enabled,
        },
      },
    });
  };

  return (
    <div className="space-y-3" data-testid="kt-category-optout">
      <h3 className="text-sm font-medium text-foreground">
        {t('settings.globalKnowledge.categoryOptOut') || 'Knowledge transfer categories'}
      </h3>
      <p className="text-xs text-muted-foreground mb-2">
        {t('settings.globalKnowledge.categoryOptOutHint') ||
          'Schakel categorieën uit die je niet wilt delen of ontvangen via Hive Knowledge Transfer.'}
      </p>
      {CATEGORIES.map(({ key, label }) => (
        <SettingRow key={key} label={label} description="">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={cats[key] !== false}
            onChange={(e) => void toggle(key, e.target.checked)}
            aria-label={`KT category ${label}`}
          />
        </SettingRow>
      ))}
    </div>
  );
}
