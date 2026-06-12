import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { adminRepository } from '@/lib/data';
import { env } from '@/lib/config/env';
import {
  getRelevantContextSuggestions,
  type SuggestionBuildInput,
} from '@/lib/commandSuggestionContext';
import {
  detectIntent,
  groupSuggestionsByCategory,
  mergeAndRankSuggestions,
  shouldShowIntentPill,
  type DemoIntentId,
  type DemoIntentMatch,
  type DemoSuggestion,
} from '@/lib/localIntentMatcher';
import { useAetherQuery } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';

export interface UseSmartCommandInputOptions {
  contextInput: SuggestionBuildInput;
  onIntentChange?: (intentId: DemoIntentId | null) => void;
  /** Keep suggestion panel expanded (e.g. after UNKNOWN response) */
  forceSuggestionsOpen?: boolean;
  suggestionLimit?: number;
  /** Prefix for suggestion option DOM ids (must match CommandSuggestionsList) */
  suggestionsIdPrefix?: string;
}

export function useSmartCommandInput({
  contextInput,
  onIntentChange,
  forceSuggestionsOpen = false,
  suggestionLimit = 6,
  suggestionsIdPrefix = 'suggestion',
}: UseSmartCommandInputOptions) {
  const [command, setCommand] = useState('');
  const [debouncedCommand, setDebouncedCommand] = useState('');
  const [listening, setListening] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [keyboardIndex, setKeyboardIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { pathname } = useLocation();

  const {
    data: apiSuggestions,
    isLoading: suggestionsLoading,
    error: suggestionsError,
  } = useAetherQuery(
    queryKeys.suggestions(pathname),
    () => adminRepository.suggestions(pathname, 12),
    {
      staleTime: 60_000,
      enabled: env.isLiveMode,
      meta: { domain: 'commands', handled: true },
    },
  );

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedCommand(command), 50);
    return () => window.clearTimeout(id);
  }, [command]);

  const detected: DemoIntentMatch = useMemo(() => detectIntent(command), [command]);
  const isActive = forceSuggestionsOpen || focused || command.length > 0;

  const nowRelevant = useMemo(() => {
    if (!isActive) return [];
    if (apiSuggestions?.nowRelevant?.length) {
      return apiSuggestions.nowRelevant as DemoSuggestion[];
    }
    return getRelevantContextSuggestions(contextInput, 2);
  }, [isActive, contextInput, apiSuggestions]);

  const suggestions = useMemo(
    () => mergeAndRankSuggestions(debouncedCommand, contextInput, suggestionLimit),
    [debouncedCommand, contextInput, suggestionLimit],
  );

  const suggestionsForKeyboard = useMemo(() => {
    if (nowRelevant.length === 0) return suggestions;
    const ids = new Set(nowRelevant.map((s) => s.id));
    return [...nowRelevant, ...suggestions.filter((s) => !ids.has(s.id))].slice(0, suggestionLimit);
  }, [nowRelevant, suggestions, suggestionLimit]);

  const suggestionGroups = useMemo(() => {
    if (!isActive) return null;
    const relevantIds = new Set(nowRelevant.map((s) => s.id));
    const rest = suggestions.filter((s) => !relevantIds.has(s.id));
    return groupSuggestionsByCategory(rest);
  }, [suggestions, isActive, nowRelevant]);

  const showIntentPill = command.length > 0 && shouldShowIntentPill(detected);

  useEffect(() => {
    setKeyboardIndex(-1);
  }, [command, isActive]);

  useEffect(() => {
    if (command.length === 0) {
      onIntentChange?.(null);
      return;
    }
    if (shouldShowIntentPill(detected)) {
      onIntentChange?.(detected.id);
    }
  }, [command, detected, onIntentChange]);

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

  const activeDescendantId =
    keyboardIndex >= 0 && suggestionsForKeyboard[keyboardIndex]
      ? `${suggestionsIdPrefix}-${suggestionsForKeyboard[keyboardIndex]!.id}`
      : undefined;

  const toggleVoice = useCallback(() => {
    type SpeechRecognitionCtor = new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      onresult:
        | ((event: {
            results: { [key: number]: { [key: number]: { transcript: string } } };
          }) => void)
        | null;
      start: () => void;
    };
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SpeechRecognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;

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
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setCommand(transcript);
    };
    recognition.start();
  }, [listening]);

  const voiceSupported =
    typeof window !== 'undefined' &&
    (!!(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      !!(window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  const createInputKeyDown = useCallback(
    (handlers: {
      onEscape?: () => void;
      onSuggestionSelect?: (suggestion: DemoSuggestion) => void;
    }) =>
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setCommand('');
          setKeyboardIndex(-1);
          handlers.onEscape?.();
          inputRef.current?.blur();
          return;
        }

        if (suggestionsForKeyboard.length === 0) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setKeyboardIndex((prev) => (prev + 1) % suggestionsForKeyboard.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setKeyboardIndex((prev) => (prev <= 0 ? suggestionsForKeyboard.length - 1 : prev - 1));
        } else if (e.key === 'Enter' && keyboardIndex >= 0) {
          e.preventDefault();
          const s = suggestionsForKeyboard[keyboardIndex];
          if (s) handlers.onSuggestionSelect?.(s);
        }
      },
    [keyboardIndex, suggestionsForKeyboard],
  );

  return {
    command,
    setCommand,
    inputRef,
    detected,
    showIntentPill,
    isActive,
    focused,
    setFocused,
    nowRelevant,
    suggestions,
    suggestionsForKeyboard,
    suggestionGroups,
    keyboardIndex,
    activeSuggestionId,
    setActiveSuggestionId,
    activeDescendantId,
    listening,
    toggleVoice,
    voiceSupported,
    createInputKeyDown,
    suggestionsLoading,
    suggestionsError,
  };
}
