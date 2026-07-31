import { eventBus } from '../../../../shared/events/eventBus';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { CreateRevisionResult, SiteRepository } from '../../domain/repositories/SiteRepository';
import { CodegenCompilerPort } from '../ports/CodegenCompilerPort';

export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Site project not found: ${projectId}`);
    this.name = 'ProjectNotFoundError';
  }
}

export class CreateRevisionUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly codegenCompiler: CodegenCompilerPort
  ) {}

  async execute(
    tenantId: string,
    projectId: string,
    data: {
      parentRevisionId?: string | null;
      brief?: unknown;
      plan?: unknown;
      createdByAgent?: string | null;
    } = {}
  ): Promise<CreateRevisionResult> {
    const tid = requireTenantId(tenantId, 'CreateRevisionUseCase.execute');
    const project = await this.siteRepository.findProjectById(tid, projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const briefJson = data.brief ?? {};
    const planJson = data.plan ?? {};

    if (this.codegenCompiler.validate) {
      this.codegenCompiler.validate({ briefJson, planJson });
    }

    const created = await this.siteRepository.createRevision(tid, {
      projectId,
      parentRevisionId: data.parentRevisionId ?? null,
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
        projectId,
        revisionId: revision.id,
        version: revision.version,
      },
      idempotencyKey: `website.revision.created:${revision.id}`,
    });

    return { revision, buildJob: created.buildJob };
  }
}
