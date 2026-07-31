import { Router, Request, Response } from 'express';
import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../shared/security/rbac';
import { validateBody } from '../../../shared/security/validate';
import { handleWebsiteError, sendWebsiteError } from './websiteErrors';
import {
  extractQaScore,
  mapBuildJobQueued,
  mapDeployTarget,
  mapProjectDetail,
  mapProjectSummary,
  mapRevisionCreate,
  mapRevisionListItem,
} from './websiteMappers';
import {
  createProjectSchema,
  createRevisionSchema,
  deployTargetSchema,
} from './websiteSchemas';

const router = Router();

router.post(
  '/projects',
  requireOperator,
  validateBody(createProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const { createSiteProject } = getCompositionRoot();
      const result = await createSiteProject.execute(req.tenantId!, {
        slug: req.body.slug,
        brief: req.body.brief ?? {},
        primaryDomain: req.body.primaryDomain,
      });
      res.status(201).json({
        project: mapProjectSummary(result.project),
        revision: mapRevisionCreate(result.revision),
        buildJob: mapBuildJobQueued(result.buildJob),
      });
    } catch (err) {
      if (handleWebsiteError(res, err)) return;
      sendWebsiteError(res, 400, 'VALIDATION_FAILED', (err as Error).message);
    }
  }
);

router.get('/projects', requireViewer, async (req: Request, res: Response) => {
  const { listSiteProjects } = getCompositionRoot();
  const projects = await listSiteProjects.execute(req.tenantId!);
  res.json({ projects: projects.map(mapProjectSummary) });
});

router.get('/projects/:projectId', requireViewer, async (req: Request, res: Response) => {
  const root = getCompositionRoot();
  const project = await root.getSiteProject.execute(req.tenantId!, req.params.projectId);
  if (!project) {
    sendWebsiteError(res, 404, 'PROJECT_NOT_FOUND', 'Site project not found');
    return;
  }

  const revisions = await root.listSiteRevisions.execute(req.tenantId!, project.id);
  const latest = revisions[0] ?? null;
  let latestPreviewUrl: string | null = null;
  if (latest) {
    try {
      const preview = await root.getSitePreviewUrl.execute(req.tenantId!, latest.id);
      latestPreviewUrl = preview.previewUrl;
    } catch {
      latestPreviewUrl = null;
    }
  }

  res.json({
    project: mapProjectDetail(project, {
      latestRevisionId: latest?.id ?? null,
      latestPreviewUrl,
      latestQaScore: latest ? extractQaScore(latest.qaReportJson) : null,
    }),
  });
});

router.post(
  '/projects/:projectId/revisions',
  requireOperator,
  validateBody(createRevisionSchema),
  async (req: Request, res: Response) => {
    try {
      const { createSiteRevision } = getCompositionRoot();
      const briefPatch = req.body.briefPatch ?? {};
      const briefBase =
        req.body.brief && typeof req.body.brief === 'object' ? req.body.brief : {};
      const brief = {
        ...briefBase,
        ...briefPatch,
        ...(req.body.deltaPrompt ? { deltaPrompt: req.body.deltaPrompt } : {}),
      };

      const result = await createSiteRevision.execute(
        req.tenantId!,
        req.params.projectId,
        {
          parentRevisionId: req.body.parentRevisionId,
          brief,
          plan: req.body.plan ?? {},
        }
      );

      res.status(201).json({
        revision: mapRevisionCreate(result.revision),
        buildJob: mapBuildJobQueued(result.buildJob),
      });
    } catch (err) {
      if (handleWebsiteError(res, err)) return;
      sendWebsiteError(res, 400, 'VALIDATION_FAILED', (err as Error).message);
    }
  }
);

router.get(
  '/projects/:projectId/revisions',
  requireViewer,
  async (req: Request, res: Response) => {
    try {
      const root = getCompositionRoot();
      const revisions = await root.listSiteRevisions.execute(
        req.tenantId!,
        req.params.projectId
      );
      const mapped = await Promise.all(
        revisions.map(async (revision) => {
          let previewUrl: string | null = null;
          try {
            const preview = await root.getSitePreviewUrl.execute(req.tenantId!, revision.id);
            previewUrl = preview.previewUrl;
          } catch {
            previewUrl = null;
          }
          return mapRevisionListItem(revision, previewUrl);
        })
      );
      res.json({ revisions: mapped });
    } catch (err) {
      if (handleWebsiteError(res, err)) return;
      sendWebsiteError(res, 500, 'INTERNAL_ERROR', (err as Error).message);
    }
  }
);

router.get(
  '/projects/:projectId/deploy-target',
  requireViewer,
  async (req: Request, res: Response) => {
    try {
      const { getSiteDeployTarget } = getCompositionRoot();
      const target = await getSiteDeployTarget.execute(
        req.tenantId!,
        req.params.projectId
      );
      res.json({
        deployTarget: target
          ? mapDeployTarget(target)
          : { provider: null, liveUrl: null, configJson: {} },
      });
    } catch (err) {
      if (handleWebsiteError(res, err)) return;
      sendWebsiteError(res, 500, 'INTERNAL_ERROR', (err as Error).message);
    }
  }
);

router.put(
  '/projects/:projectId/deploy-target',
  requireOperator,
  validateBody(deployTargetSchema),
  async (req: Request, res: Response) => {
    try {
      const { upsertSiteDeployTarget } = getCompositionRoot();
      const body = req.body.deployTarget;
      const target = await upsertSiteDeployTarget.execute(
        req.tenantId!,
        req.params.projectId,
        {
          provider: body.provider,
          liveUrl: body.liveUrl,
          configJson: body.configJson ?? {},
        }
      );
      res.json({ deployTarget: mapDeployTarget(target) });
    } catch (err) {
      if (handleWebsiteError(res, err)) return;
      sendWebsiteError(res, 400, 'VALIDATION_FAILED', (err as Error).message);
    }
  }
);

export default router;
