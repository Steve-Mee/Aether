import {
  CodegenCompileInput,
  CodegenCompileResult,
  CodegenCompilerPort,
  CodegenPageArtifact,
} from '../../application/ports/CodegenCompilerPort';
import { ArtifactStorePort } from '../../application/ports/ArtifactStorePort';
import {
  emitAppendixHTokensJson,
  expandToCompilableSitePlan,
} from './appendixHFixtures';
import { CodegenRejectedError } from './CodegenRejectedError';
import { pathToTreeFileName } from './defaultSitePlan';
import {
  DesignTokens,
  SitePlan,
  parseSitePlanOrThrow,
} from './sitePlanSchema';
import { tokensToCss } from './tokensCss';

const QA_REPORT_PLACEHOLDER = {
  status: 'pending',
  checks: [] as unknown[],
  note: 'QA pending — StartBuild writes structural build checks (CWV not measured in Birth)',
} as const;

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Allowlisted SitePlan → revision artifacts compiler.
 *
 * Security:
 * - Unknown block types → CODEGEN_REJECTED
 * - Nested non-allowlisted / nested Page → CODEGEN_REJECTED
 * - overrides/* refused in v1 (clear error; no TSX eval/AST path)
 *
 * Appendix H template-only plans are expanded to embedded trees before Zod validate.
 */
export class AllowlistCodegenCompiler implements CodegenCompilerPort {
  constructor(private readonly artifacts: ArtifactStorePort) {}

  validate(input: Pick<CodegenCompileInput, 'briefJson' | 'planJson'>): SitePlan {
    return this.resolvePlan(input.briefJson, input.planJson);
  }

  async compile(input: CodegenCompileInput): Promise<CodegenCompileResult> {
    if (!input.tenantId?.trim()) {
      throw new CodegenRejectedError('tenantId is required for codegen');
    }
    if (!input.revisionId?.trim()) {
      throw new CodegenRejectedError('revisionId is required for codegen');
    }

    const plan = this.resolvePlan(input.briefJson, input.planJson);
    const tokens = (plan.tokens ?? {}) as DesignTokens;
    const primary =
      tokens.colors?.primary ?? tokens.primary ?? '#3D2B1F';
    const accent = tokens.colors?.accent ?? tokens.accent ?? '#C4A484';
    const tokensJson = emitAppendixHTokensJson(primary, accent);
    const tokensCss = tokensToCss(tokens);

    const pages: CodegenPageArtifact[] = plan.pages.map((page, index) => ({
      path: page.path,
      title: page.title,
      seoJson: page.seo ?? {},
      treeJson: page.tree,
      sortOrder: page.sortOrder ?? index,
    }));

    const revisionId = input.revisionId;
    const artifactsPath = this.artifacts.resolveRoot(revisionId);

    await this.artifacts.write(revisionId, 'plan.json', stableJson(plan));
    await this.artifacts.write(revisionId, 'tokens.json', stableJson(tokensJson));
    await this.artifacts.write(revisionId, 'tokens.css', tokensCss);
    await this.artifacts.write(revisionId, 'qa-report.json', stableJson(QA_REPORT_PLACEHOLDER));

    for (const page of pages) {
      const fileBase = pathToTreeFileName(page.path);
      await this.artifacts.write(
        revisionId,
        `pages/${fileBase}.tree.json`,
        stableJson(page.treeJson)
      );
    }

    const copy = plan.copy ?? {};
    const locales =
      plan.locales && plan.locales.length > 0
        ? plan.locales
        : [plan.localeDefault];

    for (const locale of locales) {
      const localeCopy = copy[locale] ?? { locale };
      const fileKey = locale.split('-')[0] || locale;
      await this.artifacts.write(
        revisionId,
        `copy/${fileKey}.json`,
        stableJson(localeCopy)
      );
    }

    // Explicit refusal surface if callers sneak overrides past Zod (defense in depth)
    if (plan.overrides && Object.keys(plan.overrides).length > 0) {
      throw new CodegenRejectedError(
        'overrides/*.tsx are not supported in v1 — remove overrides from SitePlan',
        { overrides: Object.keys(plan.overrides) }
      );
    }

    return { artifactsPath, pages, tokensJson };
  }

  private resolvePlan(briefJson: unknown, planJson: unknown): SitePlan {
    const expanded = expandToCompilableSitePlan(briefJson, planJson);
    try {
      return parseSitePlanOrThrow(expanded);
    } catch (err) {
      if (err instanceof CodegenRejectedError) throw err;
      throw new CodegenRejectedError((err as Error).message);
    }
  }
}
