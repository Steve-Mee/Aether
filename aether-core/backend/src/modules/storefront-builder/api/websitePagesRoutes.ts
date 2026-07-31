import { Router, Request, Response } from 'express';
import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../shared/security/rbac';
import { validateBody } from '../../../shared/security/validate';
import { handleWebsiteError, sendWebsiteError } from './websiteErrors';
import { mapBuildJobQueued, mapPageDetail, mapRevisionCreate } from './websiteMappers';
import { pageCopySchema } from './websiteSchemas';

const router = Router();

router.get('/pages/:pageId', requireViewer, async (req: Request, res: Response) => {
  const { getSitePage } = getCompositionRoot();
  const page = await getSitePage.execute(req.tenantId!, req.params.pageId);
  if (!page) {
    sendWebsiteError(res, 404, 'PROJECT_NOT_FOUND', 'Site page not found');
    return;
  }
  res.json({ page: mapPageDetail(page) });
});

router.patch(
  '/pages/:pageId/copy',
  requireOperator,
  validateBody(pageCopySchema),
  async (req: Request, res: Response) => {
    try {
      const { updateSitePageCopy } = getCompositionRoot();
      const result = await updateSitePageCopy.execute(req.tenantId!, req.params.pageId, {
        headline: req.body.headline,
        subheadline: req.body.subheadline,
      });
      res.status(201).json({
        pagePath: result.pagePath,
        revision: mapRevisionCreate(result.revision),
        buildJob: mapBuildJobQueued(result.buildJob),
        published: false,
      });
    } catch (err) {
      if (handleWebsiteError(res, err)) return;
      sendWebsiteError(res, 400, 'VALIDATION_FAILED', (err as Error).message);
    }
  }
);

export default router;
