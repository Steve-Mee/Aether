import * as fs from 'fs';
import * as path from 'path';
import {
  CreateSiteProjectUseCase,
  DuplicateSiteSlugError,
} from '../application/use-cases/CreateSiteProjectUseCase';
import { CodegenCompilerPort } from '../application/ports/CodegenCompilerPort';
import { BuildJob } from '../domain/entities/BuildJob';
import { SiteProject } from '../domain/entities/SiteProject';
import { SiteRevision } from '../domain/entities/SiteRevision';
import { SiteRepository } from '../domain/repositories/SiteRepository';
import { InvalidStorefrontSlugError } from '../domain/validateStorefrontSlug';
import { MissingTenantError } from '../../../shared/tenant/tenantContext';

jest.mock('../../../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

function makeCompiler(overrides: Partial<CodegenCompilerPort> = {}): CodegenCompilerPort {
  return {
    validate: jest.fn().mockReturnValue({}),
    compile: jest.fn().mockResolvedValue({
      artifactsPath: 'revisions/rev_1',
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

function makeRepo(overrides: Partial<SiteRepository> = {}): SiteRepository {
  const project = new SiteProject(
    'proj_1',
    'tenant_a',
    'atelier-noord',
    null,
    'draft',
    null,
    new Date('2026-07-26T08:00:00.000Z'),
    new Date('2026-07-26T08:00:00.000Z')
  );
  const revision = new SiteRevision(
    'rev_1',
    'proj_1',
    1,
    { prompt: 'Handmade keramiek' },
    {},
    null,
    null,
    null,
    null,
    new Date('2026-07-26T08:00:00.000Z')
  );
  const readyRevision = new SiteRevision(
    'rev_1',
    'proj_1',
    1,
    { prompt: 'Handmade keramiek' },
    {},
    'revisions/rev_1',
    null,
    null,
    null,
    new Date('2026-07-26T08:00:00.000Z')
  );
  const buildJob = new BuildJob(
    'build_1',
    'rev_1',
    'queued',
    null,
    null,
    null,
    null,
    new Date('2026-07-26T08:00:00.000Z')
  );

  return {
    findProjectById: jest.fn().mockResolvedValue(null),
    findProjectBySlug: jest.fn().mockResolvedValue(null),
    findProjectByPublicSlug: jest.fn().mockResolvedValue(null),
    listProjects: jest.fn().mockResolvedValue([]),
    createProjectWithInitialRevision: jest.fn().mockResolvedValue({
      project,
      revision,
      buildJob,
    }),
    findRevisionById: jest.fn().mockResolvedValue(null),
    listRevisions: jest.fn().mockResolvedValue([]),
    createRevision: jest.fn().mockResolvedValue({ revision, buildJob }),
    attachCompiledArtifacts: jest.fn().mockResolvedValue(readyRevision),
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

describe('CreateSiteProjectUseCase', () => {
  it('creates project + revision + queued BuildJob for tenant', async () => {
    const repo = makeRepo();
    const compiler = makeCompiler();
    const useCase = new CreateSiteProjectUseCase(repo, compiler);

    const result = await useCase.execute('tenant_a', {
      slug: 'atelier-noord',
      brief: { prompt: 'Handmade keramiek' },
    });

    expect(result.project.tenantId).toBe('tenant_a');
    expect(result.project.slug).toBe('atelier-noord');
    expect(result.project.status).toBe('draft');
    expect(result.revision.version).toBe(1);
    expect(result.revision.artifactsPath).toBe('revisions/rev_1');
    expect(result.buildJob.status).toBe('queued');
    expect(repo.findProjectBySlug).toHaveBeenCalledWith('tenant_a', 'atelier-noord');
    expect(repo.createProjectWithInitialRevision).toHaveBeenCalledWith('tenant_a', {
      slug: 'atelier-noord',
      primaryDomain: null,
      briefJson: { prompt: 'Handmade keramiek' },
      planJson: {},
      createdByAgent: null,
    });
    expect(compiler.compile).toHaveBeenCalled();
    expect(repo.attachCompiledArtifacts).toHaveBeenCalled();
  });

  it('rejects duplicate slug', async () => {
    const existing = new SiteProject(
      'proj_existing',
      'tenant_a',
      'atelier-noord',
      null,
      'draft',
      null,
      new Date(),
      new Date()
    );
    const repo = makeRepo({
      findProjectBySlug: jest.fn().mockResolvedValue(existing),
    });
    const useCase = new CreateSiteProjectUseCase(repo, makeCompiler());

    await expect(
      useCase.execute('tenant_a', { slug: 'atelier-noord' })
    ).rejects.toBeInstanceOf(DuplicateSiteSlugError);
    expect(repo.createProjectWithInitialRevision).not.toHaveBeenCalled();
  });

  it('rejects missing tenantId (security)', async () => {
    const repo = makeRepo();
    const useCase = new CreateSiteProjectUseCase(repo, makeCompiler());

    await expect(useCase.execute('', { slug: 'x' })).rejects.toBeInstanceOf(MissingTenantError);
    expect(repo.createProjectWithInitialRevision).not.toHaveBeenCalled();
  });

  it('rejects path-traversal / invalid slugs (security)', async () => {
    const repo = makeRepo();
    const useCase = new CreateSiteProjectUseCase(repo, makeCompiler());

    await expect(useCase.execute('tenant_a', { slug: '../etc' })).rejects.toBeInstanceOf(
      InvalidStorefrontSlugError
    );
    await expect(useCase.execute('tenant_a', { slug: 'Bad_Slug' })).rejects.toBeInstanceOf(
      InvalidStorefrontSlugError
    );
    await expect(useCase.execute('tenant_a', { slug: '-leading' })).rejects.toBeInstanceOf(
      InvalidStorefrontSlugError
    );
    expect(repo.createProjectWithInitialRevision).not.toHaveBeenCalled();
  });
});

describe('PrismaSiteRepository tenant scoping', () => {
  it('every public method requires tenantId and filters by tenant', () => {
    const repoPath = path.resolve(
      __dirname,
      '../infrastructure/persistence/PrismaSiteRepository.ts'
    );
    const source = fs.readFileSync(repoPath, 'utf8');

    const methods = [
      'findProjectById',
      'findProjectBySlug',
      'listProjects',
      'createProjectWithInitialRevision',
      'findRevisionById',
      'listRevisions',
      'createRevision',
      'attachCompiledArtifacts',
      'listPages',
      'findPageById',
      'findPageByPath',
      'createBuildJob',
      'findBuildJobById',
      'updateBuildJob',
      'findDeployTarget',
      'upsertDeployTarget',
      'markProjectLive',
      'listLiveProjects',
      'demoteProjectFromLive',
      'listRecentBuildJobsForProject',
    ];

    for (const method of methods) {
      expect(source).toContain(`PrismaSiteRepository.${method}`);
      expect(source).toMatch(new RegExp(`async ${method}\\(\\s*tenantId`));
    }

    // Public slug resolve is intentionally unscoped by admin tenant header (P04).
    expect(source).toContain('async findProjectByPublicSlug');
    expect(source).toMatch(/async findProjectByPublicSlug\(\s*slug/);

    // Child entities must join through project.tenantId (not bare id lookups).
    const siteRepoDir = path.resolve(
      __dirname,
      '../infrastructure/persistence/siteRepo'
    );
    const siteRepoSource = fs
      .readdirSync(siteRepoDir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => fs.readFileSync(path.join(siteRepoDir, f), 'utf8'))
      .join('\n');
    expect(siteRepoSource).toContain('project: { tenantId: tid }');
    expect(source).not.toMatch(/tenant_default/);
    expect(siteRepoSource).not.toMatch(/tenant_default/);
  });
});
