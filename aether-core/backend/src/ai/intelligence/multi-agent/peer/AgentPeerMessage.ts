import crypto from 'crypto';
import type { AgentPeerMessage } from '../types';

export const PEER_INTEL_PREFIX = 'peer-intel:';

export function createCorrelationId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function buildPeerQuery(message: AgentPeerMessage): string {
  const lines = [message.summary];
  if (message.payload && Object.keys(message.payload).length > 0) {
    lines.push(`${PEER_INTEL_PREFIX}${JSON.stringify(message.payload)}`);
  }
  return lines.join('\n\n');
}

export function parsePeerContext(query: string): AgentPeerMessage | null {
  const intelIdx = query.indexOf(PEER_INTEL_PREFIX);
  if (intelIdx === -1) {
    const trimmed = query.trim();
    if (!trimmed) return null;
    return { messageType: 'request', summary: trimmed };
  }

  const summary = query.slice(0, intelIdx).trim();
  const jsonPart = query.slice(intelIdx + PEER_INTEL_PREFIX.length).trim();
  try {
    const payload = JSON.parse(jsonPart) as Record<string, unknown>;
    const messageType =
      payload.messageType === 'intel' ||
      payload.messageType === 'request' ||
      payload.messageType === 'notify'
        ? payload.messageType
        : 'intel';
    const { messageType: _mt, correlationId, ...rest } = payload;
    return {
      messageType,
      summary: summary || 'Peer message',
      payload: Object.keys(rest).length > 0 ? rest : undefined,
      correlationId: typeof correlationId === 'string' ? correlationId : undefined,
    };
  } catch {
    return { messageType: 'request', summary: query.trim() };
  }
}

export function peerContextToChainLine(message: AgentPeerMessage): string {
  return `${PEER_INTEL_PREFIX}${JSON.stringify({
    messageType: message.messageType,
    summary: message.summary,
    payload: message.payload,
    correlationId: message.correlationId,
  })}`;
}

export function summarizePayloadForAudit(message?: AgentPeerMessage): string | undefined {
  if (!message) return undefined;
  const parts = [message.summary];
  if (message.messageType) parts.unshift(`[${message.messageType}]`);
  if (message.correlationId) parts.push(`corr:${message.correlationId}`);
  if (message.payload) {
    const payloadStr = JSON.stringify(message.payload);
    parts.push(payloadStr.slice(0, 400));
  }
  return parts.join(' ').slice(0, 500);
}
