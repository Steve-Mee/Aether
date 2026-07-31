export function toolForIntent(intent: string): string {
  switch (intent) {
    case 'PRICE_UPDATE':
      return 'updatePrice';
    case 'SUPPLIER_MONITOR':
      return 'syncSupplier';
    case 'RESTOCK_SUGGEST':
      return 'suggestRestock';
    case 'APPROVE_CHANGES':
      return 'createApproval';
    default:
      return intent.toLowerCase();
  }
}
