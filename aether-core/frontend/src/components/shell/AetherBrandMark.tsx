import { cn } from '@/lib/utils';

export type BrandMarkSize = 'sm' | 'md';

const sizeClasses: Record<BrandMarkSize, { box: string; letter: string }> = {
  sm: { box: 'w-8 h-8 rounded-lg', letter: 'text-lg font-bold' },
  md: { box: 'w-9 h-9 rounded-lg', letter: 'text-xl font-bold' },
};

interface AetherBrandMarkProps {
  size?: BrandMarkSize;
  className?: string;
}

/** Consistent AETHER logo mark across sidebar, top bar, and mobile shell. */
export default function AetherBrandMark({ size = 'sm', className }: AetherBrandMarkProps) {
  const s = sizeClasses[size];
  return (
    <div
      className={cn(
        'bg-primary flex items-center justify-center shrink-0',
        'motion-safe:transition-transform motion-safe:duration-fast',
        s.box,
        className,
      )}
      aria-hidden
    >
      <span className={cn('text-primary-foreground', s.letter)}>A</span>
    </div>
  );
}
