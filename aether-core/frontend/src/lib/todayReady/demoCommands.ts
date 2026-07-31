import type { DemoIntentId } from '../localIntentMatcher';
import type { TodayReadyInsightId } from './types';

/** Maps overview insight cards to demo commands for re-activation */
export function insightIdToDemoCommand(id: TodayReadyInsightId): {
  command: string;
  intentId: DemoIntentId;
} | null {
  switch (id) {
    case 'pricing':
      return {
        command: 'Optimaliseer mijn prijzen deze week',
        intentId: 'PRICING_OPTIMIZATION',
      };
    case 'supplier':
      return { command: 'Check leveranciers op prijsdalingen', intentId: 'SUPPLIER_CHECK' };
    case 'approvals':
      return { command: 'Toon high-risk goedkeuringen', intentId: 'HIGH_RISK_APPROVALS' };
    case 'margins':
      return { command: 'Toon marge per categorie', intentId: 'MARGIN_INSIGHT' };
    case 'autonomous':
      return {
        command: 'Voer low-risk prijsaanpassingen automatisch uit',
        intentId: 'AUTONOMOUS_ACTION',
      };
    case 'returns':
      return { command: 'Toon orders met hoge retourkans', intentId: 'RETURN_RISK_ORDERS' };
    case 'summary':
      return {
        command: 'Hoe presteert mijn business deze week?',
        intentId: 'BUSINESS_SUMMARY',
      };
    default:
      return null;
  }
}
