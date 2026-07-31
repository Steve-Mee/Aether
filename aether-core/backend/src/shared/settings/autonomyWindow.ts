import type { MerchantSettings } from './merchantPrefsTypes';

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Returns true when autonomous actions are allowed at the given time. */
export function isAutonomousWindowOpen(
  settings: Pick<MerchantSettings, 'autoRunWindow' | 'autoRunWindowStart' | 'autoRunWindowEnd'>,
  now: Date = new Date()
): boolean {
  if (settings.autoRunWindow === 'always') return true;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (settings.autoRunWindow === 'outside_office') {
    const officeStart = 9 * 60;
    const officeEnd = 18 * 60;
    return currentMinutes < officeStart || currentMinutes >= officeEnd;
  }

  const start = parseTimeToMinutes(settings.autoRunWindowStart) ?? 18 * 60;
  const end = parseTimeToMinutes(settings.autoRunWindowEnd) ?? 8 * 60;
  if (start === end) return true;
  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  return currentMinutes >= start || currentMinutes < end;
}

export function extractMarginImpact(payload: Record<string, unknown>): number {
  const raw =
    payload.estimatedImpactEuro ??
    payload.marginImpact ??
    payload.impactEuro ??
    payload.amount ??
    0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}
