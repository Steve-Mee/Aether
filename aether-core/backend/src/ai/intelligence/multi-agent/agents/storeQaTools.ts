import type { SiteRevision } from '../../../../modules/storefront-builder/domain/entities/SiteRevision';
import {
  pagesFromPlanJson,
  runStructuralBuildChecks,
} from '../../../../modules/storefront-builder/application/services/structuralBuildQa';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface StoreQaRevisionPort {
  findRevisionById(tenantId: string, revisionId: string): Promise<SiteRevision | null>;
}

export interface StoreQaToolsDeps {
  revisions: StoreQaRevisionPort;
}

export function runBuildChecksTool(deps: StoreQaToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'runBuildChecks',
      description: 'Run structural QA checks on a SiteRevision (pages, allowlisted trees, artifacts)',
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
      const revision = await deps.revisions.findRevisionById(ctx.tenantId, revisionId);
      if (!revision) {
        return { success: false, error: `Revision not found: ${revisionId}` };
      }

      const result = runStructuralBuildChecks({
        planJson: revision.planJson,
        artifactsPath: revision.artifactsPath,
      });

      return {
        success: true,
        revisionId,
        projectId: revision.projectId,
        passed: result.passed,
        checks: result.checks,
        blockTypes: result.blockTypes,
        score: result.score,
      };
    },
  };
}

/** Honest Lighthouse stub — never claims measured budget pass; real CWV is manual/pilot. */
export function runLighthouseTool(deps: StoreQaToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'runLighthouse',
      description:
        'Report that Lighthouse/CWV is not measured in Birth (CI only asserts budget doc + runtime build)',
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
      const revision = await deps.revisions.findRevisionById(ctx.tenantId, revisionId);
      if (!revision) {
        return { success: false, error: `Revision not found: ${revisionId}` };
      }

      return {
        success: true,
        revisionId,
        projectId: revision.projectId,
        measured: false,
        budgetOk: null,
        scores: null,
        note: 'CWV not measured in Birth — see docs/storefront-lighthouse.md (budget doc + runtime build CI only)',
      };
    },
  };
}

export function diffRevisionsTool(deps: StoreQaToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'diffRevisions',
      description: 'Diff two SiteRevisions (page paths, tokens, copy keys)',
      parameters: {
        baseRevisionId: { type: 'string', required: true, description: 'Base revision id' },
        targetRevisionId: { type: 'string', required: true, description: 'Target revision id' },
      },
      risk: 'low',
      kind: 'read',
      module: 'storefront-builder',
    },
    validate(input) {
      if (!String(input.baseRevisionId ?? '').trim() || !String(input.targetRevisionId ?? '').trim()) {
        return { ok: false, error: 'baseRevisionId and targetRevisionId are required' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const baseId = String(input.baseRevisionId).trim();
      const targetId = String(input.targetRevisionId).trim();
      const [base, target] = await Promise.all([
        deps.revisions.findRevisionById(ctx.tenantId, baseId),
        deps.revisions.findRevisionById(ctx.tenantId, targetId),
      ]);
      if (!base) return { success: false, error: `Base revision not found: ${baseId}` };
      if (!target) return { success: false, error: `Target revision not found: ${targetId}` };
      if (base.projectId !== target.projectId) {
        return { success: false, error: 'Revisions belong to different projects' };
      }

      const basePaths = new Set(pagesFromPlanJson(base.planJson).map((p) => p.path ?? ''));
      const targetPaths = new Set(pagesFromPlanJson(target.planJson).map((p) => p.path ?? ''));
      const addedPages = [...targetPaths].filter((p) => p && !basePaths.has(p));
      const removedPages = [...basePaths].filter((p) => p && !targetPaths.has(p));

      return {
        success: true,
        baseRevisionId: baseId,
        targetRevisionId: targetId,
        projectId: base.projectId,
        versionDelta: target.version - base.version,
        addedPages,
        removedPages,
        briefChanged: JSON.stringify(base.briefJson) !== JSON.stringify(target.briefJson),
        planChanged: JSON.stringify(base.planJson) !== JSON.stringify(target.planJson),
      };
    },
  };
}
