import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { logger } from '../../../shared/logging/logger';
import { LocalFsArtifactStoreAdapter } from '../infrastructure/artifacts/LocalFsArtifactStoreAdapter';
import {
  isStorefrontDeployEnabled,
  StubDeployAdapter,
} from '../infrastructure/deploy/StubDeployAdapter';

describe('StubDeployAdapter / STOREFRONT_DEPLOY_ENABLED', () => {
  const prevDeploy = process.env.STOREFRONT_DEPLOY_ENABLED;
  const prevPort = process.env.STOREFRONT_PREVIEW_PORT;
  let tmpDir: string;
  let artifacts: LocalFsArtifactStoreAdapter;
  const markProjectLive = jest.fn();
  const siteRepository = { markProjectLive };

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aether-stub-deploy-'));
    artifacts = new LocalFsArtifactStoreAdapter(tmpDir);
    await artifacts.write('rev_1', 'plan.json', '{"ok":true}\n');
    delete process.env.STOREFRONT_DEPLOY_ENABLED;
    delete process.env.STOREFRONT_PREVIEW_PORT;
    jest.clearAllMocks();
    markProjectLive.mockResolvedValue({
      id: 'proj_1',
      status: 'live',
      liveRevisionId: 'rev_1',
    });
  });

  afterEach(async () => {
    if (prevDeploy === undefined) delete process.env.STOREFRONT_DEPLOY_ENABLED;
    else process.env.STOREFRONT_DEPLOY_ENABLED = prevDeploy;
    if (prevPort === undefined) delete process.env.STOREFRONT_PREVIEW_PORT;
    else process.env.STOREFRONT_PREVIEW_PORT = prevPort;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('defaults to staged + live pointer + markProjectLive when flag unset', async () => {
    expect(isStorefrontDeployEnabled()).toBe(false);
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => undefined);

    const result = await new StubDeployAdapter(artifacts, siteRepository).deploy({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
    });

    expect(result.staged).toBe(true);
    expect(result.provider).toBe('stub');
    expect(result.liveUrl).toBe('http://localhost:4177/live/proj_1');
    expect(markProjectLive).toHaveBeenCalledWith('tenant_a', 'proj_1', 'rev_1', {
      liveUrl: 'http://localhost:4177/live/proj_1',
      provider: 'stub',
    });
    expect(infoSpy).not.toHaveBeenCalledWith(
      'deploy.provider=stub',
      expect.anything()
    );

    const pointer = await artifacts.readLivePointer('tenant_a', 'proj_1');
    expect(pointer).toMatchObject({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
      servePath: 'revisions/rev_1',
    });

    const current = await fs.readFile(
      path.join(tmpDir, 'live', 'tenant_a', 'proj_1', 'CURRENT'),
      'utf8'
    );
    expect(current.trim()).toBe('rev_1');
    infoSpy.mockRestore();
  });

  it('staged=false + deploy.provider=stub log when STOREFRONT_DEPLOY_ENABLED=true (no CDN)', async () => {
    process.env.STOREFRONT_DEPLOY_ENABLED = 'true';
    expect(isStorefrontDeployEnabled()).toBe(true);
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => undefined);

    const result = await new StubDeployAdapter(artifacts, siteRepository).deploy({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
    });

    expect(result.staged).toBe(false);
    expect(result.provider).toBe('stub');
    expect(markProjectLive).toHaveBeenCalledWith('tenant_a', 'proj_1', 'rev_1', {
      liveUrl: 'http://localhost:4177/live/proj_1',
      provider: 'stub',
    });
    expect(infoSpy).toHaveBeenCalledWith('deploy.provider=stub', {
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
      provider: 'stub',
    });
    expect(await artifacts.readLivePointer('tenant_a', 'proj_1')).toMatchObject({
      revisionId: 'rev_1',
    });
    infoSpy.mockRestore();
  });

  it('refuses deploy without tenantId', async () => {
    await expect(
      new StubDeployAdapter(artifacts, siteRepository).deploy({
        tenantId: '',
        projectId: 'proj_1',
        revisionId: 'rev_1',
      })
    ).rejects.toThrow(/tenantId/);
    expect(markProjectLive).not.toHaveBeenCalled();
  });

  it('refuses deploy without SiteRepository', async () => {
    await expect(
      new StubDeployAdapter(artifacts).deploy({
        tenantId: 'tenant_a',
        projectId: 'proj_1',
        revisionId: 'rev_1',
      })
    ).rejects.toThrow(/SiteRepository/);
  });
});
