import { env } from '@/lib/config';
import { useEffect, useRef } from 'react';
import { nextLiveDemoScenario, runLiveDemoScenario } from './scenarios';

const FIRST_DELAY_MS = 12_000;
const MIN_INTERVAL_MS = 14_000;
const MAX_INTERVAL_MS = 18_000;

function isLiveDemoEnabled(): boolean {
  if (
    typeof window !== 'undefined' &&
    (window as unknown as { __AETHER_DISABLE_LIVE_DEMO__?: boolean }).__AETHER_DISABLE_LIVE_DEMO__
  ) {
    return false;
  }
  return env.liveDemo;
}

function randomInterval(): number {
  return MIN_INTERVAL_MS + Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS));
}

export default function LiveDemoOrchestrator() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isLiveDemoEnabled()) return;

    const scheduleNext = (delay: number) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          scheduleNext(randomInterval());
          return;
        }
        const scenario = nextLiveDemoScenario();
        runLiveDemoScenario(scenario);
        scheduleNext(randomInterval());
      }, delay);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !startedRef.current) {
        startedRef.current = true;
        scheduleNext(FIRST_DELAY_MS);
      }
    };

    if (document.visibilityState === 'visible') {
      startedRef.current = true;
      scheduleNext(FIRST_DELAY_MS);
    } else {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
