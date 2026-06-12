import type { ActionExecutionMode } from './actionAutonomy';
import { resolveExecutionMode } from './actionAutonomy';
import { assessApprovalRisk, type RiskBand } from './intentNavigation';
import type { ApprovalItem } from '@/types/approval';
import { moduleLinks } from '@/lib/navigation/moduleLinks';

export type InsightAccent = 'default' | 'success' | 'warning' | 'danger';

export type UrgencyLabel = 'critical' | 'today' | 'recent' | 'normal';

export interface ApprovalDeepLink {
  path: string;
  labelKey: string;
  state?: Record<string, unknown>;
}

export interface EnrichedApproval {
  item: ApprovalItem;
  title: string;
  impact: string;
  rationale: string;
  riskBand: RiskBand;
  confidence: number;
  urgency: UrgencyLabel;
  urgencyLabel: string;
  executionMode: ActionExecutionMode;
  accent: InsightAccent;
  deepLink: ApprovalDeepLink | null;
  searchText: string;
}

interface EmailPayload {
  emailId?: string;
  from?: string;
  subject?: string;
  category?: string;
  context?: Record<string, unknown>;
}

function toEmailPayload(payload: Record<string, unknown>): EmailPayload {
  return payload as EmailPayload;
}

function parseConfidence(payload: Record<string, unknown>, riskBand: RiskBand): number {
  const raw = payload.confidence;
  if (typeof raw === 'number' && raw >= 0 && raw <= 1) return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw);
    if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
  }
  switch (riskBand) {
    case 'low':
      return 0.82;
    case 'high':
      return 0.58;
    default:
      return 0.68;
  }
}

function riskToAccent(risk: RiskBand): InsightAccent {
  if (risk === 'high') return 'danger';
  if (risk === 'medium') return 'warning';
  return 'default';
}

function buildTitle(item: ApprovalItem, email: EmailPayload): string {
  const action = item.actionType.toLowerCase();
  if (item.module === 'aether-mail' && email.subject) {
    return `Beantwoord mail: ${email.subject}`;
  }
  if (item.module === 'aether-mail') {
    return 'Mailactie goedkeuren';
  }
  if (/refund/.test(action)) {
    const amount = item.payload.amount;
    if (typeof amount === 'number') {
      return `Terugbetaling €${amount.toFixed(2)}`;
    }
    return 'Terugbetaling goedkeuren';
  }
  if (/price|prijs/.test(action)) {
    const supplierId = item.payload.supplierId;
    if (typeof supplierId === 'string') {
      return `Pas prijs aan · ${supplierId}`;
    }
    return 'Prijsaanpassing goedkeuren';
  }
  if (/new_product/.test(action)) {
    return 'Nieuw product toevoegen';
  }
  if (/stock/.test(action)) {
    return 'Voorraadwijziging goedkeuren';
  }
  if (item.module === 'self-evolving-codebase') {
    const desc = item.payload.description;
    if (typeof desc === 'string' && desc.length > 0) {
      return desc.length > 60 ? `${desc.slice(0, 57)}…` : desc;
    }
    return 'Systeemvoorstel toepassen';
  }
  if (/supplier/.test(item.module)) {
    return `Leverancierswijziging · ${item.actionType}`;
  }
  return `${item.module} · ${item.actionType}`;
}

function buildImpact(item: ApprovalItem, email: EmailPayload): string {
  const action = item.actionType.toLowerCase();
  if (item.module === 'aether-mail') {
    const base = 'Klantcommunicatie en responstijd — direct zichtbaar voor de klant.';
    if (email.category) return `${base} Categorie: ${email.category}.`;
    return base;
  }
  if (/refund/.test(action)) {
    const amount = item.payload.amount;
    if (typeof amount === 'number') {
      return `Financieel risico: terugbetaling €${amount.toFixed(2)} — onomkeerbaar na uitvoering.`;
    }
    return 'Financieel risico en klanttevredenheid — onomkeerbaar na uitvoering.';
  }
  if (/price|prijs/.test(action)) {
    const pct = item.payload.changePct ?? item.payload.priceChangePct;
    const sku = item.payload.skuCount ?? item.payload.productCount;
    const parts = ['Marge en conversie kunnen verschuiven'];
    if (typeof pct === 'number') parts.push(`wijziging ca. ${pct}%`);
    if (typeof sku === 'number') parts.push(`${sku} SKU`);
    const supplierId = item.payload.supplierId;
    if (typeof supplierId === 'string') parts.push(`leverancier ${supplierId}`);
    return `${parts.join(' · ')}.`;
  }
  if (/supplier|product|sync/.test(item.module)) {
    const supplierId = item.payload.supplierId;
    const decision = item.payload.decision;
    const parts = ['Catalogus en voorraad synchroniseren'];
    if (typeof supplierId === 'string') parts.push(`met ${supplierId}`);
    if (typeof decision === 'string') parts.push(`— ${decision}`);
    return `${parts.join(' ')}.`;
  }
  if (email.category) {
    return `Categorie: ${email.category} — AETHER baseert dit op classificatie en context.`;
  }
  return 'Autonome actie wacht op jouw beslissing.';
}

