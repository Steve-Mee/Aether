import PDFDocument from 'pdfkit';
import { prisma } from '../../../shared/prisma/client';
import { writeAuditLog } from '../../../shared/audit/auditService';
import { explainabilityPersister } from './ExplainabilityPersister';
import { buildExplainabilityTimeline } from '../../../shared/explain/explainabilityTimeline';
import type { ExplainabilityPayload, ExplainabilitySourceType } from './types';

export interface ExplainabilityExportBundle {
  exportedAt: string;
  tenantId: string;
  snapshot: {
    id: string;
    sourceType: string;
    sourceId: string;
    summary: string;
    summarySource: string;
    detailLevel: string;
    agentKeys: string[];
    createdAt: string;
    payload: ExplainabilityPayload;
    flowGraph?: unknown;
  };
  timeline: Awaited<ReturnType<typeof buildExplainabilityTimeline>>;
  auditEntries: Array<{ at: string; action: string; actor?: string | null; details?: unknown }>;
  linkedRecords?: {
    commandId?: string;
    suggestionId?: string;
  };
}

export class ExplainabilityExportService {
  async exportSingle(params: {
    tenantId: string;
    entityType: 'command' | 'proactive_suggestion' | 'proactive_auto';
    entityId: string;
    actorId?: string;
  }): Promise<ExplainabilityExportBundle> {
    const sourceType: ExplainabilitySourceType =
      params.entityType === 'command'
        ? 'command'
        : params.entityType === 'proactive_auto'
          ? 'proactive_auto'
          : 'proactive_suggestion';

    const snapshot = await explainabilityPersister.getSnapshot(
      params.tenantId,
      sourceType,
      params.entityId
    );
    if (!snapshot) {
      throw new Error('Explainability snapshot not found');
    }

    const timeline = await buildExplainabilityTimeline({
      tenantId: params.tenantId,
      entityType:
        params.entityType === 'proactive_auto'
          ? 'proactive_suggestion'
          : params.entityType,
      entityId: params.entityId,
    });

    const audits = await prisma.auditLog.findMany({
      where: {
        tenantId: params.tenantId,
        details: { contains: params.entityId },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    const payload = snapshot.payload as unknown as ExplainabilityPayload;
    const bundle: ExplainabilityExportBundle = {
      exportedAt: new Date().toISOString(),
      tenantId: params.tenantId,
      snapshot: {
        id: snapshot.id,
        sourceType: snapshot.sourceType,
        sourceId: snapshot.sourceId,
        summary: snapshot.summary,
        summarySource: snapshot.summarySource,
        detailLevel: snapshot.detailLevel,
        agentKeys: snapshot.agentKeys,
        createdAt: snapshot.createdAt.toISOString(),
        payload,
        flowGraph: snapshot.flowGraph ?? undefined,
      },
      timeline,
      auditEntries: audits.map((a) => ({
        at: a.createdAt.toISOString(),
        action: a.action,
        actor: a.actor,
        details: typeof a.details === 'string' ? JSON.parse(a.details) : a.details,
      })),
      linkedRecords: {
        commandId: payload.linkedCommandId,
        suggestionId: payload.linkedSuggestionId,
      },
    };

    await writeAuditLog({
      tenantId: params.tenantId,
      module: 'explainability',
      action: 'explainability_exported',
      actor: params.actorId ?? 'system',
      details: {
        entityType: params.entityType,
        entityId: params.entityId,
        format: 'json',
      },
    });

    return bundle;
  }

  async exportAuditRange(params: {
    tenantId: string;
    since: Date;
    until: Date;
    actorId?: string;
  }): Promise<{ exportedAt: string; tenantId: string; count: number; snapshots: ExplainabilityExportBundle['snapshot'][] }> {
    const rows = await explainabilityPersister.listForAuditExport(
      params.tenantId,
      params.since,
      params.until
    );

    const snapshots = rows.map((row) => ({
      id: row.id,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      summary: row.summary,
      summarySource: row.summarySource,
      detailLevel: row.detailLevel,
      agentKeys: row.agentKeys,
      createdAt: row.createdAt.toISOString(),
      payload: row.payload as unknown as ExplainabilityPayload,
      flowGraph: row.flowGraph ?? undefined,
    }));

    await writeAuditLog({
      tenantId: params.tenantId,
      module: 'explainability',
      action: 'explainability_audit_exported',
      actor: params.actorId ?? 'system',
      details: {
        since: params.since.toISOString(),
        until: params.until.toISOString(),
        count: snapshots.length,
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      tenantId: params.tenantId,
      count: snapshots.length,
      snapshots,
    };
  }

  async renderPdf(bundle: ExplainabilityExportBundle): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('AETHER Explainability Report', { underline: true });
      doc.moveDown();
      doc.fontSize(10).fillColor('#666');
      doc.text(`Exported: ${bundle.exportedAt}`);
      doc.text(`Tenant: ${bundle.tenantId}`);
      doc.text(`Source: ${bundle.snapshot.sourceType} / ${bundle.snapshot.sourceId}`);
      doc.text(`Created: ${bundle.snapshot.createdAt}`);
      doc.moveDown();

      doc.fillColor('#000').fontSize(14).text('Samenvatting');
      doc.fontSize(11).text(bundle.snapshot.summary);
      doc.moveDown();

      if (bundle.snapshot.agentKeys.length > 0) {
        doc.fontSize(14).text('Agents');
        doc.fontSize(11).text(bundle.snapshot.agentKeys.join(', '));
        doc.moveDown();
      }

      for (const section of bundle.timeline.sections ?? []) {
        doc.fontSize(13).text(section.title);
        for (const item of section.items) {
          doc.fontSize(10).text(`• ${item.label}`);
          if (item.detail) doc.fontSize(9).fillColor('#444').text(`  ${item.detail}`);
          doc.fillColor('#000');
        }
        doc.moveDown(0.5);
      }

      if (bundle.timeline.similarActions && bundle.timeline.similarActions.length > 0) {
        doc.fontSize(13).text('Vergelijkbare acties');
        for (const sim of bundle.timeline.similarActions) {
          const scopeLabel = sim.scope === 'global' ? '[global patroon] ' : '';
          doc.fontSize(10).text(`• ${scopeLabel}[${sim.similarityScore}] ${sim.summary.slice(0, 120)}`);
        }
        doc.moveDown();
      }

      doc.fontSize(9).fillColor('#888').text('Generated by AETHER Explainability Export');
      doc.end();
    });
  }
}

export const explainabilityExportService = new ExplainabilityExportService();
