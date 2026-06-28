const AGENT_LABELS: Record<string, string> = {
  admin: 'AETHER',
  pricing: 'Prijs-agent',
  supplier: 'Leverancier-agent',
  inventory: 'Voorraad-agent',
  mail: 'Mail-agent',
  customer: 'Klant-agent',
  forecast: 'Forecast-agent',
  approvals: 'Goedkeuringen-agent',
  outcomes: 'Outcomes-agent',
  negotiation: 'Onderhandeling-agent',
  promotion: 'Promotie-agent',
  workflow_supervisor: 'Workflow-supervisor',
  catalog: 'Catalogus-agent',
  autonomy: 'Autonomie-agent',
};

export function agentExplainLabel(agentKey: string): string {
  return AGENT_LABELS[agentKey] ?? `${agentKey.charAt(0).toUpperCase()}${agentKey.slice(1)}-agent`;
}
