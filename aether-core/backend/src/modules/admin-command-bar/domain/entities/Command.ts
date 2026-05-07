export interface Command {
  id: string;
  naturalLanguage: string;
  intent: string;
  action: string | null;
  confidence: number;
  executedAt: Date;
  result?: any;
}