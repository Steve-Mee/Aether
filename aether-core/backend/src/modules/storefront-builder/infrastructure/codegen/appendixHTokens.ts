import { APPENDIX_H_TOKENS } from './appendixHData';

/** Design-token object accepted by sitePlanSchema + tokensToCss. */
export function appendixHTokensToDesignTokens(
  primary: string = APPENDIX_H_TOKENS.color.primary,
  accent: string = APPENDIX_H_TOKENS.color.accent
) {
  return {
    primary,
    accent,
    background: APPENDIX_H_TOKENS.color.bg,
    foreground: APPENDIX_H_TOKENS.color.text,
    muted: '#6b6b6b',
    colors: {
      primary,
      accent,
      background: APPENDIX_H_TOKENS.color.bg,
      foreground: APPENDIX_H_TOKENS.color.text,
      muted: '#6b6b6b',
    },
    typography: {
      fontFamily: APPENDIX_H_TOKENS.font.display,
      fontSizeBase: '16px',
    },
    radius: APPENDIX_H_TOKENS.radius.md,
    // Appendix H emit aliases (normative artifact shape)
    color: {
      primary,
      accent,
      bg: APPENDIX_H_TOKENS.color.bg,
      text: APPENDIX_H_TOKENS.color.text,
    },
    font: { ...APPENDIX_H_TOKENS.font },
  };
}

/** Normalize Appendix H `{ color, font, radius.md }` or design-token shapes for Zod. */
export function normalizeTokensInput(
  tokensFromPlan: unknown,
  primaryFallback: string,
  accentFallback: string
): Record<string, unknown> {
  if (!tokensFromPlan || typeof tokensFromPlan !== 'object') {
    return appendixHTokensToDesignTokens(primaryFallback, accentFallback);
  }

  const raw = tokensFromPlan as Record<string, unknown>;
  const color = raw.color as Record<string, unknown> | undefined;
  const hasAppendixShape = color && typeof color === 'object';

  if (hasAppendixShape) {
    const primary =
      (typeof color.primary === 'string' && color.primary) ||
      (typeof raw.primary === 'string' && raw.primary) ||
      primaryFallback;
    const accent =
      (typeof color.accent === 'string' && color.accent) ||
      (typeof raw.accent === 'string' && raw.accent) ||
      accentFallback;
    return appendixHTokensToDesignTokens(primary, accent);
  }

  // Already design-token shaped — coerce radius object if present
  const radius =
    typeof raw.radius === 'object' &&
    raw.radius !== null &&
    typeof (raw.radius as { md?: unknown }).md === 'string'
      ? (raw.radius as { md: string }).md
      : raw.radius;

  return {
    ...appendixHTokensToDesignTokens(
      typeof raw.primary === 'string'
        ? raw.primary
        : typeof (raw.colors as { primary?: string } | undefined)?.primary === 'string'
          ? (raw.colors as { primary: string }).primary
          : primaryFallback,
      typeof raw.accent === 'string'
        ? raw.accent
        : typeof (raw.colors as { accent?: string } | undefined)?.accent === 'string'
          ? (raw.colors as { accent: string }).accent
          : accentFallback
    ),
    ...raw,
    ...(radius !== undefined ? { radius } : {}),
  };
}

/** Emit tokens.json in Appendix H shape (+ flat aliases for public resolve). */
export function emitAppendixHTokensJson(
  primary: string = APPENDIX_H_TOKENS.color.primary,
  accent: string = APPENDIX_H_TOKENS.color.accent
): Record<string, unknown> {
  return {
    color: {
      primary,
      accent,
      bg: APPENDIX_H_TOKENS.color.bg,
      text: APPENDIX_H_TOKENS.color.text,
    },
    font: { ...APPENDIX_H_TOKENS.font },
    radius: { ...APPENDIX_H_TOKENS.radius },
    primary,
    accent,
    background: APPENDIX_H_TOKENS.color.bg,
    foreground: APPENDIX_H_TOKENS.color.text,
  };
}
