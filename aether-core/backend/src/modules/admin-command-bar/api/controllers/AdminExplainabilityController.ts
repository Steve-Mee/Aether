import { Request, Response } from 'express';
import { requireViewer } from '../../../../shared/security/rbac';
import {
  buildAutonomyTrace,
  buildExplainabilityTimeline,
} from '../../../../shared/explain/ExplainabilityService';

export class AdminExplainabilityController {
  getExplainability = [
    requireViewer,
    async (req: Request, res: Response) => {
      const entityType = String(req.query.entityType ?? 'email') as
        | 'email'
        | 'approval'
        | 'command'
        | 'proactive_suggestion';
      const entityId = String(req.query.entityId ?? '');
      if (!entityId) {
        res.status(400).json({ error: 'entityId query required' });
        return;
      }
      try {
        const timeline = await buildExplainabilityTimeline({
          tenantId: req.tenantId!,
          entityType,
          entityId,
        });
        res.json(timeline);
      } catch {
        res.status(404).json({ error: 'Entity not found' });
      }
    },
  ];

  getExplainabilityDiff = [
    requireViewer,
    async (req: Request, res: Response) => {
      const leftType = String(req.query.leftType ?? '') as import('../../../../ai/intelligence/explainability/types').ExplainabilitySourceType;
      const leftId = String(req.query.leftId ?? '');
      const rightType = String(req.query.rightType ?? '') as import('../../../../ai/intelligence/explainability/types').ExplainabilitySourceType;
      const rightId = String(req.query.rightId ?? '');
      if (!leftId || !rightId) {
        res.status(400).json({ error: 'leftId and rightId required' });
        return;
      }
      try {
        const { explainabilityDiffService } = await import(
          '../../../../ai/intelligence/explainability/ExplainabilityDiffService'
        );
        const diff = await explainabilityDiffService.diff({
          tenantId: req.tenantId!,
          left: { sourceType: leftType, sourceId: leftId },
          right: { sourceType: rightType, sourceId: rightId },
        });
        res.json(diff);
      } catch {
        res.status(404).json({ error: 'Diff not found' });
      }
    },
  ];

  exportExplainability = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { getMerchantSettings } = await import('../../../../shared/settings/TenantSettingsService');
      const { explainabilityExportService } = await import(
        '../../../../ai/intelligence/explainability/ExplainabilityExportService'
      );
      const settings = await getMerchantSettings(req.tenantId!);
      if (!settings.dataExportEnabled) {
        res.status(403).json({ error: 'Data export disabled for this tenant' });
        return;
      }

      const entityType = String(req.query.entityType ?? 'command') as
        | 'command'
        | 'proactive_suggestion'
        | 'proactive_auto';
      const entityId = String(req.query.entityId ?? '');
      const format = String(req.query.format ?? 'json') as 'json' | 'pdf';
      if (!entityId) {
        res.status(400).json({ error: 'entityId query required' });
        return;
      }

      try {
        const bundle = await explainabilityExportService.exportSingle({
          tenantId: req.tenantId!,
          entityType,
          entityId,
          actorId: req.actorId,
        });

        if (format === 'pdf') {
          const pdf = await explainabilityExportService.renderPdf(bundle);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="explainability-${entityId}.pdf"`
          );
          res.send(pdf);
          return;
        }

        res.json(bundle);
      } catch {
        res.status(404).json({ error: 'Export not found' });
      }
    },
  ];

  auditExportExplainability = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { getMerchantSettings } = await import('../../../../shared/settings/TenantSettingsService');
      const { explainabilityExportService } = await import(
        '../../../../ai/intelligence/explainability/ExplainabilityExportService'
      );
      const settings = await getMerchantSettings(req.tenantId!);
      if (!settings.dataExportEnabled) {
        res.status(403).json({ error: 'Data export disabled for this tenant' });
        return;
      }

      const since = req.query.since
        ? new Date(String(req.query.since))
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const until = req.query.until ? new Date(String(req.query.until)) : new Date();
      const format = String(req.query.format ?? 'json') as 'json' | 'pdf';

      const bundle = await explainabilityExportService.exportAuditRange({
        tenantId: req.tenantId!,
        since,
        until,
        actorId: req.actorId,
      });

      if (format === 'pdf') {
        const pdf = await explainabilityExportService.renderPdf({
          exportedAt: bundle.exportedAt,
          tenantId: bundle.tenantId,
          snapshot: bundle.snapshots[0] ?? {
            id: 'bulk',
            sourceType: 'audit',
            sourceId: 'bulk',
            summary: `Audit export (${bundle.count} snapshots)`,
            summarySource: 'template',
            detailLevel: 'simple',
            agentKeys: [],
            createdAt: bundle.exportedAt,
            payload: {
              summary: '',
              agents: [],
              dataSources: [],
              reasoningSteps: [],
              reflections: [],
            },
          },
          timeline: {
            entityType: 'command',
            entityId: 'audit',
            detailLevel: 'simple',
            summary: `Bulk audit export: ${bundle.count} snapshots`,
            sections: [],
          },
          auditEntries: [],
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="explainability-audit.pdf"');
        res.send(pdf);
        return;
      }

      res.json(bundle);
    },
  ];

  getAutonomyTrace = [
    requireViewer,
    async (req: Request, res: Response) => {
      const module = req.query.module ? String(req.query.module) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const trace = await buildAutonomyTrace({
        tenantId: req.tenantId!,
        module,
        limit,
      });
      res.json(trace);
    },
  ];
}
