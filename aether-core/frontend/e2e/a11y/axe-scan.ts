import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/** Core merchant routes scanned in CI (strict axe gate). */
export const A11Y_CORE_ROUTES = [
  '/',
  '/command-center',
  '/approvals',
  '/insights',
  '/timeline',
  '/suppliers',
  '/settings',
  '/emails',
  '/products',
] as const;

/** Deep module routes (extended coverage, report-only until promoted). */
export const A11Y_DEEP_ROUTES = ['/login'] as const;

export const A11Y_ROUTES = [...A11Y_CORE_ROUTES, ...A11Y_DEEP_ROUTES] as const;

export type A11yRoute = (typeof A11Y_ROUTES)[number];

export interface AxeViolationSummary {
  id: string;
  impact: string | null;
  description: string;
  help: string;
  nodes: number;
}

export interface AxeViolationNodeDetail {
  html: string;
  failureSummary: string;
  target: string;
}

export interface AxeViolationDetailed extends AxeViolationSummary {
  nodeDetails: AxeViolationNodeDetail[];
}

export async function scanPageA11y(page: Page): Promise<AxeViolationSummary[]> {
  const detailed = await scanPageA11yDetailed(page);
  return detailed.map(({ nodeDetails: _nodeDetails, ...summary }) => summary);
}

export async function scanPageA11yDetailed(page: Page): Promise<AxeViolationDetailed[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  return results.violations
    .map((v) => ({
      id: v.id,
      impact: v.impact ?? null,
      description: v.description,
      help: v.help,
      nodes: v.nodes.length,
      nodeDetails: v.nodes.slice(0, 5).map((n) => ({
        html: n.html.slice(0, 120),
        failureSummary: n.failureSummary ?? '',
        target: n.target.join(' > '),
      })),
    }))
    .sort((a, b) => {
      const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      const aScore = impactOrder[a.impact as keyof typeof impactOrder] ?? 4;
      const bScore = impactOrder[b.impact as keyof typeof impactOrder] ?? 4;
      return aScore - bScore;
    });
}

export function isSeriousOrCritical(v: AxeViolationSummary): boolean {
  return v.impact === 'critical' || v.impact === 'serious';
}

export function formatViolationsReport(route: string, violations: AxeViolationSummary[]): string {
  if (violations.length === 0) {
    return `## ${route}\n\nNo WCAG 2.1 AA violations detected.\n`;
  }
  const lines = violations.map(
    (v) =>
      `- **${v.id}** (${v.impact ?? 'unknown'}, ${v.nodes} node(s)): ${v.help}`
  );
  return `## ${route}\n\n${lines.join('\n')}\n`;
}

export function formatDetailedViolationsReport(
  route: string,
  violations: AxeViolationDetailed[]
): string {
  if (violations.length === 0) {
    return `## ${route}\n\nNo WCAG 2.1 AA violations detected.\n`;
  }

  const sections = violations.map((v) => {
    const nodeLines = v.nodeDetails.map(
      (n) =>
        `  - \`${n.target.slice(0, 80)}\`${n.failureSummary ? `\n    ${n.failureSummary.replace(/\n/g, ' ')}` : ''}`
    );
    return `- **${v.id}** (${v.impact}, ${v.nodes} node(s)): ${v.help}\n${nodeLines.join('\n')}`;
  });

  return `## ${route}\n\n${sections.join('\n\n')}\n`;
}
