import { BuildJob } from '../domain/entities/BuildJob';
import { SiteRevision } from '../domain/entities/SiteRevision';
import type { SiteRepository } from '../domain/repositories/SiteRepository';
import type { CodegenCompilerPort } from '../application/ports/CodegenCompilerPort';
import type { PreviewHostPort } from '../application/ports/PreviewHostPort';
import { StartBuildUseCase, BuildQaFailedError } from '../application/use-cases/StartBuildUseCase';
import { RevisionNotFoundError } from '../application/use-cases/ListPagesUseCase';
import { CodegenRejectedError } from '../infrastructure/codegen/CodegenRejectedError';
import {
  PREVIEW_TOKEN_TTL_MS,
  signPreviewToken,
  verifyPreviewToken,
  PreviewTokenError,
} from '../application/services/previewToken';
import { LocalPreviewHostAdapter } from '../infrastructure/preview/LocalPreviewHostAdapter';

jest.mock('../../../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

import { eventBus } from '../../../shared/events/eventBus';

describe('StartBuildUseCase', () => {
  const revision = new SiteRevision(
    'rev_1',
    'proj_1',
    1,
    { prompt: 'Keramiek' },
    {
      localeDefault: 'nl',
      pages: [
        {
          path: '/',
          title: 'Home',
          tree: { type: 'Page', children: [] },
        },
      ],
    },
    null,
    null,
    null,
    null,
    new Date()
  );

  const queued = new BuildJob(
    'build_1',
    'rev_1',
    'queued',
    null,
    null,
    null,
    null,
    new Date()
  );

  function makeRepo(overrides: Partial<SiteRepository> = {}): SiteRepository {
    const jobs = new Map<string, BuildJob>();
    jobs.set(queued.id, queued);

    return {
      findProjectById: jest.fn(),
      findProjectBySlug: jest.fn(),
      findProjectByPublicSlug: jest.fn(),
      listProjects: jest.fn(),
      createProjectWithInitialRevision: jest.fn(),
      findRevisionById: jest.fn().mockResolvedValue(revision),
      listRevisions: jest.fn(),
      createRevision: jest.fn(),
      attachCompiledArtifacts: jest.fn().mockResolvedValue(revision),
      listPages: jest.fn(),
      findPageById: jest.fn(),
      findPageByPath: jest.fn(),
      createBuildJob: jest.fn().mockResolvedValue(queued),
      findBuildJobById: jest.fn(),
      updateBuildJob: jest.fn().mockImplementation(async (_tid, id, input) => {
        const prev = jobs.get(id) ?? queued;
        const next = new BuildJob(
          prev.id,
          prev.revisionId,
          input.status ?? prev.status,
          input.logs !== undefined ? input.logs : prev.logs,
          input.previewUrl !== undefined ? input.previewUrl : prev.previewUrl,
          input.startedAt !== undefined ? input.startedAt : prev.startedAt,
          input.finishedAt !== undefined ? input.finishedAt : prev.finishedAt,
          prev.createdAt
        );
        jobs.set(id, next);
        return next;
      }),
      findDeployTarget: jest.fn(),
      upsertDeployTarget: jest.fn(),
      markProjectLive: jest.fn(),
      ...overrides,
    } as SiteRepository;
  }

  function makeCompiler(
    overrides: Partial<CodegenCompilerPort> = {}
  ): CodegenCompilerPort {
    return {
      compile: jest.fn().mockResolvedValue({
        artifactsPath: '/tmp/revisions/rev_1',
        pages: [
          {
            path: '/',
            title: 'Home',
            seoJson: {},
            treeJson: { type: 'Page', children: [] },
            sortOrder: 0,
          },
        ],
        tokensJson: {},
      }),
      ...overrides,
    };
  }

  it('happy path: compile → structural QA → signed previewUrl → succeeded', async () => {
    process.env.STOREFRONT_PREVIEW_HMAC_SECRET = 'test-storefront-preview-hmac-secret';
    delete process.env.STOREFRONT_PREVIEW_PORT;

    const repo = makeRepo();
    const compiler = makeCompiler();
    const previewHost = new LocalPreviewHostAdapter({
      nowMs: () => 1_700_000_000_000,
    });
    const useCase = new StartBuildUseCase(repo, compiler, previewHost);

    const job = await useCase.execute('tenant_a', 'rev_1');

    expect(compiler.compile).toHaveBeenCalledWith({
      tenantId: 'tenant_a',
      revisionId: 'rev_1',
      briefJson: revision.briefJson,
      planJson: revision.planJson,
    });
    expect(repo.attachCompiledArtifacts).toHaveBeenCalledWith(
      'tenant_a',
      'rev_1',
      expect.objectContaining({
        artifactsPath: '/tmp/revisions/rev_1',
        qaReportJson: expect.objectContaining({
          status: 'passed',
          score: 0.9,
          checks: expect.arrayContaining([
            expect.objectContaining({ id: 'home_page', ok: true }),
          ]),
        }),
      })
    );
    expect(job.status).toBe('succeeded');
    expect(job.previewUrl).toMatch(
      /^http:\/\/localhost:4177\/preview\/rev_1\?token=/
    );

    const token = new URL(job.previewUrl!).searchParams.get('token');
    expect(token).toBeTruthy();
    const claims = verifyPreviewToken(token!, {
      secret: 'test-storefront-preview-hmac-secret',
      nowMs: 1_700_000_000_000,
    });
    expect(claims).toMatchObject({
      revisionId: 'rev_1',
      projectId: 'proj_1',
      tenantId: 'tenant_a',
    });
    // Appendix G: preview token TTL = 15 minutes (P04 helpers only).
    expect(claims.exp).toBe(1_700_000_000_000 + PREVIEW_TOKEN_TTL_MS);
    expect(PREVIEW_TOKEN_TTL_MS).toBe(15 * 60 * 1000);

    // qaScore persisted on revision via attachCompiledArtifacts (not a BuildJob column).
    const attachArgs = (repo.attachCompiledArtifacts as jest.Mock).mock.calls[0];
    expect(attachArgs[2].qaReportJson.score).toBeGreaterThanOrEqual(0.8);

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_a',
        type: 'website.build.finished',
        payload: expect.objectContaining({
          projectId: 'proj_1',
          revisionId: 'rev_1',
          buildJobId: 'build_1',
          status: 'succeeded',
        }),
        idempotencyKey: 'website.build.finished:build_1',
      })
    );
  });

  it('marks job failed when structural QA fails (no home page)', async () => {
    const badRevision = new SiteRevision(
      'rev_1',
      'proj_1',
      1,
      { prompt: 'broken' },
      {
        localeDefault: 'nl',
        pages: [{ path: '/about', title: 'About', tree: { type: 'Page', children: [] } }],
      },
      null,
      null,
      null,
      null,
      new Date()
    );
    const repo = makeRepo({
      findRevisionById: jest.fn().mockResolvedValue(badRevision),
      attachCompiledArtifacts: jest.fn().mockResolvedValue(badRevision),
    });
    const compiler = makeCompiler();
    const previewHost: PreviewHostPort = { startPreview: jest.fn() };
    const useCase = new StartBuildUseCase(repo, compiler, previewHost);

    await expect(useCase.execute('tenant_a', 'rev_1')).rejects.toBeInstanceOf(BuildQaFailedError);
    expect(previewHost.startPreview).not.toHaveBeenCalled();
    expect(repo.attachCompiledArtifacts).toHaveBeenCalledWith(
      'tenant_a',
      'rev_1',
      expect.objectContaining({
        qaReportJson: expect.objectContaining({
          status: 'failed',
          score: 0.4,
        }),
      })
    );
    expect(repo.updateBuildJob).toHaveBeenCalledWith(
      'tenant_a',
      'build_1',
      expect.objectContaining({ status: 'failed', previewUrl: null })
    );
  });

  it('marks job failed when codegen rejects and rethrows', async () => {
    const repo = makeRepo();
    const compiler = makeCompiler({
      compile: jest
        .fn()
        .mockRejectedValue(new CodegenRejectedError('unknown block')),
    });
    const previewHost: PreviewHostPort = {
      startPreview: jest.fn(),
    };
    const useCase = new StartBuildUseCase(repo, compiler, previewHost);

    await expect(useCase.execute('tenant_a', 'rev_1')).rejects.toBeInstanceOf(
      CodegenRejectedError
    );
    expect(previewHost.startPreview).not.toHaveBeenCalled();
    expect(repo.updateBuildJob).toHaveBeenCalledWith(
      'tenant_a',
      'build_1',
      expect.objectContaining({ status: 'failed', previewUrl: null })
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_a',
        type: 'website.build.finished',
        payload: expect.objectContaining({
          status: 'failed',
          buildJobId: 'build_1',
        }),
        idempotencyKey: 'website.build.finished:build_1',
      })
    );
  });

  it('throws RevisionNotFoundError without creating a job', async () => {
    const repo = makeRepo({
      findRevisionById: jest.fn().mockResolvedValue(null),
    });
    const useCase = new StartBuildUseCase(repo, makeCompiler(), {
      startPreview: jest.fn(),
    });

    await expect(useCase.execute('tenant_a', 'missing')).rejects.toBeInstanceOf(
      RevisionNotFoundError
    );
    expect(repo.createBuildJob).not.toHaveBeenCalled();
  });

  it('expired preview token is rejected (security)', () => {
    const token = signPreviewToken(
      {
        revisionId: 'rev_1',
        projectId: 'proj_1',
        tenantId: 'tenant_a',
      },
      { secret: 'unit-expired-secret', nowMs: 1_000_000, ttlMs: 1_000 }
    );
    expect(() =>
      verifyPreviewToken(token, { secret: 'unit-expired-secret', nowMs: 1_002_000 })
    ).toThrow(PreviewTokenError);
  });
});
