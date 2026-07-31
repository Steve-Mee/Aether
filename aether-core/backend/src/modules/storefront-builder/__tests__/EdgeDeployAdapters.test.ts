import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { LocalFsArtifactStoreAdapter } from '../infrastructure/artifacts/LocalFsArtifactStoreAdapter';
import { LocalEdgeDeployAdapter } from '../infrastructure/deploy/LocalEdgeDeployAdapter';
import { CloudflareDeployAdapter } from '../infrastructure/deploy/CloudflareDeployAdapter';
import { resolveStorefrontDeployProvider } from '../infrastructure/deploy/deployProvider';

describe('LocalEdgeDeployAdapter', () => {
  let artifactsDir: string;
  let edgeDir: string;
  let artifacts: LocalFsArtifactStoreAdapter;

  beforeEach(async () => {
    artifactsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aether-edge-art-'));
    edgeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aether-edge-cdn-'));
    artifacts = new LocalFsArtifactStoreAdapter(artifactsDir);
    await artifacts.write('rev_1', 'plan.json', '{"ok":true}\n');
    await artifacts.write('rev_1', 'pages/home.json', '{"path":"/"}\n');
  });

  afterEach(async () => {
    await fs.rm(artifactsDir, { recursive: true, force: true });
    await fs.rm(edgeDir, { recursive: true, force: true });
  });

  it('copies artifacts to CDN layout and marks live', async () => {
    const markProjectLive = jest.fn().mockResolvedValue({});
    const findProjectById = jest.fn().mockResolvedValue({
      id: 'proj_1',
      slug: 'atelier',
    });
    const adapter = new LocalEdgeDeployAdapter(
      artifacts,
      { markProjectLive, findProjectById },
      edgeDir,
      'http://localhost:4177/edge'
    );

    const result = await adapter.deploy({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
    });

    expect(result.provider).toBe('local-edge');
    expect(result.liveUrl).toBe('http://localhost:4177/edge/atelier');
    expect(markProjectLive).toHaveBeenCalledWith('tenant_a', 'proj_1', 'rev_1', {
      liveUrl: 'http://localhost:4177/edge/atelier',
      provider: 'local-edge',
    });
    const plan = await fs.readFile(path.join(edgeDir, 'atelier', 'plan.json'), 'utf8');
    expect(plan).toContain('"ok":true');
    const meta = JSON.parse(
      await fs.readFile(path.join(edgeDir, 'atelier', '_edge.json'), 'utf8')
    );
    expect(meta.provider).toBe('local-edge');
    expect(meta.slug).toBe('atelier');
  });
});

describe('CloudflareDeployAdapter', () => {
  it('fail-closed without CF credentials', async () => {
    const adapter = new CloudflareDeployAdapter(
      new LocalFsArtifactStoreAdapter(await fs.mkdtemp(path.join(os.tmpdir(), 'cf-'))),
      {
        markProjectLive: jest.fn(),
        findProjectById: jest.fn().mockResolvedValue({ id: 'p', slug: 's' }),
      },
      { putObject: jest.fn() },
      {}
    );
    await expect(
      adapter.deploy({ tenantId: 't', projectId: 'p', revisionId: 'r' })
    ).rejects.toThrow(/CF_ACCOUNT_ID/);
  });

  it('uploads objects via http port when credentials present', async () => {
    const artDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cf-art-'));
    const artifacts = new LocalFsArtifactStoreAdapter(artDir);
    await artifacts.write('rev_1', 'index.html', '<html></html>');
    const putObject = jest.fn().mockResolvedValue(undefined);
    const markProjectLive = jest.fn().mockResolvedValue({});
    const adapter = new CloudflareDeployAdapter(
      artifacts,
      {
        markProjectLive,
        findProjectById: jest.fn().mockResolvedValue({ id: 'proj_1', slug: 'shop' }),
      },
      { putObject },
      {
        CF_ACCOUNT_ID: 'acc',
        CF_API_TOKEN: 'tok',
        CF_R2_BUCKET: 'bucket',
        CF_R2_PUBLIC_BASE: 'https://cdn.example.com',
        STOREFRONT_DEPLOY_ENABLED: 'true',
      }
    );

    const result = await adapter.deploy({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
    });

    expect(result.provider).toBe('cloudflare');
    expect(result.liveUrl).toBe('https://cdn.example.com/shop');
    expect(result.staged).toBe(false);
    expect(putObject).toHaveBeenCalled();
    await fs.rm(artDir, { recursive: true, force: true });
  });
});

describe('resolveStorefrontDeployProvider', () => {
  it('defaults to stub; local-edge when deploy enabled without provider', () => {
    expect(resolveStorefrontDeployProvider({})).toBe('stub');
    expect(
      resolveStorefrontDeployProvider({ STOREFRONT_DEPLOY_ENABLED: 'true' })
    ).toBe('local-edge');
    expect(
      resolveStorefrontDeployProvider({ STOREFRONT_DEPLOY_PROVIDER: 'cloudflare' })
    ).toBe('cloudflare');
  });
});
