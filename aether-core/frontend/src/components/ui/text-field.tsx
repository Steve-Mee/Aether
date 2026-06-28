import * as React from 'react';
import { cn, focusRing } from '@/lib/utils';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const fieldBase = cn(
  'w-full rounded-xl border border-border/40 bg-card/50 px-3 py-2.5',
  'text-sm text-foreground placeholder:text-caption-accessible',
  'transition-[border-color,box-shadow] duration-fast',
  focusRing(
    'focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:shadow-[var(--shadow-glow-focus)]',
  ),
);

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={cn(fieldBase, className)} {...props} />
  ),
);
TextField.displayName = 'TextField';

export default TextField;
