export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  domain?: string;
  path?: string;
  kind?: string;
  status?: number;
  key?: unknown;
  boundary?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: { name: string; message: string; stack?: string };
  timestamp: string;
}
