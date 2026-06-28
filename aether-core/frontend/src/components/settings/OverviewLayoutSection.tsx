import { useCallback, useEffect, useId, useRef, useState } from 'react';
import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Undo2 } from 'lucide-react';
import {
  Button,
  Card,
  SegmentedControl,
  SettingRow,
  Switch,
} from '@/components/ui';
import { t } from '@/lib/i18n';
import { showCalmToast } from '@/lib/toast';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type {
  OverviewDefaultPeriod,
  OverviewPrefs,
  OverviewSectionKey,
} from '@/lib/settings/merchantSettingsTypes';
import { DEFAULT_OVERVIEW_PREFS } from '@/lib/settings/merchantSettingsTypes';

const UNDO_MAX = 5;

function sectionLabel(key: OverviewSectionKey): string {
  switch (key) {
    case 'attention':
      return t('overview.section.attention');
    case 'agentMetrics':
      return t('overview.section.agentMetrics');
    case 'handoffs':
      return t('overview.section.handoffs');
    case 'proactive':
      return t('overview.section.proactive');
    case 'goals':
      return t('overview.section.goals');
    case 'activity':
      return t('overview.section.activity');
    default:
      return key;
  }
}

function SortableSectionRow({
  sectionKey,
  enabled,
  checked,
  onCheckedChange,
}: {
  sectionKey: OverviewSectionKey;
  enabled: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionKey,
    disabled: !enabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/20 bg-background/40 px-3 py-2.5"
      data-testid={`overview-section-row-${sectionKey}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="touch-none rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
          aria-label={t('settings.overview.dragHandle')}
          disabled={!enabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <SettingRow label={sectionLabel(sectionKey)}>
          <Switch
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={!enabled}
          />
        </SettingRow>
      </div>
    </div>
  );
}

export default function OverviewLayoutSection() {
  const { settings, updateSettings } = useMerchantSettings();
  const [draft, setDraft] = useState<OverviewPrefs>(
    settings.overviewPrefs ?? DEFAULT_OVERVIEW_PREFS,
  );
  const [saving, setSaving] = useState(false);
  const [undoStack, setUndoStack] = useState<OverviewPrefs[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  React.useEffect(() => {
    setDraft(settings.overviewPrefs ?? DEFAULT_OVERVIEW_PREFS);
  }, [settings.overviewPrefs]);

  const persist = useCallback(
    async (next: OverviewPrefs, pushUndo = true) => {
      if (pushUndo) {
        setUndoStack((stack) => {
          const snapshot = settings.overviewPrefs ?? DEFAULT_OVERVIEW_PREFS;
          const updated = [snapshot, ...stack].slice(0, UNDO_MAX);
          return updated;
        });
      }
      setSaving(true);
      try {
        await updateSettings({ overviewPrefs: { ...next } });
        showCalmToast({ variant: 'success', title: t('settings.overview.layoutSaved') });
      } catch {
        setDraft(settings.overviewPrefs ?? DEFAULT_OVERVIEW_PREFS);
      } finally {
        setSaving(false);
      }
    },
    [settings.overviewPrefs, updateSettings],
  );

  const schedulePersist = useCallback(
    (next: OverviewPrefs) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void persist(next);
      }, 300);
    },
    [persist],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft((d) => {
      const order = [...d.sectionOrder];
      const oldIndex = order.indexOf(active.id as OverviewSectionKey);
      const newIndex = order.indexOf(over.id as OverviewSectionKey);
      if (oldIndex < 0 || newIndex < 0) return d;
      const next = { ...d, sectionOrder: arrayMove(order, oldIndex, newIndex) };
      void persist(next);
      return next;
    });
  };

  const updateDraft = (updater: (current: OverviewPrefs) => OverviewPrefs) => {
    setDraft((current) => {
      const next = updater(current);
      schedulePersist(next);
      return next;
    });
  };

  const undoLayout = async () => {
    const previous = undoStack[0];
    if (!previous) return;
    setUndoStack((stack) => stack.slice(1));
    setDraft(previous);
    setSaving(true);
    try {
      await updateSettings({ overviewPrefs: { ...previous } });
      showCalmToast({ variant: 'success', title: t('settings.overview.layoutRestored') });
    } finally {
      setSaving(false);
    }
  };

  const periodOptions: { value: OverviewDefaultPeriod; label: string }[] = [
    { value: '24h', label: t('overview.filter.period24h') },
    { value: '7d', label: t('overview.filter.period7d') },
    { value: '30d', label: t('overview.filter.period30d') },
  ];

  return (
    <Card className="rounded-2xl border-border/30 bg-card/50 p-6" id="overview">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">{t('settings.overview.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('settings.overview.subtitle')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={undoStack.length === 0 || saving}
          onClick={() => void undoLayout()}
        >
          <Undo2 size={14} className="mr-1.5" />
          {t('settings.overview.undoLayout')}
        </Button>
      </div>

      <div className="space-y-5">
        <SettingRow
          htmlFor={enabledId}
          label={t('settings.overview.enabled')}
          description={t('settings.overview.enabledHint')}
        >
          <Switch
            id={enabledId}
            checked={draft.enabled}
            onCheckedChange={(enabled) => updateDraft((d) => ({ ...d, enabled }))}
          />
        </SettingRow>

        <SettingRow label={t('settings.overview.defaultPeriod')}>
          <SegmentedControl
            value={draft.defaultPeriod}
            onChange={(v) => updateDraft((d) => ({ ...d, defaultPeriod: v as OverviewDefaultPeriod }))}
            options={periodOptions.map((opt) => ({
              ...opt,
              disabled: !draft.enabled,
            }))}
            aria-label={t('settings.overview.defaultPeriod')}
          />
        </SettingRow>

        <div className="space-y-3 pt-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('settings.overview.sections')}
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={draft.sectionOrder} strategy={verticalListSortingStrategy}>
              {draft.sectionOrder.map((key) => (
                <SortableSectionRow
                  key={key}
                  sectionKey={key}
                  enabled={draft.enabled}
                  checked={draft.sections[key] ?? true}
                  onCheckedChange={(checked) =>
                    updateDraft((d) => ({
                      ...d,
                      sections: { ...d.sections, [key]: checked },
                    }))
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </Card>
  );
}
