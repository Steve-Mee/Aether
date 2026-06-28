import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';

const PLACEHOLDER_KEYS = [
  'commandCenter.placeholder.examples.compound',
  'commandCenter.placeholder.examples.compound2',
  'commandCenter.placeholder.examples.pricing',
  'commandCenter.placeholder.examples.supplier',
  'commandCenter.placeholder.examples.today',
  'commandCenter.placeholder.examples.margin',
  'commandCenter.placeholder.examples.summary',
] as const;

const ROTATE_MS = 6000;

export function useRotatingPlaceholder(enabled: boolean): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % PLACEHOLDER_KEYS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled) {
    return t('cockpit.subtitle');
  }
  return t(PLACEHOLDER_KEYS[index]!);
}
