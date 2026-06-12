/**
 * Natural-language command bar types.
 * @see POST /api/admin/command, POST /api/admin/command/:id/undo, GET /api/admin/commands
 */

/** Result of executing a merchant command via the admin parser. */
export interface CommandResult {
  success: boolean;
  originalCommand?: string;
  result: string;
  parsedIntent: string;
  action?: string;
  confidence: number;
  verifiedUplift?: number;
  timestamp?: string;
  requiresApproval?: boolean;
  riskBand?: 'low' | 'medium' | 'high';
  commandId?: string;
  undoable?: boolean;
  undoExpiresAt?: string;
}

/** Request body for POST /api/admin/command */
export interface ExecuteCommandRequest {
  command: string;
}

/** Row from GET /api/admin/commands */
export interface CommandHistoryItem {
  id: string;
  command: string;
  result: string;
  intent: string;
  confidence: number;
  createdAt: string;
}

/** Response from POST /api/admin/command/:id/undo */
export interface UndoCommandResponse {
  success: boolean;
  commandId: string;
  message: string;
  intent?: string;
}
