import {
  CodegenCompileInput,
  CodegenCompileResult,
  CodegenCompilerPort,
} from '../../application/ports/CodegenCompilerPort';
import { ArtifactStorePort } from '../../application/ports/ArtifactStorePort';
import {
  APPENDIX_H_ABOUT_TREE,
  APPENDIX_H_CONTACT_TREE,
  APPENDIX_H_COPY_NL,
  APPENDIX_H_HOME_TREE,
  APPENDIX_H_LEGAL_TREE,
  APPENDIX_H_PDP_TREE,
  APPENDIX_H_PLAN,
  APPENDIX_H_PRODUCTS_TREE,
  APPENDIX_H_TOKENS,
  APPENDIX_H_TREES_BY_TEMPLATE,
  expandToCompilableSitePlan,
  emitAppendixHTokensJson,
  brandNameFromBrief,
} from './appendixHFixtures';
import { pathToTreeFileName } from './defaultSitePlan';
import { parseSitePlanOrThrow } from './sitePlanSchema';

export {
  APPENDIX_H_ABOUT_TREE,
  APPENDIX_H_CONTACT_TREE,
  APPENDIX_H_COPY_NL,
  APPENDIX_H_HOME_TREE,
  APPENDIX_H_LEGAL_TREE,
  APPENDIX_H_PDP_TREE,
  APPENDIX_H_PLAN,
  APPENDIX_H_PRODUCTS_TREE,
  APPENDIX_H_TOKENS,
  APPENDIX_H_TREES_BY_TEMPLATE,
};

/**
 * P02 stub compiler — thin wrapper; prefer AllowlistCodegenCompiler (P05) in compositionRoot.
 * Kept for unit tests that pin Appendix H constants.
 */
export class AllowlistCodegenCompilerStub implements CodegenCompilerPort {
  constructor(private readonly artifacts?: ArtifactStorePort) {}

  validate(input: Pick<CodegenCompileInput, 'briefJson' | 'planJson'>): unknown {
    return parseSitePlanOrThrow(expandToCompilableSitePlan(input.briefJson, input.planJson));
  }

  async compile(input: CodegenCompileInput): Promise<CodegenCompileResult> {
    const brandName = brandNameFromBrief(input.briefJson);
    const plan = parseSitePlanOrThrow(expandToCompilableSitePlan(input.briefJson, input.planJson));
    const colors = plan.tokens?.colors ?? {};
    const tokensJson = emitAppendixHTokensJson(
      typeof colors.primary === 'string' ? colors.primary : APPENDIX_H_TOKENS.color.primary,
      typeof colors.accent === 'string' ? colors.accent : APPENDIX_H_TOKENS.color.accent
    );

    const pages = plan.pages.map((page, index) => ({
      path: page.path,
      title: page.title,
      sortOrder: page.sortOrder ?? index,
      seoJson: page.seo ?? {},
      treeJson: page.tree,
    }));

    const artifactsPath = this.artifacts
      ? this.artifacts.resolveRoot(input.revisionId)
      : `revisions/${input.revisionId}`;

    if (this.artifacts) {
      const planJson =
        input.planJson &&
        typeof input.planJson === 'object' &&
        input.planJson !== null &&
        Object.keys(input.planJson as object).length > 0
          ? input.planJson
          : {
              ...APPENDIX_H_PLAN,
              brand: { ...APPENDIX_H_PLAN.brand, name: brandName },
            };
      await this.artifacts.write(
        input.revisionId,
        'plan.json',
        JSON.stringify(planJson, null, 2)
      );
      await this.artifacts.write(
        input.revisionId,
        'tokens.json',
        JSON.stringify(tokensJson, null, 2)
      );
      for (const page of pages) {
        await this.artifacts.write(
          input.revisionId,
          `pages/${pathToTreeFileName(page.path)}.tree.json`,
          JSON.stringify(page.treeJson, null, 2)
        );
      }
    }

    return { artifactsPath, pages, tokensJson };
  }
}
