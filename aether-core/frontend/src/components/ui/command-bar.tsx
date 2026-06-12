import * as React from 'react';
import { ArrowRight, Mic, MicOff, Sparkles } from 'lucide-react';
import { cn, focusRing } from '@/lib/utils';
import { Button } from './Button';
import { Spinner } from './loading';
import { Input } from '@/components/shadcn/input';

export interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  intentPill?: React.ReactNode;
  suggestions?: React.ReactNode;
  responseSlot?: React.ReactNode;
  idleHint?: React.ReactNode;
  micActive?: boolean;
  onMicToggle?: () => void;
  voiceSupported?: boolean;
  onPaletteOpen?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  onInputKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  suggestionsExpanded?: boolean;
  suggestionsId?: string;
  activeDescendantId?: string;
  /** Stable accessible name for the combobox input */
  inputAriaLabel?: string;
  /** Screen-reader description for rotating placeholder (wired via aria-describedby) */
  rotatingHintText?: string;
  className?: string;
  variant?: 'default' | 'hero';
  inputFocused?: boolean;
  voiceStatus?: string;
}

/**
 * Presentational command input shell for NL-first merchant actions.
 * Compose with page-specific intent matching and suggestion data.
 *
 * @example
 * <CommandBar value={cmd} onChange={setCmd} onSubmit={handleSubmit} placeholder="Zeg wat je wilt…" />
 */
export function CommandBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Zeg wat je wilt — AETHER voert uit met minimale wrijving',
  loading = false,
  disabled = false,
  intentPill,
  suggestions,
  responseSlot,
  idleHint,
  micActive = false,
  onMicToggle,
  voiceSupported = false,
  onPaletteOpen,
  inputRef,
  onInputFocus,
  onInputBlur,
  onInputKeyDown,
  suggestionsExpanded = false,
  suggestionsId = 'command-suggestions',
  activeDescendantId,
  inputAriaLabel = 'Natuurlijke taal opdracht',
  rotatingHintText,
  className,
  variant = 'default',
  inputFocused = false,
  voiceStatus,
}: CommandBarProps) {
  const isHero = variant === 'hero';
  const idleHintId = React.useId();
  const inputDescribedBy =
    idleHint || rotatingHintText
      ? [idleHint ? idleHintId : null, rotatingHintText ? 'command-idle-hint' : null]
          .filter(Boolean)
          .join(' ') || undefined
      : undefined;
  return (
    <section className={cn('mb-10 w-full', isHero && 'mb-12', className)} aria-label="Command Bar">
      <form onSubmit={onSubmit} className="relative w-full">
        <div
          className={cn(
            'relative w-full rounded-2xl border border-border/35',
            'bg-gradient-to-b from-card/50 to-card/25 backdrop-blur-md',
            'transition-all duration-normal ring-1 ring-white/[0.04]',
            'focus-within:border-primary/30 focus-within:ring-primary/25',
            'focus-within:shadow-glow-focus motion-safe:focus-within:scale-[1.002]',
            isHero
              ? 'min-h-[96px] sm:min-h-[100px] focus-within:shadow-glow-focus'
              : 'min-h-[88px] sm:min-h-[92px]',
            isHero && inputFocused && 'border-primary/25 shadow-glow-focus/50',
          )}
        >
          <div
            className={cn(
              'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 px-5 py-5 sm:px-6',
              isHero && 'sm:px-7 sm:py-6',
            )}
          >
            {onPaletteOpen && (
              <button
                type="button"
                onClick={onPaletteOpen}
                className={cn(
                  'hidden sm:inline-flex items-center gap-1.5 shrink-0 rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-fast',
                  focusRing(),
                  isHero && inputFocused && 'text-primary/80',
                )}
                aria-label="Command palette"
              >
                <Sparkles
                  size={16}
                  strokeWidth={1.75}
                  className={cn(isHero && inputFocused && 'motion-safe:animate-pulse')}
                />
                <kbd className="text-[10px] font-mono text-muted-foreground/55 px-1.5 py-0.5 rounded border border-border/40 bg-background/30">
                  ⌘K
                </kbd>
              </button>
            )}
            <Input
              ref={inputRef}
              role="combobox"
              aria-autocomplete="list"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              onKeyDown={onInputKeyDown}
              placeholder={placeholder}
              disabled={loading || disabled}
              aria-label={inputAriaLabel}
              aria-describedby={inputDescribedBy}
              aria-expanded={suggestionsExpanded}
              aria-controls={suggestionsId}
              aria-activedescendant={activeDescendantId}
              className={cn(
                'flex-1 border-0 bg-transparent font-normal tracking-tight shadow-none focus-visible:ring-0 placeholder:text-muted-foreground',
                isHero
                  ? 'h-12 sm:h-[3.25rem] text-base sm:text-xl'
                  : 'h-12 sm:h-14 text-base sm:text-lg',
              )}
            />
            <div className="flex items-center gap-1.5 sm:shrink-0 sm:pl-1">
              {voiceSupported && onMicToggle && (
                <div className="relative">
                  {micActive && (
                    <span
                      className="absolute inset-0 rounded-full motion-safe:animate-ping bg-destructive/20"
                      aria-hidden
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onMicToggle}
                    aria-label={micActive ? 'Stop opname' : 'Spraak invoer'}
                    className={cn(
                      'relative h-10 w-10 rounded-full text-muted-foreground transition-colors duration-fast hover:bg-muted/50',
                      micActive && 'text-destructive ring-2 ring-destructive/30',
                    )}
                  >
                    {micActive ? (
                      <MicOff size={18} strokeWidth={1.75} />
                    ) : (
                      <Mic size={18} strokeWidth={1.75} />
                    )}
                  </Button>
                </div>
              )}
              <Button
                type="submit"
                size="icon"
                disabled={loading || disabled || !value.trim()}
                className={cn(
                  'h-10 w-10 sm:h-11 sm:w-11 rounded-full shrink-0 bg-primary/90',
                  'hover:bg-primary hover:shadow-glow-focus transition-all duration-fast',
                  'motion-safe:active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
                )}
                aria-label="Versturen"
              >
                {loading ? (
                  <Spinner
                    size="sm"
                    className="text-primary-foreground [&_svg]:text-primary-foreground"
                  />
                ) : (
                  <ArrowRight size={18} strokeWidth={2} />
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {voiceStatus && (
        <p className="sr-only" aria-live="polite">
          {voiceStatus}
        </p>
      )}

      {intentPill && (
        <div className="mt-3 flex items-center gap-2 animate-fade-in">{intentPill}</div>
      )}

      {rotatingHintText && (
        <p id="command-idle-hint" className="sr-only">
          {rotatingHintText}
        </p>
      )}

      {idleHint &&
        (typeof idleHint === 'string' ? (
          <p
            id={idleHintId}
            className="mt-2 text-xs text-caption-accessible leading-relaxed px-0.5"
          >
            {idleHint}
          </p>
        ) : (
          <div id={idleHintId}>{idleHint}</div>
        ))}

      {suggestions && (
        <div
          id={suggestionsId}
          data-testid={suggestionsId}
          className={cn(
            'mt-3 transition-all duration-normal',
            suggestionsExpanded
              ? 'rounded-2xl border border-border/25 bg-card/30 backdrop-blur-sm p-3 sm:p-4 animate-fade-in'
              : 'overflow-x-auto pb-1 -mx-1 px-1',
          )}
          role="listbox"
          aria-label="Slimme suggesties"
        >
          {suggestions}
        </div>
      )}

      {responseSlot}
    </section>
  );
}

export default CommandBar;
