import { toast } from 'sonner';
import { announceAssertive } from '@/lib/a11y/announceBus';

/**
 * Toast policy:
 * - showCalmToast / showErrorToast → transient feedback for mutations & actions (save, resolve, undo)
 * - AsyncBoundary + ErrorState → recoverable load failures (no duplicate toast on load errors)
 * - Notification panel → persistent inbox for action-severity events
 */
export type CalmToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface CalmToastOptions {
  variant?: CalmToastVariant;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

const DEBOUNCE_MS = 3000;
const lastToastKeyAt = new Map<string, number>();

function toastKey(variant: CalmToastVariant, title: string): string {
  return `${variant}:${title}`;
}

export function showCalmToast(options: CalmToastOptions): void {
  const variant = options.variant ?? 'info';
  const key = toastKey(variant, options.title);
  const now = Date.now();
  const last = lastToastKeyAt.get(key) ?? 0;
  if (now - last < DEBOUNCE_MS) return;
  lastToastKeyAt.set(key, now);

  const { title, description, action } = options;
  const toastFn =
    variant === 'success'
      ? toast.success
      : variant === 'warning'
        ? toast.warning
        : variant === 'error'
          ? toast.error
          : toast.message;

  toastFn(title, {
    description,
    action: action
      ? {
          label: action.label,
          onClick: action.onClick,
        }
      : undefined,
    duration: variant === 'error' ? 6000 : 4500,
  });
}

export function showErrorToast(title: string, description?: string): void {
  showCalmToast({ variant: 'error', title, description });
  announceAssertive(description ? `${title}. ${description}` : title);
}
