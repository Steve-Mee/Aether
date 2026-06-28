import type { EmailDetail } from '@/lib/api';

export interface EmailRowDemo {
  id: string;
  from: string;
  subject: string | null;
  status: string;
  riskLevel: string | null;
  category: string | null;
  confidence: number | null;
  createdAt: string;
}

const DETAILS: Record<string, EmailDetail> = {
  em_demo_1: {
    id: 'em_demo_1',
    from: 'supplier@nordic-textiles.dk',
    subject: 'Q2 price list update',
    body: 'Please find attached our updated wholesale price list for Q2.',
    status: 'pending_approval',
    riskLevel: 'low',
    category: 'supplier',
    confidence: 0.91,
    draftReply: null,
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
  },
  em_demo_2: {
    id: 'em_demo_2',
    from: 'customer@example.com',
    subject: 'Return request — order #4821',
    body: 'I would like to return item from order 4821 within the 14-day window.',
    status: 'classified',
    riskLevel: 'medium',
    category: 'returns',
    confidence: 0.87,
    draftReply: 'Thank you for reaching out. We will process your return shortly.',
    createdAt: new Date(Date.now() - 14400_000).toISOString(),
  },
  em_demo_3: {
    id: 'em_demo_3',
    from: 'payments@stripe.com',
    subject: 'Payout scheduled',
    body: 'Your payout of €4,218.40 is scheduled for tomorrow.',
    status: 'archived',
    riskLevel: 'low',
    category: 'billing',
    confidence: 0.99,
    draftReply: null,
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
  },
};

export function getEmailsDemoList(): EmailRowDemo[] {
  return Object.values(DETAILS).map((d) => ({
    id: d.id,
    from: d.from,
    subject: d.subject,
    status: d.status,
    riskLevel: d.riskLevel,
    category: d.category,
    confidence: d.confidence,
    createdAt: d.createdAt,
  }));
}

export function getEmailDemoDetail(id: string): EmailDetail | null {
  return DETAILS[id] ?? null;
}

export function updateEmailDemoDetail(id: string, patch: Partial<EmailDetail>): EmailDetail | null {
  const existing = DETAILS[id];
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  DETAILS[id] = updated;
  return updated;
}
