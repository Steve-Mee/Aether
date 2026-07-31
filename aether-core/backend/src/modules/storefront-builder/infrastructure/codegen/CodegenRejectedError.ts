/**
 * Thrown when SitePlan / page trees / overrides fail the allowlist compiler.
 * API maps this to error.code = CODEGEN_REJECTED.
 */
export class CodegenRejectedError extends Error {
  readonly code = 'CODEGEN_REJECTED' as const;

  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CodegenRejectedError';
  }
}
