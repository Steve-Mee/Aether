export interface CodegenPageArtifact {
  path: string;
  title: string;
  seoJson: unknown;
  treeJson: unknown;
  sortOrder: number;
}

export interface CodegenCompileInput {
  tenantId: string;
  revisionId: string;
  briefJson: unknown;
  planJson: unknown;
}

export interface CodegenCompileResult {
  artifactsPath: string;
  pages: CodegenPageArtifact[];
  tokensJson: unknown;
}

/**
 * Plan + trees → artifacts; enforces allowlisted block types (P05).
 */
export interface CodegenCompilerPort {
  /**
   * Pure validation / normalize. Throws CodegenRejectedError on invalid plan/trees.
   * Optional — CreateRevision validates via compile() when absent.
   */
  validate?(input: Pick<CodegenCompileInput, 'briefJson' | 'planJson'>): unknown;
  compile(input: CodegenCompileInput): Promise<CodegenCompileResult>;
}
