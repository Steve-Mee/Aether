import {
  createSiteProjectTool,
  createRevisionFromBriefTool,
  runBuildTool,
  proposePublishTool,
  getStoreStatusTool,
  type StoreBuilderToolsDeps,
} from '../storeBuilderTools';
import { proposeLayoutTool, proposePageTreeTool } from '../designTools';
import { runBuildChecksTool, runLighthouseTool } from '../storeQaTools';
import { SiteRevision } from '../../../../../modules/storefront-builder/domain/entities/SiteRevision';
import { SiteProject } from '../../../../../modules/storefront-builder/domain/entities/SiteProject';

function mockDeps(overrides: Partial<StoreBuilderToolsDeps> = {}): StoreBuilderToolsDeps {
  const deploy = jest.fn().mockResolvedValue({ liveUrl: 'https://evil.example' });
  return {
    createSiteProject: {
      execute: jest.fn().mockResolvedValue({
        project: { id: 'proj_1', slug: 'acme', status: 'draft' },
        revision: { id: 'rev_1', version: 1 },
        buildJob: { id: 'job_1', status: 'queued' },
      }),
    },
    createSiteRevision: {
      execute: jest.fn().mockResolvedValue({
        revision: { id: 'rev_2', version: 2 },
        buildJob: { id: 'job_2', status: 'queued' },
      }),
    },
    startSiteBuild: {
      execute: jest.fn().mockResolvedValue({
        id: 'job_3',
        revisionId: 'rev_1',
        status: 'queued',
      }),
    },
    proposeSitePublish: {
      execute: jest.fn().mockResolvedValue({
        approval: {
          id: 'appr_1',
          type: 'PUBLISH_STOREFRONT',
          status: 'pending',
          payload: { projectId: 'proj_1', revisionId: 'rev_1' },
        },
      }),
    },
    listSiteProjects: {
      execute: jest.fn().mockResolvedValue([
        Object.assign(SiteProject.create({ tenantId: 'tenant_a', slug: 'acme' }), { id: 'proj_1' }),
      ]),
    },
    getSiteProject: {
      execute: jest.fn().mockResolvedValue(
        Object.assign(SiteProject.create({ tenantId: 'tenant_a', slug: 'acme' }), { id: 'proj_1' })
      ),
    },
    listSiteRevisions: {
      execute: jest.fn().mockResolvedValue([
        new SiteRevision('rev_1', 'proj_1', 1, {}, { pages: [] }, null, null, null, null, new Date()),
      ]),
    },
    deployPort: { deploy },
    ...overrides,
  };
}

