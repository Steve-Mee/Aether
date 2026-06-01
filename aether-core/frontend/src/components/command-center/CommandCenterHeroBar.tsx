import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Mic, MicOff, Sparkles } from 'lucide-react';
import React from 'react';
import { useCommand } from '../../lib/CommandContext';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { cn } from '@/lib/utils';
import {
  buildDemoResponse,
  detectIntent,
  filterSuggestions,
  type DemoCommandResponse,
  type DemoIntentId,
  type DemoSuggestion,
} from '@/lib/localIntentMatcher';
import CommandDemoResponse from './CommandDemoResponse';
import { IntentPill, SuggestionButton } from './primitives';

const PLACEHOLDER = 'Zeg wat je wilt — AETHER voert uit met minimale wrijving';
const DEMO_DELAY_MS = 650;

export default function CommandCenterHeroBar() {
  const { openPalette } = useCommand();
  const [command, setCommand] = useState('');
  const [listening, setListening] = useState(false);
  const [focused, setFocused] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<DemoCommandResponse | null>(null);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const detected = useMemo(() => detectIntent(command), [command]);
  const suggestions = useMemo(() => filterSuggestions(command, 5), [command]);
  const showSuggestions = focused || command.length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const runDemo = useCallback(async (text: string, intentOverride?: DemoIntentId) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setDemoLoading(true);
    setDemoResult(null);
    setActiveSuggestionId(null);

    await new Promise((r) => setTimeout(r, DEMO_DELAY_MS));

    const response = buildDemoResponse(trimmed, intentOverride);
    setDemoResult(response);
    setDemoLoading(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || demoLoading) return;
    const cmd = command.trim();
    await runDemo(cmd);
    setCommand('');
  };

  const handleSuggestionClick = async (suggestion: DemoSuggestion) => {
    setCommand(suggestion.command);
    setActiveSuggestionId(suggestion.id);
    inputRef.current?.focus();
    await runDemo(suggestion.command, suggestion.intentId);
  };

  const toggleVoice = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) return;
    if (listening) {
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'nl-NL';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setCommand(transcript);
    };
    recognition.start();
  };

  const voiceSupported =
    typeof window !== 'undefined' &&
    (!!(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      !!(window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  return (
    <section className="mb-10 w-full" aria-label="Command Bar">
      <form onSubmit={handleSubmit} className="relative w-full">
        <div
          className={cn(
            'relative w-full min-h-[88px] sm:min-h-[92px] rounded-2xl border border-border/35',
            'bg-gradient-to-b from-card/50 to-card/25 backdrop-blur-md',
            'transition-all duration-200 ring-1 ring-white/[0.04]',
            'focus-within:border-primary/30 focus-within:ring-primary/25',
            'focus-within:shadow-[var(--shadow-glow-focus)]'
          )}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 px-5 py-5 sm:px-6">
            <button
              type="button"
              onClick={openPalette}
              className="hidden sm:inline-flex items-center gap-1.5 shrink-0 rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-200"
              aria-label="Command palette"
            >
              <Sparkles size={16} strokeWidth={1.75} />
              <kbd className="text-[10px] font-mono text-muted-foreground/55 px-1.5 py-0.5 rounded border border-border/40 bg-background/30">
                ⌘K
              </kbd>
            </button>
            <Input
              ref={inputRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder={PLACEHOLDER}
              disabled={demoLoading}
              aria-label={PLACEHOLDER}
              aria-expanded={showSuggestions}
              aria-controls="command-suggestions"
              className="h-12 sm:h-14 flex-1 border-0 bg-transparent text-base sm:text-lg font-normal tracking-tight shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
            />
            <div className="flex items-center gap-1.5 sm:shrink-0 sm:pl-1">
              {voiceSupported && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleVoice}
                  aria-label={listening ? 'Stop opname' : 'Spraak invoer'}
                  className={cn(
                    'h-10 w-10 rounded-full text-muted-foreground transition-colors duration-200',
                    'hover:bg-muted/50',
                    listening && 'text-destructive'
                  )}
                >
                  {listening ? <MicOff size={18} strokeWidth={1.75} /> : <Mic size={18} strokeWidth={1.75} />}
                </Button>
              )}
              <Button
                type="submit"
                size="icon"
                disabled={demoLoading || !command.trim()}
                className={cn(
                  'h-10 w-10 sm:h-11 sm:w-11 rounded-full shrink-0 bg-primary/90',
                  'hover:bg-primary hover:shadow-[var(--shadow-glow-focus)] transition-all duration-200'
                )}
                aria-label="Versturen"
              >
                {demoLoading ? (
                  <span className="text-sm animate-pulse">…</span>
                ) : (
                  <ArrowRight size={18} strokeWidth={2} />
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {(command.length > 0 || focused) && detected.confidence > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Intent
          </span>
          <IntentPill label={detected.label} confidence={detected.confidence} />
        </div>
      )}

      {showSuggestions && (
        <div
          id="command-suggestions"
          className="mt-3 rounded-2xl border border-border/25 bg-card/30 backdrop-blur-sm p-3 sm:p-4"
          role="listbox"
          aria-label="Slimme suggesties"
        >
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2.5 px-0.5">
            Slimme suggesties
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.map((s) => (
              <SuggestionButton
                key={s.id}
                label={s.label}
                active={activeSuggestionId === s.id}
                onClick={() => void handleSuggestionClick(s)}
              />
            ))}
          </div>
        </div>
      )}

      {(demoLoading || demoResult) && (
        <CommandDemoResponse response={demoResult!} loading={demoLoading} />
      )}
    </section>
  );
}
