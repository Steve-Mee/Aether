// src/api/routes/command/types.ts
export type ActionType =
  | 'UPDATE_PRICE'
  | 'UPDATE_INVENTORY'
  | 'SYNC_SUPPLIER'
  | 'SEND_MAIL_REPLY'
  | 'CREATE_PROMOTION'
  | 'ADJUST_STOCK';

export interface ProposedAction {
  type: ActionType;
  payload: Record<string, any>;
}

export interface CommandResult {
  id: string;
  type: 'insight' | 'action';
  title: string;
  description: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  proposedAction?: ProposedAction;
  module: string;
}

export interface ProcessCommandRequest {
  query: string;
}
export interface ExecuteCommandRequest {
  actionId: string;
  proposedAction: ProposedAction;
  approvedByHuman?: boolean;
}