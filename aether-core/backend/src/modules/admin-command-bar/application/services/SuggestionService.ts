import { countPendingApprovals } from '../../../../shared/approval/approvalService';
import { prisma } from '../../../../shared/prisma/client';
import type { ProactiveSuggestionService } from '../../../../ai/intelligence/proactive/ProactiveSuggestionService';

export interface SuggestionDto {
  id: string;
  label: string;
  command: string;
  intentId: string;
  category: string;
  hint?: string;
  executionMode?: 'autonomous' | 'approval_required' | 'inform_only';
  badge?: string;
  source: string;
  priority: number;
}

export interface SuggestionsResponseDto {
  nowRelevant: SuggestionDto[];
  groups: Array<{ category: string; label: string; items: SuggestionDto[] }>;
  suggestions: SuggestionDto[];
  proactive?: SuggestionDto[];
}

const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

export class SuggestionService {
  constructor(private proactiveService?: ProactiveSuggestionService) {}

  async getSuggestions(
    tenantId: string,
    route: string,
    limit = 12
  ): Promise<SuggestionsResponseDto> {
    const [pendingApprovals, productCount, unreadEmails, proactiveItems] = await Promise.all([
      countPendingApprovals(tenantId),
      prisma.product.count({ where: { tenantId } }),
      prisma.emailMessage.count({
        where: { tenantId, status: { in: ['received', 'escalated'] } },
      }),
      this.proactiveService?.listActiveDtos(tenantId) ?? Promise.resolve([]),
    ]);

    const nowRelevant: SuggestionDto[] = [];

    for (const p of proactiveItems.slice(0, 2)) {
      nowRelevant.push({ ...p, badge: p.badge ?? 'AETHER stelt voor' });
    }

    if (pendingApprovals > 0) {
      nowRelevant.push({
        id: `ctx-approvals-${pendingApprovals}`,
        label:
          pendingApprovals === 1
            ? 'Behandel 1 goedkeuring'
            : `Behandel ${pendingApprovals} goedkeuringen`,
        command: 'Toon high-risk goedkeuringen',
        intentId: 'HIGH_RISK_APPROVALS',
        category: 'goedkeuringen',
        hint: 'Direct vanuit je wachtrij',
        executionMode: 'approval_required',
        badge: 'Nu relevant',
        source: 'dashboard',
        priority: 10,
      });
    }

    if (route === '/suppliers' || route.startsWith('/suppliers')) {
      nowRelevant.push({
        id: 'ctx-supplier-sync',
        label: 'Sync leveranciers met recente wijzigingen',
        command: 'Monitor alle leveranciers met recente prijswijzigingen',
        intentId: 'SUPPLIER_MONITOR',
        category: 'leveranciers',
        executionMode: 'autonomous',
        source: 'route',
        priority: 8,
      });
    }

    const staticPool: SuggestionDto[] = [
      {
        id: 'static-pricing',
        label: 'Optimaliseer prijzen deze week',
        command: 'Optimaliseer prijzen deze week',
        intentId: 'PRICING_OPTIMIZE',
        category: 'prijs',
        executionMode: 'autonomous',
        source: 'static',
        priority: 5,
      },
      {
        id: 'static-summary',
        label: 'Hoe presteert mijn business deze week?',
        command: 'Hoe presteert mijn business deze week?',
        intentId: 'BUSINESS_SUMMARY',
        category: 'overzicht',
        executionMode: 'inform_only',
        source: 'static',
        priority: 4,
      },
      {
        id: 'static-margin',
        label: 'Toon producten met lage marge',
        command: 'Toon producten met lage marge',
        intentId: 'MARGIN_INSIGHT',
        category: 'marge',
        executionMode: 'inform_only',
        source: 'static',
        priority: productCount > 0 ? 6 : 3,
      },
    ];

    if (unreadEmails > 0) {
      staticPool.push({
        id: 'static-mail',
        label: 'Samenvatting openstaande mails',
        command: 'Geef een samenvatting van openstaande mails',
        intentId: 'EMAIL_SUMMARY',
        category: 'mail',
        executionMode: 'inform_only',
        source: 'static',
        priority: 7,
      });
    }

    const proactiveIds = new Set(proactiveItems.map((p) => p.id));
    const relevantIds = new Set(nowRelevant.map((s) => s.id));
    const rest = [...proactiveItems, ...staticPool]
      .filter((s) => !relevantIds.has(s.id))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);

    const byCategory = new Map<string, SuggestionDto[]>();
    for (const s of rest.filter((s) => !proactiveIds.has(s.id) || s.source !== 'proactive')) {
      const list = byCategory.get(s.category) ?? [];
      list.push(s);
      byCategory.set(s.category, list);
    }

    for (const p of proactiveItems) {
      const list = byCategory.get(p.category) ?? [];
      if (!list.some((i) => i.id === p.id)) {
        list.push(p);
        byCategory.set(p.category, list);
      }
    }

    const groups = [...byCategory.entries()].map(([category, items]) => ({
      category,
      label: category,
      items,
    }));

    const suggestions = [...nowRelevant, ...rest]
      .filter((s, idx, arr) => arr.findIndex((x) => x.id === s.id) === idx)
      .slice(0, limit);

    return { nowRelevant, groups, suggestions, proactive: proactiveItems };
  }

  static undoExpiresAtFromNow(): Date {
    return new Date(Date.now() + UNDO_WINDOW_MS);
  }

  static isUndoableIntent(intent: string): boolean {
    return ['PRICE_UPDATE', 'APPROVE_CHANGES', 'PRICING_OPTIMIZE'].includes(intent);
  }
}
