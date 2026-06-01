import { useEffect, useRef, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import React from 'react';
import { useCommand } from '../lib/CommandContext';
import { SUGGESTED_COMMANDS } from '../lib/intentNavigation';
import { t } from '../lib/i18n';
import { ConfidenceChip } from './ui/RiskBadge';

export default function CommandPalette() {
  const { paletteOpen, closePalette, openPalette, executeCommand, loading, history } = useCommand();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = SUGGESTED_COMMANDS.filter(
    (c) =>
      !query.trim() ||
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.command.toLowerCase().includes(query.toLowerCase())
  );

  const items =
    query.trim().length > 0
      ? [{ label: query.trim(), command: query.trim() }, ...filtered]
      : filtered;

  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [paletteOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, closePalette, openPalette]);

  if (!paletteOpen) return null;

  const run = async (command: string) => {
    closePalette();
    await executeCommand(command);
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
      run(items[selected].command);
    } else if (e.key === 'Escape') {
      closePalette();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[80]" onClick={closePalette} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('command.palette.title')}
        className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-2xl z-[90] overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <Sparkles size={18} className="text-purple-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t('command.placeholder')}
            aria-label={t('command.placeholder')}
            className="flex-1 bg-transparent text-white placeholder-[var(--color-text-subtle)] outline-none text-sm focus-visible:shadow-none"
          />
          <kbd className="hidden sm:inline text-xs text-[var(--color-text-subtle)] px-2 py-1 rounded bg-[var(--color-surface-elevated)]">Esc</kbd>
        </div>

        <ul role="listbox" className="max-h-72 overflow-auto py-2">
          {items.map((item, i) => (
            <li key={`${item.command}-${i}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === selected}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-colors ${
                  i === selected ? 'bg-purple-600/20 text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]'
                }`}
                onClick={() => run(item.command)}
                disabled={loading}
              >
                <Search size={14} className="text-[var(--color-text-subtle)] shrink-0" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="px-4 py-2 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-subtle)]">
          {t('command.palette.hint')}
        </div>

        {history[0] && (
          <div className="px-4 py-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg)]/50">
            <p className="text-xs text-[var(--color-text-subtle)] mb-1">Laatste resultaat</p>
            <p className="text-sm text-emerald-400">{history[0].result}</p>
            <ConfidenceChip confidence={history[0].confidence} />
          </div>
        )}
      </div>
    </>
  );
}
