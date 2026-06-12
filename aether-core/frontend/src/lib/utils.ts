import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Standard keyboard focus ring for interactive controls. */
export function focusRing(className?: string) {
  return cn('focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]', className);
}

/** Subtle hover/active motion for clickable cards (Command Center, metrics). */
export function interactiveSurface(className?: string) {
  return cn(
    'transition-all duration-fast ease-out motion-safe:hover:-translate-y-px motion-safe:hover:shadow-elevated',
    'motion-safe:active:translate-y-0 motion-safe:active:scale-[0.995]',
    focusRing('focus-visible:ring-2 focus-visible:ring-primary/30'),
    className,
  );
}
