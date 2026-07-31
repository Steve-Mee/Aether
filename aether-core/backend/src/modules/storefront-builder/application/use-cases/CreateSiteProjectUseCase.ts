import { eventBus } from '../../../../shared/events/eventBus';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { CreateSiteProjectResult, SiteRepository } from '../../domain/repositories/SiteRepository';
import { parseStorefrontSlug } from '../../domain/validateStorefrontSlug';
import { CodegenCompilerPort } from '../ports/CodegenCompilerPort';

export class DuplicateSiteSlugError extends Error {
  constructor(slug: string) {
    super(`Site project slug already exists: ${slug}`);
    this.name = 'DuplicateSiteSlugError';
  }
}

export class CreateSiteProjectUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly codegenCompiler: CodegenCompilerPort
  ) {}

  async execute(
    tenantId: string,
    data: {
      slug: string;
      primaryDomain?: string | null;
      brief?: unknown;
      plan?: unknown;
      createdByAgent?: string | null;
    }
  ): Promise<CreateSiteProjectResult> {
    const tid = requireTenantId(tenantId, 'CreateSiteProjectUseCase.execute');
    const slug = parseStorefrontSlug(data.slug ?? '');

    const existing = await this.siteRepository.findProjectBySlug(tid, slug);
    if (existing) {
      throw new DuplicateSiteSlugError(slug);
    }

    const briefJson = data.brief ?? {};
    const planJson = data.plan ?? {};

    if (this.codegenCompiler.validate) {
      this.codegenCompiler.validate({ briefJson, planJson });
    }

    const created = await this.siteRepository.createProjectWithInitialRevision(tid, {
      slug,
      primaryDomain: data.primaryDomain ?? null,
      briefJson,
      planJson,
      createdByAgent: data.createdByAgent ?? null,
    });

    const compiled = await this.codegenCompiler.compile({
      tenantId: tid,
      revisionId: created.revision.id,
      briefJson,
      planJson,
    });

    const revision = await this.siteRepository.attachCompiledArtifacts(
      tid,
      created.revision.id,
      {
        artifactsPath: compiled.artifactsPath,
        pages: compiled.pages,
        qaReportJson: {
          status: 'pending',
          checks: [],
          note: 'QA pending — run StartBuild for deterministic build checks',
        },
      }
    );

    await eventBus.publish({
      tenantId: tid,
      type: 'website.revision.created',
      payload: {
        projectId: created.project.id,
        revisionId: revision.id,
        slug,
        version: revision.version,
      },
      idempotencyKey: `website.revision.created:${revision.id}`,
    });

    return {
      project: created.project,
      revision,
      buildJob: created.buildJob,
    };
  }
}
