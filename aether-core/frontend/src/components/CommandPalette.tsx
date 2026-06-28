import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import React from 'react';
import { useCommand } from '../lib/CommandContext';
import AgentBadge from '@/components/command/AgentBadge';
import HandoffChainRail from '@/components/command/HandoffChainRail';
import { useDashboard } from '../lib/DashboardContext';
import { toUserMessage } from '../lib/api/errors';
import { showErrorToast } from '../lib/toast';
import { getTopContextualCommands } from '../lib/commandSuggestionContext';
import { SUGGESTED_COMMANDS } from '../lib/intentNavigation';
import { t } from '../lib/i18n';
import { ConfidenceChip, Dialog, DialogContent, DialogTitle } from '@/components/ui';
import { getPaletteReturnFocus } from '@/lib/stores/uiStore';
import { cn, focusRing } from '@/lib/utils';

const PALETTE_LISTBOX_ID = 'command-palette-listbox';

export default function CommandPalette() {
  const { paletteOpen, closePalette, executeCommand, loading, history, streaming, streamActiveAgentKeys, streamHandoffChain, streamChainFrom } =
    useCommand();
  const { data: dashboard } = useDashboard();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const contextualTop = useMemo(
    () =>
      getTopContextualCommands({ dashboard, todayReady: [], settings: undefined }, 3).map((c) => ({
        label: c.label,
        command: c.command,
      })),
    [dashboard],
  );

  const baseCommands = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...contextualTop, ...SUGGESTED_COMMANDS];
    return merged.filter((c) => {
      if (seen.has(c.command)) return false;
      seen.add(c.command);
      return true;
    });
  }, [contextualTop]);

  const filtered = baseCommands.filter(
    (c) =>
      !query.trim() ||
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.command.toLowerCase().includes(query.toLowerCase()),
  );

  const items =
    query.trim().length > 0
      ? [{ label: query.trim(), command: query.trim() }, ...filtered]
      : baseCommands;

  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setSelected(0);
    }
  }, [paletteOpen]);

  const run = async (command: string) => {
    try {
      await executeCommand(command);
      closePalette();
    } catch (err) {
      showErrorToast(toUserMessage(err));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && items[selected]) {
      e.preventDefault();
      void run(items[selected].command);
    } else if (e.key === 'Escape') {
      closePalette();
    }
  };

  const activeDescendantId = items[selected] ? `palette-option-${selected}` : undefined;

  return (
    <Dialog open={paletteOpen} onOpenChange={(open) => !open && closePalette()}>
      <DialogContent
        className={cn(
          'left-1/2 top-[18%] max-w-xl translate-x-[-50%] translate-y-0 gap-0 p-0 overflow-hidden',
          '[&>button]:top-3 [&>button]:right-3',
        )}
        aria-describedby="command-palette-hint"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          getPaletteReturnFocus()?.focus();
        }}
      >
        <DialogTitle className="sr-only">{t('command.palette.title')}</DialogTitle>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
          <Sparkles size={18} className="text-primary shrink-0" strokeWidth={1.75} aria-hidden />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={items.length > 0}
            aria-controls={PALETTE_LISTBOX_ID}
            aria-activedescendant={activeDescendantId}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t('command.placeholder')}
            aria-label={t('command.palette.title')}
            className={cn(
              'flex-1 bg-transparent text-foreground placeholder:text-caption-accessible',
              'outline-none text-sm tracking-tight',
              focusRing(),
            )}
          />
          <kbd className="hidden sm:inline text-caption text-muted-foreground px-2 py-1 rounded-lg border border-border/40 bg-muted/30">
            Esc
          </kbd>
        </div>

        <ul
          id={PALETTE_LISTBOX_ID}
          role="listbox"
          aria-label={t('command.palette.title')}
          className="max-h-72 overflow-auto py-2"
        >
          {items.map((item, i) => (
            <li key={`${item.command}-${i}`}>
              <button
                type="button"
                id={`palette-option-${i}`}
                role="option"
                aria-selected={i === selected}
                className={cn(
                  'w-full text-left px-4 py-3 flex items-center gap-3 text-sm',
                  'transition-all duration-fast',
                  focusRing(),
                  i === selected
                    ? 'bg-primary/15 text-foreground motion-safe:translate-x-0.5'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                )}
                onClick={() => void run(item.command)}
                disabled={loading}
              >
                <Search size={14} className="text-muted-foreground shrink-0" aria-hidden />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div
          id="command-palette-hint"
          className="px-4 py-2 border-t border-border/40 text-caption text-muted-foreground"
        >
          {t('command.palette.hint')}
        </div>

        {history[0] && (
          <div
            className="px-4 py-3 border-t border-border/40 bg-card/50"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-caption text-muted-foreground mb-1">
              {t('command.palette.lastResult')}
            </p>
            {(streaming && streamActiveAgentKeys.length > 0) || history[0].brain?.specialist || history[0].brain?.agents ? (
              <div className="flex flex-col gap-2 mb-2">
                {streaming && streamHandoffChain.length > 0 && (
                  <HandoffChainRail chain={streamHandoffChain} />
                )}
                <div className="flex flex-wrap items-center gap-2">
                {streaming && streamActiveAgentKeys.length > 0 ? (
                  streamActiveAgentKeys.map((key) => (
                    <AgentBadge
                      key={key}
                      agentKey={key}
                      delegatedFrom="admin"
                      chainFrom={streamChainFrom ?? undefined}
                    />
                  ))
                ) : (
                  (history[0].brain?.agents?.length
                    ? history[0].brain.agents
                    : history[0].brain?.specialist
                      ? [history[0].brain.specialist]
                      : []
                  ).map((agent) => (
                    <AgentBadge
                      key={`${agent.agentKey}-${agent.specialistRunId ?? 'result'}`}
                      agentKey={agent.agentKey}
                      delegatedFrom={agent.delegatedFrom}
                    />
                  ))
                )}
                </div>
              </div>
            ) : null}
            <p className="text-sm text-success">{history[0].result}</p>
            <ConfidenceChip confidence={history[0].confidence} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
