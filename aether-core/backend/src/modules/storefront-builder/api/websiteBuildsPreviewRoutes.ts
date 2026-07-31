import { Router, Request, Response } from 'express';
import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { requireViewer } from '../../../shared/security/rbac';
import { handleWebsiteError, sendWebsiteError } from './websiteErrors';
import { mapBuildJobDetail } from './websiteMappers';

const router = Router();

router.get('/builds/:buildId', requireViewer, async (req: Request, res: Response) => {
  const root = getCompositionRoot();
  const job = await root.getSiteBuildJob.execute(req.tenantId!, req.params.buildId);
  if (!job) {
    sendWebsiteError(res, 404, 'PROJECT_NOT_FOUND', 'Build job not found');
    return;
  }
  const revision = await root.getSiteRevision.execute(req.tenantId!, job.revisionId);
  res.json({
    buildJob: mapBuildJobDetail(job, revision?.qaReportJson ?? null),
  });
});

router.get('/preview/:revisionId', requireViewer, async (req: Request, res: Response) => {
  try {
    const { getSitePreviewUrl } = getCompositionRoot();
    const preview = await getSitePreviewUrl.execute(
      req.tenantId!,
      req.params.revisionId
    );
    res.json(preview);
  } catch (err) {
    if (handleWebsiteError(res, err)) return;
    sendWebsiteError(res, 500, 'INTERNAL_ERROR', (err as Error).message);
  }
});

export default router;
