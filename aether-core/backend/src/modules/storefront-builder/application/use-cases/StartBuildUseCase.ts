import { eventBus } from '../../../../shared/events/eventBus';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { BuildJob } from '../../domain/entities/BuildJob';
import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { CodegenCompilerPort } from '../ports/CodegenCompilerPort';
import { PreviewHostPort } from '../ports/PreviewHostPort';
import {
  runStructuralBuildChecks,
  toStructuralQaReportJson,
} from '../services/structuralBuildQa';
import { QA_PUBLISH_THRESHOLD } from './ProposePublishUseCase';
import { RevisionNotFoundError } from './ListPagesUseCase';

export class BuildQaFailedError extends Error {
  readonly qaScore: number;
  readonly qaReportJson: Record<string, unknown>;

  constructor(qaReportJson: Record<string, unknown>) {
    const score =
      typeof qaReportJson.score === 'number' ? qaReportJson.score : Number(qaReportJson.score);
    super(
      `Structural build QA failed (score ${score} < ${QA_PUBLISH_THRESHOLD}); fix plan/artifacts before publish`
    );
    this.name = 'BuildQaFailedError';
    this.qaScore = Number.isFinite(score) ? score : 0;
    this.qaReportJson = qaReportJson;
  }
}

/**
 * Compile → structural QA (shared with StoreQA) → preview host → BuildJob succeeded.
 * Runs synchronously for local/dev; QA failure marks the job failed (no fake pass).
 */
export class StartBuildUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly codegenCompiler: CodegenCompilerPort,
    private readonly previewHost: PreviewHostPort
  ) {}

  async execute(tenantId: string, revisionId: string): Promise<BuildJob> {
    const tid = requireTenantId(tenantId, 'StartBuildUseCase.execute');
    const revision = await this.siteRepository.findRevisionById(tid, revisionId);
    if (!revision) {
      throw new RevisionNotFoundError(revisionId);
    }

    let job = await this.siteRepository.createBuildJob(tid, revisionId);
    const startedAt = new Date();
    job = await this.siteRepository.updateBuildJob(tid, job.id, {
      status: 'running',
      startedAt,
      logs: 'Build started: compile → structural QA → preview',
    });

    try {
      const compiled = await this.codegenCompiler.compile({
        tenantId: tid,
        revisionId: revision.id,
        briefJson: revision.briefJson,
        planJson: revision.planJson,
      });

      const qaResult = runStructuralBuildChecks({
        planJson: revision.planJson,
        artifactsPath: compiled.artifactsPath,
      });
      const qaReportJson = toStructuralQaReportJson(qaResult);

      await this.siteRepository.attachCompiledArtifacts(tid, revision.id, {
        artifactsPath: compiled.artifactsPath,
        pages: compiled.pages,
        qaReportJson,
      });

      if (!qaResult.passed || qaResult.score < QA_PUBLISH_THRESHOLD) {
        throw new BuildQaFailedError(qaReportJson);
      }

      const preview = await this.previewHost.startPreview({
        tenantId: tid,
        projectId: revision.projectId,
        revisionId: revision.id,
        artifactsPath: compiled.artifactsPath,
      });

      const finished = await this.siteRepository.updateBuildJob(tid, job.id, {
        status: 'succeeded',
        previewUrl: preview.previewUrl,
        finishedAt: new Date(),
        logs: 'Build succeeded: artifacts compiled, structural QA recorded, preview URL signed',
      });

      await eventBus.publish({
        tenantId: tid,
        type: 'website.build.finished',
        payload: {
          projectId: revision.projectId,
          revisionId: revision.id,
          buildJobId: finished.id,
          status: 'succeeded',
        },
        idempotencyKey: `website.build.finished:${finished.id}`,
      });

      return finished;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const failed = await this.siteRepository.updateBuildJob(tid, job.id, {
        status: 'failed',
        finishedAt: new Date(),
        logs: `Build failed: ${message}`,
        previewUrl: null,
      });

      await eventBus.publish({
        tenantId: tid,
        type: 'website.build.finished',
        payload: {
          projectId: revision.projectId,
          revisionId: revision.id,
          buildJobId: failed.id,
          status: 'failed',
        },
        idempotencyKey: `website.build.finished:${failed.id}`,
      });

      throw err;
    }
  }
}
