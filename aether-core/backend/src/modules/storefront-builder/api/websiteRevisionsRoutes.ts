import { Router, Request, Response } from 'express';
import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../shared/security/rbac';
import { RevisionNotFoundError } from '../application/use-cases/ListPagesUseCase';
import { handleWebsiteError, RevisionNotReadyError, sendWebsiteError } from './websiteErrors';
import {
  mapBuildJobQueued,
  mapPageSummary,
  mapRevisionDetail,
} from './websiteMappers';

const router = Router();

router.get('/revisions/:revisionId', requireViewer, async (req: Request, res: Response) => {
  try {
    const root = getCompositionRoot();
    const revision = await root.getSiteRevision.execute(
      req.tenantId!,
      req.params.revisionId
    );
    if (!revision) {
      sendWebsiteError(res, 404, 'PROJECT_NOT_FOUND', 'Site revision not found');
      return;
    }
    const pages = await root.listSitePages.execute(req.tenantId!, revision.id);
    const artifactKeys = revision.artifactsPath
      ? [`${revision.artifactsPath}/manifest.json`]
      : [];
    res.json({
      revision: mapRevisionDetail(revision, pages, artifactKeys),
    });
  } catch (err) {
    if (handleWebsiteError(res, err)) return;
    sendWebsiteError(res, 500, 'INTERNAL_ERROR', (err as Error).message);
  }
});

router.get(
  '/revisions/:revisionId/pages',
  requireViewer,
  async (req: Request, res: Response) => {
    try {
      const { listSitePages } = getCompositionRoot();
      const pages = await listSitePages.execute(req.tenantId!, req.params.revisionId);
      res.json({ pages: pages.map(mapPageSummary) });
    } catch (err) {
      if (handleWebsiteError(res, err)) return;
      sendWebsiteError(res, 500, 'INTERNAL_ERROR', (err as Error).message);
    }
  }
);

router.post(
  '/revisions/:revisionId/build',
  requireOperator,
  async (req: Request, res: Response) => {
    try {
      const root = getCompositionRoot();
      const revision = await root.getSiteRevision.execute(
        req.tenantId!,
        req.params.revisionId
      );
      if (!revision) {
        throw new RevisionNotFoundError(req.params.revisionId);
      }

      const plan = revision.planJson as { generating?: boolean } | null;
      if (plan && plan.generating === true) {
        throw new RevisionNotReadyError(revision.id);
      }

      const job = await root.startSiteBuild.execute(req.tenantId!, req.params.revisionId);
      res.status(202).json({ buildJob: mapBuildJobQueued(job) });
    } catch (err) {
      if (handleWebsiteError(res, err)) return;
      sendWebsiteError(res, 400, 'VALIDATION_FAILED', (err as Error).message);
    }
  }
);

router.post(
  '/revisions/:revisionId/publish',
  requireOperator,
  async (req: Request, res: Response) => {
    try {
      const root = getCompositionRoot();
      const revision = await root.getSiteRevision.execute(
        req.tenantId!,
        req.params.revisionId
      );
      if (!revision) {
        throw new RevisionNotFoundError(req.params.revisionId);
      }

      // Optional gate: explicit generating marker in plan (agents set this during P05/P06).
      const plan = revision.planJson as { generating?: boolean } | null;
      if (plan && plan.generating === true) {
        throw new RevisionNotReadyError(revision.id);
      }

      const { approval } = await root.proposeSitePublish.execute(
        req.tenantId!,
        req.params.revisionId,
        { requestedBy: req.actorId }
      );

      res.status(201).json({
        approval: {
          id: approval.id,
          type: approval.type,
          status: approval.status,
          payload: approval.payload,
        },
      });
    } catch (err) {
      if (handleWebsiteError(res, err)) return;
      sendWebsiteError(res, 400, 'VALIDATION_FAILED', (err as Error).message);
    }
  }
);

export default router;