function buildRationale(item: ApprovalItem, email: EmailPayload): string {
  if (item.module === 'aether-mail' && email.from) {
    const parts = [`Van ${email.from}`];
    if (email.category) parts.push(`· ${email.category}`);
    return parts.join(' ');
  }
  const decision = item.payload.decision;
  if (typeof decision === 'string') {
    return `AETHER-advies: ${decision}`;
  }
  return `Module ${item.module} · actie ${item.actionType}`;
}

function buildDeepLink(item: ApprovalItem, email: EmailPayload): ApprovalDeepLink | null {
  if (email.emailId) {
    return { path: moduleLinks.emails, labelKey: 'approvals.adjust.emails' };
  }
  const action = item.actionType.toLowerCase();
  if (/price|prijs|product|margin|forecast/.test(action)) {
    if (/forecast|margin|insight/.test(action)) {
      return { path: moduleLinks.insights, labelKey: 'approvals.adjust.insights' };
    }
    return { path: moduleLinks.products, labelKey: 'approvals.adjust.products' };
  }
  if (/supplier/.test(item.module)) {
    return { path: moduleLinks.suppliers, labelKey: 'approvals.adjust.suppliers' };
  }
  if (/refund|payment|order/.test(action)) {
    return {
      path: moduleLinks.activity,
      labelKey: 'approvals.adjust.activity',
      state: { presetCategory: 'approval' as const },
    };
  }
  return {
    path: moduleLinks.activity,
    labelKey: 'approvals.adjust.activity',
    state: { presetCategory: 'approval' as const },
  };
}

function computeUrgencyFixed(createdAt: string): { urgency: UrgencyLabel; urgencyLabel: string } {
  const created = new Date(createdAt).getTime();
  const ageMs = Date.now() - created;
  const twoHours = 2 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (ageMs >= twoHours) {
    return { urgency: 'critical', urgencyLabel: '> 2u wachtend' };
  }
  if (created < startOfToday.getTime()) {
    return { urgency: 'today', urgencyLabel: 'Vandaag' };
  }
  return { urgency: 'recent', urgencyLabel: 'Recent' };
}

export function enrichApproval(item: ApprovalItem): EnrichedApproval {
  const email = toEmailPayload(item.payload);
  const riskBand = assessApprovalRisk(item.module, item.actionType);
  const confidence = parseConfidence(item.payload, riskBand);
  const { urgency, urgencyLabel } = computeUrgencyFixed(item.createdAt);
  const executionMode = resolveExecutionMode({
    requiresApproval: riskBand === 'high',
    riskBand,
  });

  const title = buildTitle(item, email);
  const searchText = [
    title,
    item.module,
    item.actionType,
    email.from,
    email.subject,
    email.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    item,
    title,
    impact: buildImpact(item, email),
    rationale: buildRationale(item, email),
    riskBand,
    confidence,
    urgency,
    urgencyLabel,
    executionMode,
    accent: riskToAccent(riskBand),
    deepLink: buildDeepLink(item, email),
    searchText,
  };
}

export function riskSortOrder(band: RiskBand): number {
  if (band === 'high') return 0;
  if (band === 'medium') return 1;
  return 2;
}

export function sortEnrichedApprovals(items: EnrichedApproval[]): EnrichedApproval[] {
  return [...items].sort((a, b) => {
    const riskDiff = riskSortOrder(a.riskBand) - riskSortOrder(b.riskBand);
    if (riskDiff !== 0) return riskDiff;
    return new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime();
  });
}

export function matchesDateFilter(createdAt: string, filter: 'all' | 'today' | 'week'): boolean {
  if (filter === 'all') return true;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  if (filter === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return created >= start.getTime();
  }
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return now - created <= weekMs;
}

export function matchesSearch(enriched: EnrichedApproval, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return enriched.searchText.includes(q);
}

export function matchesTab(enriched: EnrichedApproval, tab: 'all' | 'high' | 'low'): boolean {
  if (tab === 'all') return true;
  if (tab === 'high') return enriched.riskBand === 'high' || enriched.riskBand === 'medium';
  return enriched.riskBand === 'low';
}
