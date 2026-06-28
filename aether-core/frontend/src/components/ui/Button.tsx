import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Primary action control. Use `primary` for main CTAs, `secondary` for alternatives,
 * `ghost` for tertiary actions, `danger` for destructive ops, `premium` for subtle glass CTAs.
 *
 * @example
 * <Button variant="primary" size="md">Save</Button>
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-safe:active:scale-[0.985]',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-none hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground border border-border hover:bg-muted',
        ghost: 'hover:bg-secondary text-muted-foreground hover:text-foreground',
        danger: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-none',
        premium:
          'bg-foreground/5 text-foreground border border-border/60 hover:bg-foreground/[0.08]',
        success: 'bg-success text-success-foreground hover:opacity-90 shadow-none',
        outline: 'border border-border/60 bg-transparent hover:bg-secondary/80',
      },
      size: {
        sm: 'h-9 rounded-lg px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 rounded-xl px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
