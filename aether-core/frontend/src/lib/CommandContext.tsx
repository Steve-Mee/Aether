import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from './api';
import { routeForIntent } from './intentNavigation';
import React from 'react';

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
}

interface CommandContextValue {
  executeCommand: (command: string) => Promise<CommandResult>;
  lastResult: CommandResult | null;
  loading: boolean;
  error: string | null;
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  history: CommandResult[];
}

const CommandContext = createContext<CommandContextValue | null>(null);

export function CommandProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [history, setHistory] = useState<CommandResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const executeCommand = useCallback(
    async (command: string): Promise<CommandResult> => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<CommandResult>('/api/admin/command', {
          method: 'POST',
          body: JSON.stringify({ command: command.trim() }),
        });
        setLastResult(data);
        setHistory((prev) => [data, ...prev].slice(0, 20));
        const route = routeForIntent(data.parsedIntent);
        if (route) navigate(route);
        return data;
      } catch (err) {
        const msg = String(err instanceof Error ? err.message : err);
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  return (
    <CommandContext.Provider
      value={{
        executeCommand,
        lastResult,
        loading,
        error,
        paletteOpen,
        openPalette: () => setPaletteOpen(true),
        closePalette: () => setPaletteOpen(false),
        history,
      }}
    >
      {children}
    </CommandContext.Provider>
  );
}

export function useCommand(): CommandContextValue {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error('useCommand must be used within CommandProvider');
  return ctx;
}
