/**
 * Blob/FS store for per-revision storefront artifacts.
 */
export interface ArtifactStorePort {
  /** Absolute or logical root path for a revision's artifacts. */
  resolveRoot(revisionId: string): string;
  write(revisionId: string, relativePath: string, content: string | Buffer): Promise<string>;
  read(revisionId: string, relativePath: string): Promise<Buffer | null>;
  list(revisionId: string, prefix?: string): Promise<string[]>;
}
