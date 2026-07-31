import type { CreateRevisionUseCase } from '../../../../modules/storefront-builder/application/use-cases/CreateRevisionUseCase';
import type { CreateSiteProjectUseCase } from '../../../../modules/storefront-builder/application/use-cases/CreateSiteProjectUseCase';
import type { GetSiteProjectUseCase } from '../../../../modules/storefront-builder/application/use-cases/GetSiteProjectUseCase';
import type { ListRevisionsUseCase } from '../../../../modules/storefront-builder/application/use-cases/ListRevisionsUseCase';
import type { ListSiteProjectsUseCase } from '../../../../modules/storefront-builder/application/use-cases/ListSiteProjectsUseCase';
import type { ProposePublishUseCase } from '../../../../modules/storefront-builder/application/use-cases/ProposePublishUseCase';
import type { StartBuildUseCase } from '../../../../modules/storefront-builder/application/use-cases/StartBuildUseCase';
import type { DeployPort } from '../../../../modules/storefront-builder/application/ports/DeployPort';
import type { PersonalBrainRegistry } from '../../personal-brain/PersonalBrainRegistry';
import { classifyBrainAction } from '../../personal-brain/tools/ActionRiskClassifier';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';
import { brandNameFromBrief, buildFallbackSitePlan } from './storefrontPlanFallback';
import { STORE_BUILDER_AGENT_KEY } from './StoreBuilderAgent';

export interface StoreBuilderToolsDeps {
  createSiteProject: Pick<CreateSiteProjectUseCase, 'execute'>;
  createSiteRevision: Pick<CreateRevisionUseCase, 'execute'>;
  startSiteBuild: Pick<StartBuildUseCase, 'execute'>;
  proposeSitePublish: Pick<ProposePublishUseCase, 'execute'>;
  listSiteProjects: Pick<ListSiteProjectsUseCase, 'execute'>;
  getSiteProject: Pick<GetSiteProjectUseCase, 'execute'>;
  listSiteRevisions: Pick<ListRevisionsUseCase, 'execute'>;
  /** Optional — used only in tests to assert proposePublish never deploys. */
  deployPort?: Pick<DeployPort, 'deploy'>;
  personalBrains?: PersonalBrainRegistry;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64);
}

async function rememberBrief(
  deps: StoreBuilderToolsDeps,
  tenantId: string,
  brief: unknown,
  intent: string
): Promise<void> {
  if (!deps.personalBrains) return;
  try {
    const brain = deps.personalBrains.get(tenantId, STORE_BUILDER_AGENT_KEY);
    const brand = brandNameFromBrief(brief);
    await brain.remember({
      command: `store_builder:${intent}`,
      intent,
      result: JSON.stringify({
        brandName: brand,
        brief,
        namespace: STORE_BUILDER_AGENT_KEY,
      }).slice(0, 2000),
    });
  } catch {
    // PersonalBrain write is best-effort
  }
}

