import { prisma } from '../../../../shared/prisma/client';
import { labelForAction } from '../../../../shared/audit/activityLabels';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export type ActivityRisk = 'low' | 'high' | 'none';
export type ActivityStatus = 'autonomous' | 'approved' | 'rejected' | 'pending' | 'info';
export type ActivityExecutor = 'aether' | 'merchant';

export interface ActivityFeedItem {
  id: string;
  source: 'audit' | 'command';
  at: string;
  actionType: string;
  actionLabel: string;
  description: string;
  module: string;
  risk: ActivityRisk;
  status: ActivityStatus;
  executor: ActivityExecutor;
  impact?: { label: string; value: string };
  confidence?: number;
  rationale?: string;
  related?: { type: 'approval' | 'insight' | 'email'; id: string };
  details?: Record<string, unknown>;
}

export interface ActivityFeedQuery {
  tenantId: string;
  since: Date;
  limit?: number;
  module?: string;
  includeNav?: boolean;
}

function parseDetails(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function riskFromDetails(details: Record<string, unknown>, action: string): ActivityRisk {
  const r = details.risk ?? details.riskBand;
  if (r === 'high' || r === 'HIGH') return 'high';
  if (r === 'low' || r === 'LOW') return 'low';
  if (action === 'brain_tool_proposed') {
    const proposals = details.proposals;
    if (Array.isArray(proposals) && proposals.length > 0) {
      const first = proposals[0] as Record<string, unknown>;
      if (first.risk === 'high') return 'high';
      if (first.risk === 'medium') return 'high';
      if (first.risk === 'low') return 'low';
    }
  }
  if (action === 'approved' || action === 'rejected' || action === 'mail_approval_required_received') {
    return 'high';
  }
  if (action.startsWith('autonomy_approve') || action === 'autonomy_approve') return 'high';
  if (action === 'ui.navigation') return 'none';
  if (action.startsWith('autonomy_execute') || action === 'autonomy_execute') return 'low';
  return 'low';
}

function mapAuditStatus(action: string, details: Record<string, unknown>): ActivityStatus {
  if (action === 'approved') return 'approved';
  if (action === 'rejected') return 'rejected';
  if (action === 'brain_tool_proposed') return 'pending';
  if (action === 'brain_tool_called') return 'info';
  if (action === 'brain_approval_created') return 'pending';
  if (action === 'brain_tool_auto_executed' || action === 'brain_tool_executed') return 'autonomous';
  if (action === 'brain_tool_rejected') return 'rejected';
  if (
    action === 'autonomy_approve' ||
    action === 'mail_approval_required_received' ||
    details.status === 'pending'
  ) {
    return 'pending';
  }
  if (action === 'autonomy_execute' || action === 'action_executed') {
    return action === 'action_executed' ? 'approved' : 'autonomous';
  }
  if (action.startsWith('autonomy_')) return 'autonomous';
  if (action === 'ui.navigation') return 'info';
  return 'info';
}

function mapExecutor(action: string, actor: string | null, details: Record<string, unknown>): ActivityExecutor {
  if (action === 'approved' || action === 'rejected' || action === 'ui.navigation') return 'merchant';
  if (actor && actor !== 'system' && actor !== 'aether') return 'merchant';
  if (details.executor === 'merchant') return 'merchant';
  return 'aether';
}

function buildDescription(action: string, module: string, details: Record<string, unknown>): string {
  if (typeof details.description === 'string') return details.description;
  if (action === 'brain_tool_proposed' && Array.isArray(details.proposals)) {
    const proposals = details.proposals as Array<Record<string, unknown>>;
    const tools = proposals.map((p) => String(p.tool ?? 'tool')).join(', ');
    return `Brein stelt voor: ${tools}`;
  }
  if (action === 'brain_approval_created' && details.tool) {
    return `Goedkeuring aangemaakt voor ${String(details.tool)}`;
  }
  if (action === 'brain_tool_called' && details.tool) {
    return `Brein-tool ${String(details.tool)} aangeroepen`;
  }
  if (typeof details.summary === 'string') return details.summary;
  if (typeof details.message === 'string') return details.message;
  const entity = details.entityName ?? details.productName ?? details.supplierName;
  if (entity) return `${labelForAction(action)} — ${String(entity)}`;
  return `${labelForAction(action)} (${module})`;
}

function extractRelated(details: Record<string, unknown>): ActivityFeedItem['related'] {
  const approvalId = details.approvalId ?? details.approval_id;
  if (approvalId) return { type: 'approval', id: String(approvalId) };
  const proposals = details.proposals;
  if (Array.isArray(proposals)) {
    for (const p of proposals) {
      if (typeof p === 'object' && p !== null && 'approvalId' in p && p.approvalId) {
        return { type: 'approval', id: String((p as Record<string, unknown>).approvalId) };
      }
    }
  }
  const emailId = details.emailId ?? details.entityId;
  if (emailId && details.entityType === 'email') return { type: 'email', id: String(emailId) };
  if (details.entityType === 'approval' && details.entityId) {
    return { type: 'approval', id: String(details.entityId) };
  }
  const insightId = details.insightId;
  if (insightId) return { type: 'insight', id: String(insightId) };
  return undefined;
}

function mapAuditRow(row: {
  id: string;
  module: string;
  action: string;
  actor: string | null;
  details: string | null;
  createdAt: Date;
}): ActivityFeedItem {
  const details = parseDetails(row.details);
  const risk = riskFromDetails(details, row.action);
  const status = mapAuditStatus(row.action, details);
  const impact =
    details.impactLabel && details.impactValue
      ? { label: String(details.impactLabel), value: String(details.impactValue) }
      : details.marginDelta
        ? { label: 'Marge', value: String(details.marginDelta) }
        : undefined;

  return {
    id: `audit-${row.id}`,
    source: 'audit',
    at: row.createdAt.toISOString(),
    actionType: row.action,
    actionLabel: labelForAction(row.action),
    description: buildDescription(row.action, row.module, details),
    module: row.module,
    risk,
    status,
    executor: mapExecutor(row.action, row.actor, details),
    impact,
    confidence: typeof details.confidence === 'number' ? details.confidence : undefined,
    rationale: typeof details.rationale === 'string' ? details.rationale : undefined,
    related: extractRelated(details),
    details: Object.keys(details).length > 0 ? details : undefined,
  };
}

function mapCommandRow(row: {
  id: string;
  command: string;
  intent: string | null;
  result: string | null;
  confidence: number | null;
  createdAt: Date;
}): ActivityFeedItem {
  const conf = row.confidence ?? undefined;
  const risk: ActivityRisk =
    conf != null && conf >= 0.85 ? 'low' : conf != null && conf < 0.7 ? 'high' : 'low';

  return {
    id: `command-${row.id}`,
    source: 'command',
    at: row.createdAt.toISOString(),
    actionType: 'command_executed',
    actionLabel: labelForAction('command_executed'),
    description: row.intent
      ? `${row.intent}: ${row.command.slice(0, 120)}`
      : row.command.slice(0, 160),
    module: 'admin-command-bar',
    risk,
    status: 'info',
    executor: 'merchant',
    confidence: conf,
    rationale: row.result ?? undefined,
    details: {
      intent: row.intent,
      result: row.result,
    },
  };
}

export async function buildActivityFeed(query: ActivityFeedQuery): Promise<{
  items: ActivityFeedItem[];
  source: 'live' | 'partial';
}> {
  const tenantId = requireTenantId(query.tenantId, 'activity.feed');
  const limit = Math.min(Math.max(query.limit ?? 100, 1), 200);
  const includeNav = query.includeNav ?? false;

  const auditWhere = {
    tenantId,
    createdAt: { gte: query.since },
    ...(query.module ? { module: query.module } : {}),
    ...(!includeNav ? { NOT: { action: 'ui.navigation' } } : {}),
  };

  const includeCommands = !query.module || query.module === 'admin-command-bar';
  const commandTake = Math.floor(limit / 2);

  const [audits, commands] = await Promise.all([
    prisma.auditLog.findMany({
      where: auditWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    includeCommands
      ? prisma.command.findMany({
          where: { tenantId, createdAt: { gte: query.since } },
          orderBy: { createdAt: 'desc' },
          take: commandTake,
        })
      : Promise.resolve([]),
  ]);

  const items = [
    ...audits.map(mapAuditRow),
    ...commands.map(mapCommandRow),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const capped = items.slice(0, limit);
  const source = capped.length >= 5 ? 'live' : 'partial';

  return { items: capped, source };
}

export function resolveActivitySince(days?: number, sinceIso?: string): Date {
  if (sinceIso) {
    const d = new Date(sinceIso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = Math.min(Math.max(days ?? 30, 1), 90);
  const since = new Date();
  since.setDate(since.getDate() - d);
  since.setHours(0, 0, 0, 0);
  return since;
}
