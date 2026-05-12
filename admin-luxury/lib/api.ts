// lib/api.ts
// Clean, production-ready API client for AETHER Admin Command Center

const API_BASE = process.env.NEXT_PUBLIC_AETHER_API_URL || 'http://localhost:3000/api';

export interface CommandResult {
  id: string;
  type: 'insight' | 'action' | 'module';
  title: string;
  description: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  proposedAction?: {
    type: string;
    payload: any;
  };
  module: string;
}

export interface ExecuteResponse {
  success: boolean;
  message: string;
  executedActionId?: string;
}

export async function processNaturalLanguageCommand(query: string): Promise<CommandResult[]> {
  const res = await fetch(`${API_BASE}/command/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Command processing failed: ${res.statusText}`);
  return res.json();
}

export async function executeProposedAction(actionId: string, payload: any): Promise<ExecuteResponse> {
  const res = await fetch(`${API_BASE}/command/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionId, payload }),
  });
  if (!res.ok) throw new Error(`Action execution failed: ${res.statusText}`);
  return res.json();
}