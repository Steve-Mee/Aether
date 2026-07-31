import { labelForAction } from '../../../../shared/audit/activityLabels';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { explainabilityPersister } from '../../../../ai/intelligence/explainability/ExplainabilityPersister';
import type { ActivityFeedPort } from '../ports/ActivityFeedPort';

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
  agentKeys?: string[];
}

export interface ActivityFeedQuery {
  tenantId: string;
  since: Date;
  limit?: number;
  module?: string;
  includeNav?: boolean;
  agentKey?: string;
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

function extractAgentKeys(details: Record<string, unknown>): string[] | undefined {
  if (Array.isArray(details.agentKeys)) {
    return details.agentKeys.filter((k): k is string => typeof k === 'string');
  }
  if (typeof details.agentKey === 'string') {
    return [details.agentKey];
  }
  return undefined;
}

function itemMatchesAgentKey(item: ActivityFeedItem, agentKey: string): boolean {
  if (item.agentKeys?.includes(agentKey)) return true;
  const fromDetails = extractAgentKeys(item.details ?? {});
  return fromDetails?.includes(agentKey) ?? false;
}

export { itemMatchesAgentKey, extractAgentKeys };

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
  if (action === 'autonomy_action_allowed') return 'autonomous';
  if (action === 'autonomy_action_blocked') return 'rejected';
  if (action === 'autonomy_action_deferred') return 'pending';
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
  if (
    action === 'autonomy_action_allowed' ||
    action === 'autonomy_action_blocked' ||
    action === 'autonomy_action_deferred'
  ) {
    const reason = typeof details.reason === 'string' ? details.reason : '';
    const category = typeof details.category === 'string' ? details.category : '';
    const parts = [reason];
    if (category) parts.push(`categorie: ${category}`);
    return parts.filter(Boolean).join(' · ');
  }
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

export function mapAuditRowToActivityItem(row: {
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
    agentKeys: extractAgentKeys(details),
  };
}

async function enrichWithExplainability(
  tenantId: string,
  items: ActivityFeedItem[]
): Promise<ActivityFeedItem[]> {
  const explainRefs: Array<{ index: number; sourceType: 'command' | 'proactive_suggestion'; sourceId: string }> =
    [];

  items.forEach((item, index) => {
    const details = item.details ?? {};
    const sourceType = details.explainabilitySourceType;
    const sourceId = details.explainabilitySourceId;
    if (sourceType === 'command' && typeof sourceId === 'string') {
      explainRefs.push({ index, sourceType: 'command', sourceId });
    } else if (sourceType === 'proactive_suggestion' && typeof sourceId === 'string') {
      explainRefs.push({ index, sourceType: 'proactive_suggestion', sourceId });
    } else if (item.source === 'command') {
      explainRefs.push({ index, sourceType: 'command', sourceId: item.id.replace(/^command-/, '') });
    } else if (
      item.actionType === 'proactive_auto_executed' &&
      typeof details.suggestionId === 'string'
    ) {
      explainRefs.push({
        index,
        sourceType: 'proactive_suggestion',
        sourceId: details.suggestionId,
      });
    }
  });

  if (explainRefs.length === 0) return items;

  const snapshots = await Promise.all(
    explainRefs.map((ref) =>
      explainabilityPersister.getSnapshot(tenantId, ref.sourceType, ref.sourceId)
    )
  );

  const enriched = items.map((item) => ({ ...item }));
  snapshots.forEach((snap, i) => {
    if (!snap) return;
    const ref = explainRefs[i]!;
    const item = enriched[ref.index]!;
    enriched[ref.index] = {
      ...item,
      rationale: item.rationale ?? snap.summary,
      agentKeys: snap.agentKeys.length > 0 ? snap.agentKeys : item.agentKeys,
      details: {
        ...(item.details ?? {}),
        explainabilitySourceType: ref.sourceType,
        explainabilitySourceId: ref.sourceId,
        agentKeys: snap.agentKeys.length > 0 ? snap.agentKeys : item.agentKeys,
      },
    };
  });

  return enriched;
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
      explainabilitySourceType: 'command',
      explainabilitySourceId: row.id,
    },
  };
}

export class ActivityFeedService {
  constructor(private activityFeedPort: ActivityFeedPort) {}

  async buildActivityFeed(query: ActivityFeedQuery): Promise<{
    items: ActivityFeedItem[];
    source: 'live' | 'partial';
  }> {
    const tenantId = requireTenantId(query.tenantId, 'activity.feed');
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 200);
    const includeNav = query.includeNav ?? false;

    const includeCommands = !query.module || query.module === 'admin-command-bar';
    const commandTake = Math.floor(limit / 2);

    const [audits, commands] = await Promise.all([
      this.activityFeedPort.findAuditLogs({
        tenantId,
        since: query.since,
        module: query.module,
        excludeNavigation: !includeNav,
        take: limit,
      }),
      includeCommands
        ? this.activityFeedPort.findCommands(tenantId, query.since, commandTake)
        : Promise.resolve([]),
    ]);

    const items = [
      ...audits.map(mapAuditRowToActivityItem),
      ...commands.map(mapCommandRow),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const capped = items.slice(0, limit);
    const enriched = await enrichWithExplainability(tenantId, capped);
    const filtered = query.agentKey
      ? enriched.filter((item) => itemMatchesAgentKey(item, query.agentKey!))
      : enriched;
    const source = filtered.length >= 5 ? 'live' : 'partial';

    return { items: filtered, source };
  }
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
