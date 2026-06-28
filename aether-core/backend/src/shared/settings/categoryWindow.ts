import type { AutonomyActionCategory, CategorySchedule } from './autonomyTypes';
import { parseTimeToMinutes } from './merchantSettingsTypes';
import type { MerchantSettings } from './merchantSettingsTypes';

export function isCategoryWindowOpen(
  category: AutonomyActionCategory,
  settings: MerchantSettings,
  now: Date = new Date(),
): boolean {
  const schedule = settings.autonomyPrefs?.actionCategories?.[category]?.schedule;
  if (!schedule || schedule.mode === 'continuous') {
    return true;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (schedule.useOutsideOfficePreset) {
    const officeStart = 9 * 60;
    const officeEnd = 18 * 60;
    return currentMinutes < officeStart || currentMinutes >= officeEnd;
  }

  const start = parseTimeToMinutes(schedule.windowStart) ?? 18 * 60;
  const end = parseTimeToMinutes(schedule.windowEnd) ?? 8 * 60;
  if (start === end) return true;
  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  return currentMinutes >= start || currentMinutes < end;
}

export function categoryScheduleLabel(schedule: CategorySchedule | undefined): string {
  if (!schedule || schedule.mode === 'continuous') return 'continuous';
  if (schedule.useOutsideOfficePreset) return 'outside_office';
  return `${schedule.windowStart ?? '18:00'}–${schedule.windowEnd ?? '08:00'}`;
}
