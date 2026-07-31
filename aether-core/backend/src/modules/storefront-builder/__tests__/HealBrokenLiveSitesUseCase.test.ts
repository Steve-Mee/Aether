import { SiteProject } from '../domain/entities/SiteProject';
import { SiteRevision } from '../domain/entities/SiteRevision';
import type { SiteRepository } from '../domain/repositories/SiteRepository';
import { HealBrokenLiveSitesUseCase } from '../application/use-cases/HealBrokenLiveSitesUseCase';
import type { StartBuildUseCase } from '../application/use-cases/StartBuildUseCase';

jest.mock('../../../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

import { eventBus } from '../../../shared/events/eventBus';

describe('HealBrokenLiveSitesUseCase', () => {
  const tenantId = 'tenant_a';
  const now = new Date();

  function liveProject(overrides: Partial<SiteProject> = {}): SiteProject {
    return new SiteProject(
      overrides.id ?? 'proj_1',
      tenantId,
      overrides.slug ?? 'atelier',
      null,
      'live',
      overrides.liveRevisionId !== undefined ? overrides.liveRevisionId : 'rev_1',
      now,
      now
    );
  }

  function revision(overrides: Partial<SiteRevision> = {}): SiteRevision {
    return new SiteRevision(
      overrides.id ?? 'rev_1',
      overrides.projectId ?? 'proj_1',
      1,
      { prompt: 'x' },
      { pages: [] },
      overrides.artifactsPath !== undefined ? overrides.artifactsPath : null,
      null,
      null,
      null,
      now
    );
  }

  function makeRepo(overrides: Partial<SiteRepository> = {}): SiteRepository {
    return {
      listLiveProjects: jest.fn().mockResolvedValue([]),
      findRevisionById: jest.fn(),
      demoteProjectFromLive: jest.fn().mockImplementation(async (_t, id, _r) =>
        liveProject({ id, liveRevisionId: null, status: 'preview' } as never)
      ),
      ...overrides,
    } as SiteRepository;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.STOREFRONT_ORGANISM_ENABLED;
  });

  it('reports healthy when live revision has artifacts', async () => {
    const project = liveProject();
    const rev = revision({ artifactsPath: 'artifacts/rev_1' });
    const repo = makeRepo({
      listLiveProjects: jest.fn().mockResolvedValue([project]),
      findRevisionById: jest.fn().mockResolvedValue(rev),
    });
    const startBuild = { execute: jest.fn() } as unknown as StartBuildUseCase;
    const uc = new HealBrokenLiveSitesUseCase(repo, startBuild);

    const results = await uc.execute(tenantId);

    expect(results).toEqual([
      expect.objectContaining({ action: 'healthy', detail: 'artifacts_present' }),
    ]);
    expect(startBuild.execute).not.toHaveBeenCalled();
    expect(repo.demoteProjectFromLive).not.toHaveBeenCalled();
  });

  it('rebuilds missing artifacts and emits website.health.healed', async () => {
    const project = liveProject();
    const broken = revision({ artifactsPath: null });
    const healed = revision({ artifactsPath: 'artifacts/rev_1' });
    const findRevision = jest
      .fn()
      .mockResolvedValueOnce(broken)
      .mockResolvedValueOnce(healed);
    const repo = makeRepo({
      listLiveProjects: jest.fn().mockResolvedValue([project]),
      findRevisionById: findRevision,
    });
    const startBuild = { execute: jest.fn().mockResolvedValue({}) } as unknown as StartBuildUseCase;
    const uc = new HealBrokenLiveSitesUseCase(repo, startBuild);

    const results = await uc.execute(tenantId);

    expect(startBuild.execute).toHaveBeenCalledWith(tenantId, 'rev_1');
    expect(results[0]?.action).toBe('healed');
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'website.health.healed' })
    );
    expect(repo.demoteProjectFromLive).not.toHaveBeenCalled();
  });

  it('demotes when rebuild fails', async () => {
    const project = liveProject();
    const broken = revision({ artifactsPath: null });
    const demoted = new SiteProject(
      'proj_1',
      tenantId,
      'atelier',
      null,
      'preview',
      null,
      now,
      now
    );
    const repo = makeRepo({
      listLiveProjects: jest.fn().mockResolvedValue([project]),
      findRevisionById: jest.fn().mockResolvedValue(broken),
      demoteProjectFromLive: jest.fn().mockResolvedValue(demoted),
    });
    const startBuild = {
      execute: jest.fn().mockRejectedValue(new Error('qa failed')),
    } as unknown as StartBuildUseCase;
    const uc = new HealBrokenLiveSitesUseCase(repo, startBuild);

    const results = await uc.execute(tenantId);

    expect(results[0]?.action).toBe('demoted');
    expect(repo.demoteProjectFromLive).toHaveBeenCalledWith(
      tenantId,
      'proj_1',
      'missing_artifacts_rebuild_failed'
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'website.health.demoted' })
    );
  });

  it('demotes live without revision pointer', async () => {
    const project = liveProject({ liveRevisionId: null });
    const demoted = new SiteProject(
      'proj_1',
      tenantId,
      'atelier',
      null,
      'preview',
      null,
      now,
      now
    );
    const repo = makeRepo({
      listLiveProjects: jest.fn().mockResolvedValue([project]),
      demoteProjectFromLive: jest.fn().mockResolvedValue(demoted),
    });
    const startBuild = { execute: jest.fn() } as unknown as StartBuildUseCase;
    const uc = new HealBrokenLiveSitesUseCase(repo, startBuild);

    const results = await uc.execute(tenantId);

    expect(results[0]?.detail).toBe('live_without_revision_pointer');
    expect(startBuild.execute).not.toHaveBeenCalled();
  });

  it('no-ops when organism disabled', async () => {
    process.env.STOREFRONT_ORGANISM_ENABLED = 'false';
    const repo = makeRepo({
      listLiveProjects: jest.fn().mockResolvedValue([liveProject()]),
    });
    const startBuild = { execute: jest.fn() } as unknown as StartBuildUseCase;
    const uc = new HealBrokenLiveSitesUseCase(repo, startBuild);

    await expect(uc.execute(tenantId)).resolves.toEqual([]);
    expect(repo.listLiveProjects).not.toHaveBeenCalled();
  });
});
