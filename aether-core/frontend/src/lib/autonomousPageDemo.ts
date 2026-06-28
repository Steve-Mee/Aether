export interface AutonomousDecisionRowDemo {
  id: string;
  type: string;
  result: string;
  rationale: string | null;
  createdAt: string;
}

export function getAutonomousDemoDecisions(): AutonomousDecisionRowDemo[] {
  const now = Date.now();
  return [
    {
      id: 'auto_demo_1',
      type: 'price_adjustment',
      result: 'applied',
      rationale: 'Margin within policy; competitor index stable.',
      createdAt: new Date(now - 1800_000).toISOString(),
    },
    {
      id: 'auto_demo_2',
      type: 'email_reply',
      result: 'gated',
      rationale: 'Medium-risk return — routed to approvals.',
      createdAt: new Date(now - 7200_000).toISOString(),
    },
    {
      id: 'auto_demo_3',
      type: 'supplier_sync',
      result: 'applied',
      rationale: 'Scheduled sync completed; 2 price changes detected.',
      createdAt: new Date(now - 86400_000).toISOString(),
    },
  ];
}