export function createSiteProjectTool(deps: StoreBuilderToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'createSiteProject',
      description:
        'Create a new storefront SiteProject with initial revision (codegen). Medium-risk execute.',
      parameters: {
        slug: { type: 'string', required: false, description: 'URL slug (derived from brand if omitted)' },
        brief: { type: 'object', required: false, description: 'Natural-language brief / brand JSON' },
        plan: { type: 'object', required: false, description: 'Optional SitePlan; fallback synthesized if omitted' },
        primaryDomain: { type: 'string', required: false, description: 'Optional primary domain' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'storefront-builder',
    },
    validate(input) {
      const slug = String(input.slug ?? '').trim();
      const brand = brandNameFromBrief(input.brief);
      if (!slug && !brand) {
        return { ok: false, error: 'slug or brief.brand.name is required' };
      }
      return { ok: true };
    },
    async executeRead() {
      return { error: 'createSiteProject is propose/execute via confirmation — use executeConfirmed in tests' };
    },
    async buildProposal(_ctx, input) {
      const brief = input.brief ?? {};
      const derivedSlug = slugify(brandNameFromBrief(brief)) || 'store';
      const slug = String(input.slug ?? derivedSlug).trim();
      const plan = input.plan ?? buildFallbackSitePlan(brief);
      const assessment = classifyBrainAction('createSiteProject', input);
      return {
        tool: 'createSiteProject',
        summary: `Storefront project aanmaken: ${slug}`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: assessment.rationale,
        payload: {
          slug,
          brief,
          plan,
          primaryDomain: input.primaryDomain ? String(input.primaryDomain) : null,
        },
      };
    },
    async executeConfirmed(ctx, payload) {
      const slug = String(payload.slug ?? '').trim();
      const brief = payload.brief ?? {};
      const plan = payload.plan ?? buildFallbackSitePlan(brief);
      const created = await deps.createSiteProject.execute(ctx.tenantId, {
        slug,
        brief,
        plan,
        primaryDomain: payload.primaryDomain ? String(payload.primaryDomain) : null,
        createdByAgent: ctx.agentKey ?? STORE_BUILDER_AGENT_KEY,
      });
      await rememberBrief(deps, ctx.tenantId, brief, 'STORE_BUILD');
      return {
        success: true,
        result: `Created site project ${created.project.slug} (${created.project.id}) revision ${created.revision.id}`,
        operationalMeta: {
          projectId: created.project.id,
          revisionId: created.revision.id,
          buildJobId: created.buildJob.id,
          slug: created.project.slug,
        },
      };
    },
  };
}

export function createRevisionFromBriefTool(deps: StoreBuilderToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'createRevisionFromBrief',
      description: 'Create a new SiteRevision from a brief/plan delta on an existing project',
      parameters: {
        projectId: { type: 'string', required: true, description: 'SiteProject id' },
        brief: { type: 'object', required: false, description: 'Updated brief' },
        plan: { type: 'object', required: false, description: 'Updated SitePlan' },
        parentRevisionId: { type: 'string', required: false, description: 'Parent revision id' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'storefront-builder',
    },
    validate(input) {
      if (!String(input.projectId ?? '').trim()) {
        return { ok: false, error: 'projectId is required' };
      }
      return { ok: true };
    },
    async executeRead() {
      return { error: 'createRevisionFromBrief is propose/execute via confirmation' };
    },
    async buildProposal(_ctx, input) {
      const projectId = String(input.projectId).trim();
      const brief = input.brief ?? {};
      const plan = input.plan ?? buildFallbackSitePlan(brief);
      const assessment = classifyBrainAction('createRevisionFromBrief', input);
      return {
        tool: 'createRevisionFromBrief',
        summary: `Nieuwe storefront revision voor project ${projectId}`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: assessment.rationale,
        payload: {
          projectId,
          brief,
          plan,
          parentRevisionId: input.parentRevisionId ? String(input.parentRevisionId) : null,
        },
      };
    },
    async executeConfirmed(ctx, payload) {
      const projectId = String(payload.projectId);
      const brief = payload.brief ?? {};
      const plan = payload.plan ?? buildFallbackSitePlan(brief);
      const created = await deps.createSiteRevision.execute(ctx.tenantId, projectId, {
        brief,
        plan,
        parentRevisionId: payload.parentRevisionId ? String(payload.parentRevisionId) : null,
        createdByAgent: ctx.agentKey ?? STORE_BUILDER_AGENT_KEY,
      });
      await rememberBrief(deps, ctx.tenantId, brief, 'STORE_ITERATE');
      return {
        success: true,
        result: `Created revision ${created.revision.id} (v${created.revision.version})`,
        operationalMeta: {
          projectId,
          revisionId: created.revision.id,
          buildJobId: created.buildJob.id,
          version: created.revision.version,
        },
      };
    },
  };
}

