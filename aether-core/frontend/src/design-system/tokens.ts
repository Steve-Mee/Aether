/** TypeScript mirror of CSS design tokens for programmatic use. */
export const spacing = {
  1: 'var(--space-1)',
  2: 'var(--space-2)',
  3: 'var(--space-3)',
  4: 'var(--space-4)',
  5: 'var(--space-5)',
  6: 'var(--space-6)',
  8: 'var(--space-8)',
  10: 'var(--space-10)',
  12: 'var(--space-12)',
} as const;

export const radius = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
} as const;

export const typography = {
  display: 'var(--text-display)',
  headline: 'var(--text-headline)',
  title: 'var(--text-title)',
  body: 'var(--text-body)',
  meta: 'var(--text-meta)',
  caption: 'var(--text-caption)',
} as const;

export const motion = {
  fast: 'var(--transition-fast)',
  normal: 'var(--transition-normal)',
  slow: 'var(--transition-slow)',
} as const;

export const shadows = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  elevated: 'var(--shadow-elevated)',
  insight: 'var(--shadow-insight)',
  focus: 'var(--shadow-focus)',
  glowFocus: 'var(--shadow-glow-focus)',
} as const;
