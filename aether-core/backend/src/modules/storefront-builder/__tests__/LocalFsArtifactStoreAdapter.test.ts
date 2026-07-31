import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { LocalFsArtifactStoreAdapter } from '../infrastructure/artifacts/LocalFsArtifactStoreAdapter';

describe('LocalFsArtifactStoreAdapter path safety', () => {
  let root: string;
  let store: LocalFsArtifactStoreAdapter;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'aether-artifacts-'));
    store = new LocalFsArtifactStoreAdapter(root);
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('writes and reads within revision root', async () => {
    await store.write('rev_1', 'pages/index.tree.json', '{"type":"Page"}');
    const buf = await store.read('rev_1', 'pages/index.tree.json');
    expect(buf?.toString('utf8')).toBe('{"type":"Page"}');
    const full = path.join(root, 'revisions', 'rev_1', 'pages', 'index.tree.json');
    await expect(fs.access(full)).resolves.toBeUndefined();
  });

  it('rejects path traversal in relative paths', async () => {
    await expect(store.write('rev_1', '../escape.txt', 'x')).rejects.toThrow(/Invalid artifact path/);
    await expect(store.write('rev_1', 'foo/../../etc/passwd', 'x')).rejects.toThrow(
      /Invalid artifact path/
    );
    await expect(store.read('rev_1', '..\\windows\\system32')).rejects.toThrow(
      /Invalid artifact path/
    );
  });

  it('rejects traversal / separators in revision ids', async () => {
    await expect(store.write('../rev', 'ok.json', '{}')).rejects.toThrow(/Invalid artifact id/);
    await expect(store.write('rev/../x', 'ok.json', '{}')).rejects.toThrow(/Invalid artifact id/);
    await expect(store.write('rev\\evil', 'ok.json', '{}')).rejects.toThrow(/Invalid artifact id/);
  });

  it('resolved write/read paths stay under artifacts root', async () => {
    const fullPath = await store.write('rev_contain', 'plan.json', '{}');
    const resolvedRoot = path.resolve(root);
    expect(path.relative(resolvedRoot, fullPath).startsWith('..')).toBe(false);
    expect(path.isAbsolute(path.relative(resolvedRoot, fullPath))).toBe(false);

    const revRoot = store.resolveRoot('rev_contain');
    expect(revRoot.startsWith(resolvedRoot)).toBe(true);
    const liveDir = store.resolveLiveDir('tenant_a', 'proj_1');
    expect(liveDir.startsWith(resolvedRoot)).toBe(true);
  });
});
