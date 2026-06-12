/** Merchant-facing labels for audit/command actions (shared feed + explainability). */
export const ACTION_LABELS: Record<string, string> = {
  email_processed: 'E-mail verwerkt',
  email_rolled_back: 'E-mail teruggedraaid',
  'email.auto_reply': 'Automatisch antwoord verzonden',
  action_executed: 'Goedgekeurde actie uitgevoerd',
  autonomy_observe: 'Observatie (inkomend bericht)',
  autonomy_decide: 'Beslissing (autonomie-kern)',
  autonomy_approve: 'Goedkeuring vereist',
  autonomy_execute: 'Autonoom uitgevoerd',
  autonomy_measure: 'Meting vastgelegd',
  mail_approval_required_received: 'Goedkeuring aangevraagd',
  approved: 'Goedgekeurd',
  rejected: 'Afgewezen',
  command_executed: 'NL-commando uitgevoerd',
  price_adjusted: 'Prijsaanpassing',
  payment_processed: 'Betaling verwerkt',
  outcome_verified_with_evidence: 'Uitkomst geverifieerd',
  negotiation_started: 'Onderhandeling gestart',
  supplier_price_changed_received: 'Leveranciersprijs gewijzigd',
  approval_policy_updated: 'Goedkeuringsbeleid bijgewerkt',
  truth_review_completed: 'Truth review voltooid',
  'ui.navigation': 'Navigatie',
};

export function labelForAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.startsWith('autonomy_')) {
    const stage = action.replace('autonomy_', '');
    return `Autonomie: ${stage}`;
  }
  return action.replace(/_/g, ' ');
}
