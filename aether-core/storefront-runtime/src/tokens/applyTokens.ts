import type { CSSProperties } from 'react';

/**
 * Map site.tokens payload to CSS custom properties.
 * Aligns with backend tokensCss.ts — supports Appendix H shape
 * (`color` / `font` / `radius.md`) and normalized `colors` / `typography`.
 */
export function tokensToCssVars(
  tokens: Record<string, unknown> | null | undefined
): CSSProperties {
  if (!tokens || typeof tokens !== 'object') {
    return {};
  }

  const colors =
    tokens.colors && typeof tokens.colors === 'object'
      ? (tokens.colors as Record<string, unknown>)
      : {};
  const appendixColor =
    tokens.color && typeof tokens.color === 'object'
      ? (tokens.color as Record<string, unknown>)
      : {};

  const primary =
    str(colors.primary) ??
    str(tokens.primary) ??
    str(appendixColor.primary) ??
    undefined;
  const accent =
    str(colors.accent) ??
    str(tokens.accent) ??
    str(appendixColor.accent) ??
    undefined;
  const background =
    str(colors.background) ??
    str(tokens.background) ??
    str(appendixColor.bg) ??
    undefined;
  const foreground =
    str(colors.foreground) ??
    str(tokens.foreground) ??
    str(appendixColor.text) ??
    undefined;
  const muted = str(colors.muted) ?? str(tokens.muted) ?? undefined;

  const typography =
    tokens.typography && typeof tokens.typography === 'object'
      ? (tokens.typography as Record<string, unknown>)
      : {};
  const appendixFont =
    tokens.font && typeof tokens.font === 'object'
      ? (tokens.font as Record<string, unknown>)
      : {};
  const fontFamily =
    str(typography.fontFamily) ??
    str(appendixFont.display) ??
    str(appendixFont.body) ??
    undefined;
  const fontSizeBase = str(typography.fontSizeBase);

  const radius = resolveRadius(tokens.radius);

  const vars: Record<string, string> = {};
  if (primary) vars['--color-primary'] = primary;
  if (accent) vars['--color-accent'] = accent;
  if (background) vars['--color-background'] = background;
  if (foreground) vars['--color-foreground'] = foreground;
  if (muted) vars['--color-muted'] = muted;
  if (fontFamily) vars['--font-family'] = fontFamily;
  if (fontSizeBase) vars['--font-size-base'] = fontSizeBase;
  if (radius) vars['--radius'] = radius;

  const scale =
    typography.scale && typeof typography.scale === 'object'
      ? (typography.scale as Record<string, unknown>)
      : null;
  if (scale) {
    for (const [key, value] of Object.entries(scale)) {
      const v = str(value);
      if (v) vars[`--font-size-${key}`] = v;
    }
  }

  const spacing =
    tokens.spacing && typeof tokens.spacing === 'object'
      ? (tokens.spacing as Record<string, unknown>)
      : null;
  if (spacing) {
    for (const [key, value] of Object.entries(spacing)) {
      if (typeof value === 'number') {
        vars[`--spacing-${key}`] = `${value}px`;
      } else {
        const v = str(value);
        if (v) vars[`--spacing-${key}`] = v;
      }
    }
  }

  return vars as CSSProperties;
}

function resolveRadius(radius: unknown): string | undefined {
  if (radius === undefined || radius === null) return undefined;
  if (typeof radius === 'number') return `${radius}px`;
  if (typeof radius === 'string') return radius;
  if (
    typeof radius === 'object' &&
    typeof (radius as { md?: unknown }).md === 'string'
  ) {
    return (radius as { md: string }).md;
  }
  return undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
