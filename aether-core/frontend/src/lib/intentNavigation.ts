export { routeForIntent, INTENT_ROUTES } from '@/lib/navigation/routes';

export const SUGGESTED_COMMANDS = [
  { label: 'Toon lage margin producten', command: 'Toon producten met margin onder 25%' },
  { label: 'Mail samenvatting', command: 'Samenvatting van alle openstaande mails' },
  { label: 'Open goedkeuringen', command: 'Toon openstaande goedkeuringen' },
  { label: 'Supplier monitor', command: 'Monitor supplier wijzigingen' },
  { label: 'Outcome rapport', command: 'Toon outcome en uplift rapport' },
  { label: 'Voorraad status', command: 'Toon voorraad status' },
] as const;

export type RiskBand = 'low' | 'medium' | 'high';

export function assessApprovalRisk(module: string, actionType: string): RiskBand {
  const action = actionType.toLowerCase();
  if (/refund|delete|blacklist/.test(action)) return 'high';
  if (module === 'aether-mail' && /reply|auto/.test(action)) return 'low';
  if (/price|prijs/.test(action)) return 'medium';
  if (/supplier|product|sync/.test(action)) return 'medium';
  if (module === 'agentic-commerce') return 'medium';
  return 'medium';
}

export function riskLabel(band: RiskBand): string {
  const keys: Record<RiskBand, string> = {
    low: 'risk.low',
    medium: 'risk.medium',
    high: 'risk.high',
  };
  return keys[band];
}
