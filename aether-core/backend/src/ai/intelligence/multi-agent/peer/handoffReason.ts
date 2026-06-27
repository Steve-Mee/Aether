/** Human-readable handoff reason labels (backend + shared semantics). */
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
  if (reason === 'global-advisory') {
    return 'Federated globaal advies';
  }
  if (reason.startsWith('federated-sandbox:')) {
    return `Federated sandbox: ${reason.slice('federated-sandbox:'.length).replace(/-/g, ' ')}`;
  }
  if (reason.startsWith('async:')) {
    return `Async taak: ${reason.slice('async:'.length)}`;
  }
  return reason;
}

export function buildChainHandoffReason(intent: string): string {
  return `chain:${intent}`;
}

export function buildPeerHandoffReason(summary: string): string {
  return `peer:${summary}`;
}
