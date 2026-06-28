import type { ExplainabilityBuildContext, ExplainabilityContributor } from '../types';

/** Registers collective / global brain snippets used during a run. */
export class GlobalBrainContributor implements ExplainabilityContributor {
  constructor(
    private collectiveSnippetCount: number,
    private message?: string
  ) {}

  contribute(ctx: ExplainabilityBuildContext) {
    if (this.collectiveSnippetCount > 0) {
      ctx.dataSources.push({
        kind: 'global_brain',
        label: `Globaal brein (${this.collectiveSnippetCount} patroon${this.collectiveSnippetCount === 1 ? '' : 'en'})`,
      });
    }
    if (this.message) {
      ctx.globalKnowledge = {
        message: this.message,
        snippetCount: this.collectiveSnippetCount,
      };
    }
    return {};
  }
}

/** Registers personal brain / RAG recall matches. */
export class RetrievalContributor implements ExplainabilityContributor {
  constructor(
    private snippets: string[],
    private matches?: Array<{ score: number }>
  ) {}

  contribute(ctx: ExplainabilityBuildContext) {
    if (this.snippets.length === 0) return {};
    const sources = this.snippets.slice(0, 10).map((snippet, i) => ({
      kind: 'rag' as const,
      label: `Kennisfragment ${i + 1}`,
      preview: snippet,
      score: this.matches?.[i]?.score,
    }));
    return { dataSources: sources };
  }
}
