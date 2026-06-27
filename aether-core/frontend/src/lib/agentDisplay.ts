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
    case 'admin':
      return 'AETHER';
    default:
      return agentKey;
  }
}
