import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Sparkles } from 'lucide-react';
import React from 'react';
import { useCommand } from '../../lib/CommandContext';
import { t } from '../../lib/i18n';
import Button from '../ui/Button';
import CommandInput from '../ui/CommandInput';
import CommandResultCard from './CommandResultCard';

export default function NaturalLanguageBar() {
  const { executeCommand, lastResult, loading, error, openPalette } = useCommand();
  const [command, setCommand] = useState('');
  const [listening, setListening] = useState(false);
  const [optimistic, setOptimistic] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    const cmd = command.trim();
    setCommand('');
    setOptimistic(true);
    try {
      await executeCommand(cmd);
    } finally {
      setOptimistic(false);
    }
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

  const showLoading = loading || optimistic;

  return (
    <div className="max-w-5xl mx-auto space-y-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={openPalette}
          className="hidden sm:flex items-center gap-2 text-[var(--color-intent)] shrink-0 focus-visible:shadow-[var(--shadow-focus)] rounded-lg px-1"
          aria-label={t('command.palette.title')}
        >
          <Sparkles size={20} />
          <span className="font-semibold tracking-[3px] text-sm">AETHER</span>
          <kbd className="text-[10px] text-[var(--color-text-subtle)] px-1.5 py-0.5 rounded bg-[var(--color-surface-elevated)] ml-1">
            ⌘K
          </kbd>
        </button>
        <CommandInput
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={t('command.placeholder')}
          aria-label={t('command.placeholder')}
          disabled={showLoading}
        />
        {voiceSupported && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={toggleVoice}
            aria-label={listening ? 'Stop opname' : 'Spraak invoer'}
            className={listening ? 'text-[var(--color-danger)]' : ''}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </Button>
        )}
        <Button type="submit" disabled={showLoading || !command.trim()} aria-label={t('command.submit')} className="px-4 sm:px-8">
          {showLoading ? '…' : <Send size={18} />}
        </Button>
      </form>
      {lastResult && (
        <div className="px-2" role="status">
          <CommandResultCard result={lastResult} />
        </div>
      )}
      {error && (
        <p className="text-sm text-[var(--color-danger)] px-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
