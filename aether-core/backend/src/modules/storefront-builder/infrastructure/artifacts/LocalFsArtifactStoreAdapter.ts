import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtifactStorePort } from '../../application/ports/ArtifactStorePort';

const DEFAULT_ARTIFACTS_DIR = path.join('tmp', 'storefront-artifacts');

export function resolveStorefrontArtifactsDir(
  env: NodeJS.ProcessEnv = process.env
): string {
  const configured = env.STOREFRONT_ARTIFACTS_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }
  return path.resolve(process.cwd(), DEFAULT_ARTIFACTS_DIR);
}

export interface LiveRevisionPointer {
  tenantId: string;
  projectId: string;
  revisionId: string;
  /** Absolute path to revision artifacts. */
  artifactsPath: string;
  /** Path relative to artifacts root, e.g. revisions/{revisionId} — for storefront-runtime. */
  servePath: string;
  updatedAt: string;
}

/**
 * Dev/local artifact store under STOREFRONT_ARTIFACTS_DIR (default tmp/storefront-artifacts).
 *
 * Layout:
 *   revisions/{revisionId}/...
 *   live/{tenantId}/{projectId}/revision.json  (+ CURRENT + optional artifacts symlink)
 */
export class LocalFsArtifactStoreAdapter implements ArtifactStorePort {
  constructor(private readonly rootDir: string = resolveStorefrontArtifactsDir()) {}

  getRootDir(): string {
    return this.rootDir;
  }

  resolveRoot(revisionId: string): string {
    return this.assertUnderRoot(
      path.resolve(this.rootDir, 'revisions', this.sanitizeId(revisionId))
    );
  }

  resolveLiveDir(tenantId: string, projectId: string): string {
    return this.assertUnderRoot(
      path.resolve(
        this.rootDir,
        'live',
        this.sanitizeId(tenantId),
        this.sanitizeId(projectId)
      )
    );
  }

  /**
   * Write live revision pointer for storefront-runtime (P09).
   * JSON is source of truth; symlink/junction is best-effort.
   */
  async writeLivePointer(input: {
    tenantId: string;
    projectId: string;
    revisionId: string;
  }): Promise<LiveRevisionPointer> {
    const revisionId = this.sanitizeId(input.revisionId);
    const artifactsPath = this.resolveRoot(revisionId);
    const liveDir = this.resolveLiveDir(input.tenantId, input.projectId);
    await fs.mkdir(liveDir, { recursive: true });

    const pointer: LiveRevisionPointer = {
      tenantId: input.tenantId,
      projectId: input.projectId,
      revisionId,
      artifactsPath,
      servePath: path.posix.join('revisions', revisionId),
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(
      path.join(liveDir, 'revision.json'),
      `${JSON.stringify(pointer, null, 2)}\n`
    );
    await fs.writeFile(path.join(liveDir, 'CURRENT'), `${revisionId}\n`);

    // Name must not collide with CURRENT on case-insensitive filesystems (Windows).
    const linkPath = path.join(liveDir, 'artifacts');
    try {
      await fs.rm(linkPath, { force: true, recursive: true });
      const linkType = process.platform === 'win32' ? 'junction' : 'dir';
      await fs.symlink(artifactsPath, linkPath, linkType);
    } catch {
      // Pointer JSON remains authoritative when symlinks are unavailable.
    }

    return pointer;
  }

  async readLivePointer(
    tenantId: string,
    projectId: string
  ): Promise<LiveRevisionPointer | null> {
    const fullPath = path.join(this.resolveLiveDir(tenantId, projectId), 'revision.json');
    try {
      const raw = await fs.readFile(fullPath, 'utf8');
      return JSON.parse(raw) as LiveRevisionPointer;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
      throw err;
    }
  }

  async write(revisionId: string, relativePath: string, content: string | Buffer): Promise<string> {
    const safeRel = this.sanitizeRelativePath(relativePath);
    const fullPath = this.assertUnderRoot(path.resolve(this.resolveRoot(revisionId), safeRel));
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    return fullPath;
  }

  async read(revisionId: string, relativePath: string): Promise<Buffer | null> {
    const safeRel = this.sanitizeRelativePath(relativePath);
    const fullPath = this.assertUnderRoot(path.resolve(this.resolveRoot(revisionId), safeRel));
    try {
      return await fs.readFile(fullPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
      throw err;
    }
  }

  async list(revisionId: string, prefix = ''): Promise<string[]> {
    const root = this.resolveRoot(revisionId);
    const start = prefix
      ? this.assertUnderRoot(path.resolve(root, this.sanitizeRelativePath(prefix)))
      : root;

    const results: string[] = [];
    await this.walk(start, root, results);
    return results.sort();
  }

  private async walk(dir: string, root: string, out: string[]): Promise<void> {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return;
      throw err;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walk(full, root, out);
      } else if (entry.isFile()) {
        out.push(path.relative(root, full).replace(/\\/g, '/'));
      }
    }
  }

  private sanitizeRelativePath(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.includes('..')) {
      throw new Error(`Invalid artifact path: ${relativePath}`);
    }
    return normalized;
  }

  private sanitizeId(id: string): string {
    const trimmed = id?.trim();
    if (!trimmed || trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
      throw new Error(`Invalid artifact id: ${id}`);
    }
    return trimmed;
  }

  /** Fail closed: every resolved path must stay under the configured artifacts root. */
  private assertUnderRoot(resolved: string): string {
    const root = path.resolve(this.rootDir);
    const relative = path.relative(root, resolved);
    const escapes =
      relative === '..' ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative);
    if (escapes) {
      throw new Error(`Artifact path escapes root: ${resolved}`);
    }
    return resolved;
  }
}
