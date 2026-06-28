import { useEffect, useState } from 'react';
import React from 'react';
import { Button, Card, RangeInput, SegmentedControl } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { GoalMetricType, GoalPursuitMode } from '@/types/goals';
import type { MerchantGoal } from '@/types/goals';

interface GoalFormDialogProps {
  open: boolean;
  initial?: MerchantGoal | null;
  parentGoals?: MerchantGoal[];
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description?: string;
    metricType: GoalMetricType;
    metricScope?: { categoryId?: string; productSlug?: string; threshold?: number };
    targetValue: number;
    deadline: string;
    pursuitMode?: GoalPursuitMode;
    parentGoalId?: string;
  }) => Promise<void>;
}

const metricOptions: { value: GoalMetricType; label: string }[] = [
  { value: 'margin', label: 'Marge' },
  { value: 'revenue', label: 'Omzet' },
  { value: 'inventory', label: 'Voorraad' },
  { value: 'category_revenue', label: 'Categorie' },
];

export default function GoalFormDialog({ open, initial, parentGoals = [], onClose, onSubmit }: GoalFormDialogProps) {
  const { settings } = useMerchantSettings();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metricType, setMetricType] = useState<GoalMetricType>('margin');
  const [targetValue, setTargetValue] = useState(25);
  const [categoryId, setCategoryId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [pursuitMode, setPursuitMode] = useState<GoalPursuitMode>(
    settings.goalPrefs.defaultPursuitMode,
  );
  const [parentGoalId, setParentGoalId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description ?? '');
      setMetricType(initial.metricType);
      setTargetValue(initial.targetValue);
      setCategoryId(initial.metricScope.categoryId ?? initial.metricScope.productSlug ?? '');
      setDeadline(initial.deadline.slice(0, 10));
      setPursuitMode(initial.pursuitMode);
    } else {
      setTitle('');
      setDescription('');
      setMetricType('margin');
      setTargetValue(25);
      setCategoryId('');
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDeadline(d.toISOString().slice(0, 10));
      setPursuitMode(settings.goalPrefs.defaultPursuitMode);
      setParentGoalId('');
    }
  }, [open, initial, settings.goalPrefs.defaultPursuitMode]);

  if (!open) return null;

  const save = async () => {
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        metricType,
        metricScope:
          metricType === 'category_revenue'
            ? { categoryId: categoryId.trim() || undefined, productSlug: categoryId.trim() || undefined }
            : undefined,
        targetValue,
        deadline: new Date(deadline).toISOString(),
        pursuitMode,
        parentGoalId: parentGoalId || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold">
          {initial ? t('goals.form.editTitle') : t('goals.form.createTitle')}
        </h3>

        <label className="block space-y-1">
          <span className="text-sm">{t('goals.form.title')}</span>
          <input
            className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm">{t('goals.form.description')}</span>
          <textarea
            className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm min-h-[72px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <SegmentedControl
          label={t('goals.form.metric')}
          value={metricType}
          onChange={(v) => setMetricType(v as GoalMetricType)}
          options={metricOptions}
        />

        {metricType === 'category_revenue' ? (
          <label className="block space-y-1">
            <span className="text-sm">{t('goals.form.category')}</span>
            <input
              className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              placeholder="product-slug of categorie"
            />
          </label>
        ) : null}

        <RangeInput
          label={t('goals.form.target')}
          value={targetValue}
          onChange={setTargetValue}
          min={1}
          max={100}
          unit="%"
        />

        <label className="block space-y-1">
          <span className="text-sm">{t('goals.form.deadline')}</span>
          <input
            type="date"
            className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>

        <SegmentedControl
          label={t('goals.form.pursuit')}
          value={pursuitMode}
          onChange={(v) => setPursuitMode(v as GoalPursuitMode)}
          options={[
            { value: 'conservative', label: t('goals.pursuit.conservative') },
            { value: 'balanced', label: t('goals.pursuit.balanced') },
            { value: 'aggressive', label: t('goals.pursuit.aggressive') },
          ]}
        />

        {!initial && parentGoals.length > 0 ? (
          <label className="block space-y-1">
            <span className="text-sm">{t('goals.form.parent')}</span>
            <select
              className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm"
              value={parentGoalId}
              onChange={(e) => setParentGoalId(e.target.value)}
            >
              <option value="">{t('goals.form.noParent')}</option>
              {parentGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {t('goals.form.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={saving || !title.trim() || !deadline}>
            {saving ? t('goals.form.saving') : t('goals.form.save')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
