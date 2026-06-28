import { env } from '@/lib/config';
import type { LogContext, LogEntry, LogLevel } from './types';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[env.logLevel];
}

function formatEntry(entry: LogEntry): string {
  if (env.isProd) {
    return JSON.stringify(entry);
  }
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  const err = entry.error ? ` | ${entry.error.name}: ${entry.error.message}` : '';
  return `[AETHER] ${entry.level.toUpperCase()} ${entry.message}${ctx}${err}`;
}

function write(level: LogLevel, message: string, context?: LogContext, err?: unknown): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  if (err instanceof Error) {
    entry.error = {
      name: err.name,
      message: err.message,
      stack: env.isDev ? err.stack : undefined,
    };
  }

  const line = formatEntry(entry);
  switch (level) {
    case 'debug':
      console.debug(line);
      break;
    case 'info':
      console.info(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'error':
      console.error(line);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext, err?: unknown) =>
    write('warn', message, context, err),
  error: (message: string, context?: LogContext, err?: unknown) =>
    write('error', message, context, err),
};