export function runBuildTool(deps: StoreBuilderToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'runBuild',
      description: 'Queue a BuildJob for a SiteRevision (preview/build pipeline)',
      parameters: {
        revisionId: { type: 'string', required: true, description: 'SiteRevision id' },
      },
      risk: 'low',
      kind: 'read',
      module: 'storefront-builder',
    },
    validate(input) {
      if (!String(input.revisionId ?? '').trim()) {
        return { ok: false, error: 'revisionId is required' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const revisionId = String(input.revisionId).trim();
      const job = await deps.startSiteBuild.execute(ctx.tenantId, revisionId);
      return {
        success: true,
        buildJobId: job.id,
        revisionId: job.revisionId,
        status: job.status,
      };
    },
  };
}

/**
 * Propose publish only — creates PUBLISH_STOREFRONT approval.
 * NEVER calls DeployPort.
 */
export function proposePublishTool(deps: StoreBuilderToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'proposePublish',
      description:
        'Propose publishing a SiteRevision (creates approval). Does NOT deploy — merchant must approve.',
      parameters: {
        revisionId: { type: 'string', required: true, description: 'SiteRevision id to publish' },
      },
      risk: 'high',
      kind: 'propose',
      module: 'storefront-builder',
    },
    validate(input) {
      if (!String(input.revisionId ?? '').trim()) {
        return { ok: false, error: 'revisionId is required' };
      }
      return { ok: true };
    },
    async executeRead() {
      return { error: 'proposePublish is propose-only — never deploys directly' };
    },
    async buildProposal(_ctx, input) {
      const revisionId = String(input.revisionId).trim();
      const assessment = classifyBrainAction('proposePublish', input);
      return {
        tool: 'proposePublish',
        summary: `Storefront publiceren voorstellen (revision ${revisionId})`,
        risk: 'high',
        requiresApproval: true,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: 'Publish always requires human approval — DeployPort runs only after ApprovalExecutor (P07).',
        payload: { revisionId },
      };
    },
    async executeConfirmed(ctx, payload) {
      // Guard: never touch deploy from this tool
      if (deps.deployPort) {
        // Intentionally unused — presence in deps is for test assertion only
      }
      const revisionId = String(payload.revisionId);
      const { approval } = await deps.proposeSitePublish.execute(ctx.tenantId, revisionId, {
        requestedBy: ctx.actorId,
      });
      return {
        success: true,
        result: `Publish proposed — approval ${approval.id} (status ${approval.status}). Not deployed.`,
        operationalMeta: {
          approvalId: approval.id,
          type: approval.type,
          status: approval.status,
          projectId: approval.payload.projectId,
          revisionId: approval.payload.revisionId,
          deployed: false,
        },
      };
    },
  };
}

export function getStoreStatusTool(deps: StoreBuilderToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getStoreStatus',
      description: 'Summarize storefront projects, latest revisions, and QA status for the tenant',
      parameters: {
        projectId: { type: 'string', required: false, description: 'Optional project id filter' },
        limit: { type: 'number', required: false, description: 'Max projects (default 10)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'storefront-builder',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const projectId = input.projectId ? String(input.projectId).trim() : '';
      if (projectId) {
        const project = await deps.getSiteProject.execute(ctx.tenantId, projectId);
        if (!project) {
          return { success: false, error: `Site project not found: ${projectId}` };
        }
        const revisions = await deps.listSiteRevisions.execute(ctx.tenantId, projectId);
        const latest = revisions[0];
        return {
          success: true,
          project: {
            id: project.id,
            slug: project.slug,
            status: project.status,
            liveRevisionId: project.liveRevisionId,
          },
          revisionCount: revisions.length,
          latestRevision: latest
            ? {
                id: latest.id,
                version: latest.version,
                qaReportJson: latest.qaReportJson,
                artifactsPath: latest.artifactsPath,
              }
            : null,
        };
      }

      const limit = Math.min(Number(input.limit ?? 10), 50);
      const projects = await deps.listSiteProjects.execute(ctx.tenantId);
      return {
        success: true,
        count: projects.length,
        projects: projects.slice(0, limit).map((p) => ({
          id: p.id,
          slug: p.slug,
          status: p.status,
          liveRevisionId: p.liveRevisionId,
        })),
      };
    },
  };
}
