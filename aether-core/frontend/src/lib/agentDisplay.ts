export function agentBadgeClass(agentKey: string): string {
  switch (agentKey) {
    case 'mail':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25';
    case 'supplier':
      return 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25';
    case 'pricing':
      return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/25';
    case 'inventory':
      return 'bg-violet-500/15 text-violet-800 dark:text-violet-300 border-violet-500/25';
    case 'customer':
      return 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/25';
    case 'forecast':
      return 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/25';
    case 'approvals':
      return 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/25';
    case 'outcomes':
      return 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/25';
    case 'negotiation':
      return 'bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-300 border-fuchsia-500/25';
    case 'promotion':
      return 'bg-pink-500/15 text-pink-800 dark:text-pink-300 border-pink-500/25';
    case 'catalog':
      return 'bg-lime-500/15 text-lime-800 dark:text-lime-300 border-lime-500/25';
    case 'autonomy':
      return 'bg-slate-500/15 text-slate-800 dark:text-slate-300 border-slate-500/25';
    case 'workflow_supervisor':
      return 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/25';
    case 'global-advisory':
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25';
    default:
      return 'bg-primary/10 text-primary border-primary/20';
  }
}

export function agentDisplayLabel(agentKey: string): string {
  switch (agentKey) {
    case 'mail':
      return 'Mail Agent';
    case 'supplier':
      return 'Supplier Agent';
    case 'pricing':
      return 'Pricing Agent';
    case 'inventory':
      return 'Inventory Agent';
    case 'customer':
      return 'Customer Insights Agent';
    case 'forecast':
      return 'Forecast Agent';
    case 'approvals':
      return 'Approvals Agent';
    case 'outcomes':
      return 'Outcomes Agent';
    case 'negotiation':
      return 'Negotiation Agent';
    case 'promotion':
      return 'Promotion Agent';
    case 'catalog':
      return 'Product Catalog Agent';
    case 'autonomy':
      return 'Autonomy Agent';
    case 'workflow_supervisor':
      return 'Workflow Supervisor';
    case 'global-advisory':
      return 'Global Advisory';
    case 'admin':
      return 'AETHER';
    default:
      return agentKey;
  }
}

export function formatAgentKeysLabel(agentKeys: string): string {
  return agentKeys
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => agentDisplayLabel(k))
    .join(', ');
}

export function agentWorkingLabel(agentKey: string, workingSuffix: string): string {
  const label = agentKey.includes(',') ? formatAgentKeysLabel(agentKey) : agentDisplayLabel(agentKey);
  return `${label} ${workingSuffix}`;
}

export function agentHandoffLabel(fromKey: string, toKey: string, arrow: string): string {
  return `${agentDisplayLabel(fromKey)} ${arrow} ${agentDisplayLabel(toKey)}`;
}

export function humanizeHandoffReason(reason: string): string {
  if (!reason) return '';
  if (reason.startsWith('chain:')) {
    const intent = reason.slice('chain:'.length);
    return `Overgedragen voor ${intent.replace(/_/g, ' ').toLowerCase()}`;
  }
  if (reason.startsWith('peer:')) {
    return `Peer-delegatie: ${reason.slice('peer:'.length)}`;
  }
  if (reason.startsWith('collaboration:')) {
    return `Samenwerking: ${reason.slice('collaboration:'.length).replace(/-/g, ' ')}`;
  }
  if (reason === 'global-advisory' || reason.includes('Federated')) {
    return 'Federated globaal advies';
  }
  if (reason.startsWith('async:')) {
    return `Async taak: ${reason.slice('async:'.length)}`;
  }
  return reason;
}

export function executionModeLabel(mode: 'single' | 'sequential' | 'parallel'): string {
  switch (mode) {
    case 'sequential':
      return 'Sequentieel';
    case 'parallel':
      return 'Parallel';
    default:
      return 'Enkel agent';
  }
}
