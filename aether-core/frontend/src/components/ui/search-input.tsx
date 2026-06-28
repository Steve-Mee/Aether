import * as React from 'react';
import { Search } from 'lucide-react';
import { cn, focusRing } from '@/lib/utils';

export interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  className?: string;
  wrapperClassName?: string;
  /** Visible or screen-reader-only label text */
  label?: string;
  /** Hide label visually (still associated via htmlFor) */
  labelSrOnly?: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, wrapperClassName, label, labelSrOnly = true, id: idProp, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = idProp ?? autoId;

    return (
      <div className={cn('relative flex-1', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              labelSrOnly && 'sr-only',
              !labelSrOnly && 'text-sm font-medium mb-1.5 block',
            )}
          >
            {label}
          </label>
        )}
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-caption-accessible pointer-events-none"
          aria-hidden
        />
        <input
          ref={ref}
          id={inputId}
          type="search"
          className={cn(
            'w-full rounded-xl border border-border/40 bg-card/50 py-2.5 pl-10 pr-4',
            'text-sm text-foreground placeholder:text-caption-accessible',
            'transition-[border-color,box-shadow] duration-fast',
            focusRing(
              'focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:shadow-[var(--shadow-glow-focus)]',
            ),
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
SearchInput.displayName = 'SearchInput';

export default SearchInput;
