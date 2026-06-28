import { useIsFetching } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

/** Subtle background-sync indicator when any query is fetching. */
export default function SyncIndicator() {
  const fetching = useIsFetching();

  if (fetching === 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-caption text-muted-foreground',
        'motion-safe:animate-pulse',
      )}
      aria-live="polite"
      aria-label="Synchroniseren"
      data-testid="sync-indicator"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary/80" aria-hidden />
      <span className="hidden sm:inline">Sync</span>
    </span>
  );
}