describe('storeBuilderTools', () => {
  const ctxA = { tenantId: 'tenant_a', actorId: 'user_1', agentKey: 'store_builder' };
  const ctxB = { tenantId: 'tenant_b', actorId: 'user_2', agentKey: 'store_builder' };

  it('STORE_BUILD path creates project+revision via createSiteProject executeConfirmed', async () => {
    const deps = mockDeps();
    const tool = createSiteProjectTool(deps);
    const draft = await tool.buildProposal!(ctxA as never, {
      brief: { brand: { name: 'Acme Tea' } },
    });
    expect(draft.tool).toBe('createSiteProject');
    expect(draft.payload.slug).toBe('acme-tea');

    const result = await tool.executeConfirmed!(ctxA as never, draft.payload);
    expect(result.success).toBe(true);
    expect(deps.createSiteProject.execute).toHaveBeenCalledWith(
      'tenant_a',
      expect.objectContaining({
        slug: 'acme-tea',
        createdByAgent: 'store_builder',
      })
    );
  });

  it('createRevisionFromBrief scopes to tenantId', async () => {
    const deps = mockDeps();
    const tool = createRevisionFromBriefTool(deps);
    await tool.executeConfirmed!(ctxB as never, {
      projectId: 'proj_x',
      brief: { brand: { name: 'Other' } },
    });
    expect(deps.createSiteRevision.execute).toHaveBeenCalledWith(
      'tenant_b',
      'proj_x',
      expect.any(Object)
    );
  });

  it('runBuild queues build for tenant', async () => {
    const deps = mockDeps();
    const tool = runBuildTool(deps);
    const result = await tool.executeRead!(ctxA as never, { revisionId: 'rev_1' });
    expect(result).toMatchObject({ success: true, buildJobId: 'job_3' });
    expect(deps.startSiteBuild.execute).toHaveBeenCalledWith('tenant_a', 'rev_1');
  });

  it('proposePublish does not deploy', async () => {
    const deps = mockDeps();
    const tool = proposePublishTool(deps);
    const draft = await tool.buildProposal!(ctxA as never, { revisionId: 'rev_1' });
    expect(draft.risk).toBe('high');
    expect(draft.requiresApproval).toBe(true);

    const result = await tool.executeConfirmed!(ctxA as never, { revisionId: 'rev_1' });
    expect(result.success).toBe(true);
    expect(result.operationalMeta).toMatchObject({ deployed: false, type: 'PUBLISH_STOREFRONT' });
    expect(deps.proposeSitePublish.execute).toHaveBeenCalledWith('tenant_a', 'rev_1', {
      requestedBy: 'user_1',
    });
    expect(deps.deployPort!.deploy).not.toHaveBeenCalled();
  });

  it('proposePublish executeRead refuses direct deploy path', async () => {
    const tool = proposePublishTool(mockDeps());
    const result = await tool.executeRead!(ctxA as never, { revisionId: 'rev_1' });
    expect(result).toMatchObject({ error: expect.stringContaining('propose-only') });
  });

  it('getStoreStatus does not leak across tenants', async () => {
    const deps = mockDeps();
    const tool = getStoreStatusTool(deps);
    await tool.executeRead!(ctxB as never, {});
    expect(deps.listSiteProjects.execute).toHaveBeenCalledWith('tenant_b');
    expect(deps.listSiteProjects.execute).not.toHaveBeenCalledWith('tenant_a');
  });

  it('rejects cross-tenant revision access in QA tools', async () => {
    const revisions = {
      findRevisionById: jest.fn().mockImplementation(async (tenantId: string, id: string) => {
        if (tenantId !== 'tenant_a') return null;
        return new SiteRevision(
          id,
          'proj_1',
          1,
          {},
          { pages: [{ path: '/', tree: { type: 'Page', children: [{ type: 'Hero' }] } }] },
          '/artifacts/rev_1',
          null,
          null,
          null,
          new Date()
        );
      }),
    };
    const checks = runBuildChecksTool({ revisions });
    const wrongTenant = await checks.executeRead!(ctxB as never, { revisionId: 'rev_1' });
    expect(wrongTenant).toMatchObject({ success: false, error: expect.stringContaining('not found') });
    expect(revisions.findRevisionById).toHaveBeenCalledWith('tenant_b', 'rev_1');

    const ok = await checks.executeRead!(ctxA as never, { revisionId: 'rev_1' });
    expect(ok).toMatchObject({ success: true, passed: true });
  });

  it('runLighthouse reports CWV not measured (no fake budget pass)', async () => {
    const revisions = {
      findRevisionById: jest.fn().mockResolvedValue(
        new SiteRevision('rev_1', 'proj_1', 1, {}, {}, null, null, null, null, new Date())
      ),
    };
    const tool = runLighthouseTool({ revisions });
    const result = await tool.executeRead!(ctxA as never, { revisionId: 'rev_1' });
    expect(result).toMatchObject({
      success: true,
      measured: false,
      budgetOk: null,
      scores: null,
    });
    expect(String((result as { note?: string }).note)).toMatch(/not measured/i);
  });

  it('design proposePageTree falls back without LLM to allowlisted plan', async () => {
    const tool = proposePageTreeTool({});
    const result = (await tool.executeRead!(ctxA as never, {
      brief: { brand: { name: 'Fallback Co' } },
    })) as { success: boolean; source: string; plan: { pages: unknown[] } };
    expect(result.success).toBe(true);
    expect(result.source).toBe('fallback');
    expect(result.plan.pages.length).toBeGreaterThan(0);
  });

  it('proposeLayout validate path works with no LLM', async () => {
    const tool = proposeLayoutTool({});
    const result = (await tool.executeRead!(ctxA as never, {
      brief: { brand: { name: 'Layout Co' } },
      path: '/',
    })) as { success: boolean; tree: { type: string } };
    expect(result.success).toBe(true);
    expect(result.tree.type).toBe('Page');
  });
});
