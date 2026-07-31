import {
  CreateRevisionUseCase,
  ProjectNotFoundError,
} from '../application/use-cases/CreateRevisionUseCase';
import { CodegenCompilerPort } from '../application/ports/CodegenCompilerPort';
import { BuildJob } from '../domain/entities/BuildJob';
import { SiteProject } from '../domain/entities/SiteProject';
import { SiteRevision } from '../domain/entities/SiteRevision';
import { SiteRepository } from '../domain/repositories/SiteRepository';
import { CodegenRejectedError } from '../infrastructure/codegen/CodegenRejectedError';
import { MissingTenantError } from '../../../shared/tenant/tenantContext';

jest.mock('../../../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

import { eventBus } from '../../../shared/events/eventBus';

function makeRevision(artifactsPath: string | null = null): SiteRevision {
  return new SiteRevision(
    'rev_1',
    'proj_1',
    2,
    { brand: { name: 'Atelier Noord' } },
    {},
    artifactsPath,
    null,
    null,
    null,
    new Date('2026-07-26T09:00:00.000Z')
  );
}

function makeRepo(overrides: Partial<SiteRepository> = {}): SiteRepository {
  const project = new SiteProject(
    'proj_1',
    'tenant_a',
    'atelier-noord',
    null,
    'draft',
    null,
    new Date(),
    new Date()
  );
  const revision = makeRevision(null);
  const ready = makeRevision('/tmp/revisions/rev_1');
  const buildJob = new BuildJob(
    'build_1',
    'rev_1',
    'queued',
    null,
    null,
    null,
    null,
    new Date()
  );

  return {
    findProjectById: jest.fn().mockResolvedValue(project),
    findProjectBySlug: jest.fn().mockResolvedValue(null),
    findProjectByPublicSlug: jest.fn().mockResolvedValue(null),
    listProjects: jest.fn().mockResolvedValue([]),
    createProjectWithInitialRevision: jest.fn(),
    findRevisionById: jest.fn().mockResolvedValue(null),
    listRevisions: jest.fn().mockResolvedValue([]),
    createRevision: jest.fn().mockResolvedValue({ revision, buildJob }),
    attachCompiledArtifacts: jest.fn().mockResolvedValue(ready),
    listPages: jest.fn().mockResolvedValue([]),
    findPageById: jest.fn().mockResolvedValue(null),
    findPageByPath: jest.fn().mockResolvedValue(null),
    createBuildJob: jest.fn().mockResolvedValue(buildJob),
    findBuildJobById: jest.fn().mockResolvedValue(null),
    updateBuildJob: jest.fn().mockResolvedValue(buildJob),
    findDeployTarget: jest.fn().mockResolvedValue(null),
    upsertDeployTarget: jest.fn().mockResolvedValue(null),
    markProjectLive: jest.fn().mockResolvedValue(project),
    listLiveProjects: jest.fn().mockResolvedValue([]),
    demoteProjectFromLive: jest.fn().mockResolvedValue(project),
    listRecentBuildJobsForProject: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeCompiler(overrides: Partial<CodegenCompilerPort> = {}): CodegenCompilerPort {
  return {
    validate: jest.fn().mockReturnValue({}),
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
      tokensJson: { primary: '#1a1a1a' },
    }),
    ...overrides,
  };
}

describe('CreateRevisionUseCase + codegen', () => {
  it('compiles and attaches artifacts on happy path', async () => {
    const repo = makeRepo();
    const compiler = makeCompiler();
    const useCase = new CreateRevisionUseCase(repo, compiler);

    const plan = {
      version: 1,
      pages: [
        {
          path: '/',
          title: 'Home',
          tree: { type: 'Page', children: [{ type: 'Hero', props: { headline: 'Hi' } }] },
        },
      ],
    };

    const result = await useCase.execute('tenant_a', 'proj_1', {
      brief: { brand: { name: 'Atelier Noord' } },
      plan,
    });

    expect(compiler.validate).toHaveBeenCalled();
    expect(compiler.compile).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_a',
        revisionId: 'rev_1',
        planJson: plan,
      })
    );
    expect(repo.attachCompiledArtifacts).toHaveBeenCalledWith(
      'tenant_a',
      'rev_1',
      expect.objectContaining({
        artifactsPath: '/tmp/revisions/rev_1',
        pages: expect.any(Array),
      })
    );
    expect(result.revision.artifactsPath).toBe('/tmp/revisions/rev_1');
    expect(result.buildJob.status).toBe('queued');
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_a',
        type: 'website.revision.created',
        payload: expect.objectContaining({
          projectId: 'proj_1',
          revisionId: 'rev_1',
        }),
        idempotencyKey: 'website.revision.created:rev_1',
      })
    );
  });

  it('surfaces CODEGEN_REJECTED and does not attach artifacts', async () => {
    const repo = makeRepo();
    const compiler = makeCompiler({
      validate: jest.fn().mockImplementation(() => {
        throw new CodegenRejectedError('Unknown or disallowed block type: EvilScript');
      }),
    });
    const useCase = new CreateRevisionUseCase(repo, compiler);

    await expect(
      useCase.execute('tenant_a', 'proj_1', {
        plan: {
          version: 1,
          pages: [
            {
              path: '/',
              title: 'Home',
              tree: { type: 'Page', children: [{ type: 'EvilScript' }] },
            },
          ],
        },
      })
    ).rejects.toMatchObject({ code: 'CODEGEN_REJECTED' });

    expect(repo.createRevision).not.toHaveBeenCalled();
    expect(repo.attachCompiledArtifacts).not.toHaveBeenCalled();
  });

  it('rejects missing tenant (security)', async () => {
    const repo = makeRepo();
    const useCase = new CreateRevisionUseCase(repo, makeCompiler());
    await expect(useCase.execute('', 'proj_1')).rejects.toBeInstanceOf(MissingTenantError);
  });

  it('rejects unknown project', async () => {
    const repo = makeRepo({
      findProjectById: jest.fn().mockResolvedValue(null),
    });
    const useCase = new CreateRevisionUseCase(repo, makeCompiler());
    await expect(useCase.execute('tenant_a', 'missing')).rejects.toBeInstanceOf(
      ProjectNotFoundError
    );
  });
});
