import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { registerLiveAnnouncers } from '@/lib/a11y/announceBus';

interface LiveAnnouncerContextValue {
  announce: (message: string) => void;
  announceAssertive: (message: string) => void;
}

const LiveAnnouncerContext = createContext<LiveAnnouncerContextValue | null>(null);

function useResetAnnounce(setter: (value: string) => void) {
  return useCallback(
    (next: string) => {
      setter('');
      requestAnimationFrame(() => setter(next));
    },
    [setter],
  );
}

export function LiveAnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useResetAnnounce(setMessage);
  const announceAssertive = useResetAnnounce(setAssertiveMessage);

  useEffect(
    () => registerLiveAnnouncers(announce, announceAssertive),
    [announce, announceAssertive],
  );

  const value = useMemo(() => ({ announce, announceAssertive }), [announce, announceAssertive]);

  return (
    <LiveAnnouncerContext.Provider value={value}>
      {children}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {message}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {assertiveMessage}
      </div>
    </LiveAnnouncerContext.Provider>
  );
}

export function useLiveAnnouncer(): LiveAnnouncerContextValue {
  const ctx = useContext(LiveAnnouncerContext);
  if (!ctx) {
    return { announce: () => {}, announceAssertive: () => {} };
  }
  return ctx;
}
