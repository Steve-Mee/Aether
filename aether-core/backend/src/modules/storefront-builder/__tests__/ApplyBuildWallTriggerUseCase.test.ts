import { BuildJob } from '../domain/entities/BuildJob';
import { SiteProject } from '../domain/entities/SiteProject';
import { SiteRevision } from '../domain/entities/SiteRevision';
import type { SiteRepository } from '../domain/repositories/SiteRepository';
import {
  ApplyBuildWallTriggerUseCase,
  STOREFRONT_WALL_HEAL_AGENT,
} from '../application/use-cases/ApplyBuildWallTriggerUseCase';
import type { CreateRevisionUseCase } from '../application/use-cases/CreateRevisionUseCase';
import type { StartBuildUseCase } from '../application/use-cases/StartBuildUseCase';

jest.mock('../../../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../../ai/intelligence/multi-agent/agents/storefrontPlanFallback', () => ({
  buildFallbackSitePlan: jest.fn().mockReturnValue({
    localeDefault: 'nl',
    pages: [{ path: '/', title: 'Home', tree: { type: 'Page', children: [] } }],
  }),
}));

import { eventBus } from '../../../shared/events/eventBus';

describe('ApplyBuildWallTriggerUseCase', () => {
  const tenantId = 'tenant_a';
  const now = new Date();

  const project = new SiteProject(
    'proj_1',
    tenantId,
    'atelier',
    null,
    'preview',
    null,
    now,
    now
  );

  function failedJob(id: string): BuildJob {
    return new BuildJob(id, 'rev_x', 'failed', null, null, now, now, now);
  }

  function makeRepo(overrides: Partial<SiteRepository> = {}): SiteRepository {
    return {
      findProjectById: jest.fn().mockResolvedValue(project),
      listRecentBuildJobsForProject: jest.fn().mockResolvedValue([]),
      listRevisions: jest.fn().mockResolvedValue([]),
      ...overrides,
    } as SiteRepository;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.STOREFRONT_ORGANISM_ENABLED;
    delete process.env.STOREFRONT_BUILD_WALL_FAILURES;
  });

  it('does not trigger below failure threshold', async () => {
    const repo = makeRepo({
      listRecentBuildJobsForProject: jest
        .fn()
        .mockResolvedValue([failedJob('b1'), failedJob('b2')]),
    });
    const createRevision = { execute: jest.fn() } as unknown as CreateRevisionUseCase;
    const startBuild = { execute: jest.fn() } as unknown as StartBuildUseCase;
    const uc = new ApplyBuildWallTriggerUseCase(repo, createRevision, startBuild);

    const result = await uc.execute(tenantId, 'proj_1', { status: 'failed' });

    expect(result).toEqual({ triggered: false, consecutiveFailures: 2 });
    expect(createRevision.execute).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('triggers wall, suggests iterate, and self-heals once', async () => {
    const latest = new SiteRevision(
      'rev_parent',
      'proj_1',
      1,
      { prompt: 'Keramiek' },
      { pages: [] },
      'artifacts/x',
      null,
      'store_builder',
      null,
      now
    );
    const healRev = new SiteRevision(
      'rev_heal',
      'proj_1',
      2,
      { prompt: 'Keramiek' },
      { pages: [] },
      null,
      null,
      STOREFRONT_WALL_HEAL_AGENT,
      'rev_parent',
      now
    );
    const repo = makeRepo({
      listRecentBuildJobsForProject: jest
        .fn()
        .mockResolvedValue([failedJob('b3'), failedJob('b2'), failedJob('b1')]),
      listRevisions: jest.fn().mockResolvedValue([latest]),
    });
    const createRevision = {
      execute: jest.fn().mockResolvedValue({ revision: healRev, buildJob: null }),
    } as unknown as CreateRevisionUseCase;
    const startBuild = { execute: jest.fn().mockResolvedValue({}) } as unknown as StartBuildUseCase;
    const suggest = { upsertFinding: jest.fn().mockResolvedValue({}) };
    const uc = new ApplyBuildWallTriggerUseCase(
      repo,
      createRevision,
      startBuild,
      suggest
    );

    const result = await uc.execute(tenantId, 'proj_1', {
      status: 'failed',
      buildJobId: 'b3',
    });

    expect(result.triggered).toBe(true);
    expect(result.consecutiveFailures).toBe(3);
    expect(result.selfHeal).toEqual({ revisionId: 'rev_heal', buildSucceeded: true });
    expect(suggest.upsertFinding).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({ intentId: 'STORE_ITERATE', category: 'storefront' }),
      expect.any(Number)
    );
    expect(createRevision.execute).toHaveBeenCalledWith(
      tenantId,
      'proj_1',
      expect.objectContaining({ createdByAgent: STOREFRONT_WALL_HEAL_AGENT })
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'website.build.wall_triggered' })
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'website.health.healed',
        payload: expect.objectContaining({ published: false }),
      })
    );
  });

  it('skips self-heal loop when latest revision is already organism heal', async () => {
    const healLatest = new SiteRevision(
      'rev_heal',
      'proj_1',
      2,
      {},
      {},
      null,
      null,
      STOREFRONT_WALL_HEAL_AGENT,
      null,
      now
    );
    const repo = makeRepo({
      listRecentBuildJobsForProject: jest
        .fn()
        .mockResolvedValue([failedJob('b3'), failedJob('b2'), failedJob('b1')]),
      listRevisions: jest.fn().mockResolvedValue([healLatest]),
    });
    const createRevision = { execute: jest.fn() } as unknown as CreateRevisionUseCase;
    const startBuild = { execute: jest.fn() } as unknown as StartBuildUseCase;
    const uc = new ApplyBuildWallTriggerUseCase(repo, createRevision, startBuild);

    const result = await uc.execute(tenantId, 'proj_1', { status: 'failed' });

    expect(result.triggered).toBe(true);
    expect(result.skippedSelfHeal).toBe(true);
    expect(createRevision.execute).not.toHaveBeenCalled();
  });

  it('ignores non-failed status', async () => {
    const repo = makeRepo();
    const uc = new ApplyBuildWallTriggerUseCase(
      repo,
      { execute: jest.fn() } as unknown as CreateRevisionUseCase,
      { execute: jest.fn() } as unknown as StartBuildUseCase
    );

    await expect(
      uc.execute(tenantId, 'proj_1', { status: 'succeeded' })
    ).resolves.toEqual({ triggered: false, consecutiveFailures: 0 });
  });
});
