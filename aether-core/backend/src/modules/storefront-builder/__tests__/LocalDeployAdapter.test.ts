import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { LocalFsArtifactStoreAdapter } from '../infrastructure/artifacts/LocalFsArtifactStoreAdapter';
import { LocalDeployAdapter } from '../infrastructure/deploy/LocalDeployAdapter';
import { StubDeployAdapter } from '../infrastructure/deploy/StubDeployAdapter';

describe('LocalDeployAdapter', () => {
  const prevDeploy = process.env.STOREFRONT_DEPLOY_ENABLED;
  const prevPort = process.env.STOREFRONT_PREVIEW_PORT;
  let tmpDir: string;
  let artifacts: LocalFsArtifactStoreAdapter;
  const markProjectLive = jest.fn().mockResolvedValue({
    id: 'proj_1',
    status: 'live',
    liveRevisionId: 'rev_1',
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aether-local-deploy-'));
    artifacts = new LocalFsArtifactStoreAdapter(tmpDir);
    await artifacts.write('rev_1', 'plan.json', '{"ok":true}\n');
    delete process.env.STOREFRONT_DEPLOY_ENABLED;
    delete process.env.STOREFRONT_PREVIEW_PORT;
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (prevDeploy === undefined) delete process.env.STOREFRONT_DEPLOY_ENABLED;
    else process.env.STOREFRONT_DEPLOY_ENABLED = prevDeploy;
    if (prevPort === undefined) delete process.env.STOREFRONT_PREVIEW_PORT;
    else process.env.STOREFRONT_PREVIEW_PORT = prevPort;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('is StubDeployAdapter alias and writes live pointer on default port 4177', async () => {
    expect(LocalDeployAdapter).toBe(StubDeployAdapter);

    const result = await new LocalDeployAdapter(artifacts, { markProjectLive }).deploy({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
    });

    expect(result.provider).toBe('stub');
    expect(result.staged).toBe(true);
    expect(result.liveUrl).toBe('http://localhost:4177/live/proj_1');
    expect(markProjectLive).toHaveBeenCalledWith('tenant_a', 'proj_1', 'rev_1', {
      liveUrl: 'http://localhost:4177/live/proj_1',
      provider: 'stub',
    });

    const pointer = await artifacts.readLivePointer('tenant_a', 'proj_1');
    expect(pointer).toMatchObject({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
      servePath: 'revisions/rev_1',
    });
  });
});
