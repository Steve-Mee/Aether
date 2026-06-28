import {
  periodToDays,
  type InsightsBreakdownRow,
  type InsightsDemoSnapshot,
  type InsightsPeriod,
} from './insightsPageTypes';

const BASE_PEAK = [
  { nameKey: 'insights.peak.tuesday', baseCount: 38, share: 100 },
  { nameKey: 'insights.peak.thursday', baseCount: 34, share: 89 },
  { nameKey: 'insights.peak.wednesday', baseCount: 28, share: 74 },
] as const;

const BASE_30D: InsightsDemoSnapshot = {
  periodDays: 30,
  revenueUpliftAmount: 14280,
  revenueUpliftPercent: 4.2,
  timeSavedHours: 18.5,
  autonomousActions: 214,
  marginImprovementPct: 2.1,
  lowRiskAutonomous: 87,
  highRiskWithApproval: 12,
  topCategories: [
    { name: 'Outdoor & camping', value: '€ 4.820', share: 34 },
    { name: 'Keuken & koken', value: '€ 3.940', share: 28 },
    { name: 'Woonaccessoires', value: '€ 2.610', share: 18 },
  ],
  topSuppliers: [
    { name: 'Nordic Supply Co.', value: '+3,8% marge', share: 42 },
    { name: 'GreenLine Wholesale', value: '+2,4% marge', share: 31 },
    { name: 'Atlas Home BV', value: '+1,9% marge', share: 27 },
  ],
  peakAutonomy: [],
  autonomyBullets: [
    { labelKey: 'insights.autonomy.bullet.pricing', count: 87 },
    { labelKey: 'insights.autonomy.bullet.suppliers', count: 12 },
    { labelKey: 'insights.autonomy.bullet.stock', count: 24 },
    { labelKey: 'insights.autonomy.bullet.mail', count: 41 },
  ],
  recentActions: [
    {
      time: '14:32',
      descriptionKey: 'insights.recent.priceAdjust',
      moduleKey: 'insights.module.pricing',
    },
    {
      time: '13:18',
      descriptionKey: 'insights.recent.supplierCheck',
      moduleKey: 'insights.module.suppliers',
    },
    {
      time: '11:05',
      descriptionKey: 'insights.recent.stockReorder',
      moduleKey: 'insights.module.inventory',
    },
    {
      time: '09:47',
      descriptionKey: 'insights.recent.mailClassify',
      moduleKey: 'insights.module.mail',
    },
    {
      time: '08:12',
      descriptionKey: 'insights.recent.marginScan',
      moduleKey: 'insights.module.catalog',
    },
  ],
};

BASE_30D.peakAutonomy = buildPeakRows(1);

const PERIOD_SCALE: Record<Exclude<InsightsPeriod, 'custom'>, number> = {
  '7d': 0.35,
  '30d': 1,
  '90d': 2.6,
};

function scaleInt(n: number, factor: number): number {
  return Math.max(1, Math.round(n * factor));
}

function scaleFloat(n: number, factor: number, decimals = 1): number {
  const v = n * factor;
  const m = 10 ** decimals;
  return Math.round(v * m) / m;
}

function scaleRows(rows: InsightsBreakdownRow[], factor: number): InsightsBreakdownRow[] {
  return rows.map((row, i) => {
    const numeric = parseInt(row.value.replace(/\D/g, ''), 10) || 0;
    if (numeric > 0 && row.value.includes('€')) {
      const scaled = Math.round(numeric * factor);
      return { ...row, value: `€ ${scaled.toLocaleString('nl-NL')}` };
    }
    if (numeric > 0 && row.value.includes('acties')) {
      return { ...row, value: `${scaleInt(numeric, factor)} acties` };
    }
    return {
      ...row,
      share: i === 0 ? 100 : Math.max(20, Math.round(row.share * (0.9 + factor * 0.05))),
    };
  });
}

function scaleSupplierRows(rows: InsightsBreakdownRow[], factor: number): InsightsBreakdownRow[] {
  return rows.map((row, i) => {
    const match = row.value.match(/\+([\d,]+)%/);
    if (match) {
      const pct = parseFloat(match[1]!.replace(',', '.'));
      const scaled = scaleFloat(pct, factor === 1 ? 1 : factor < 1 ? 0.9 : 1.05, 1);
      return {
        ...row,
        value: `+${scaled.toLocaleString('nl-NL')}% marge`,
        share: i === 0 ? 100 : Math.max(20, Math.round(row.share * (0.92 + factor * 0.04))),
      };
    }
    return {
      ...row,
      share: i === 0 ? 100 : Math.max(20, Math.round(row.share * (0.92 + factor * 0.04))),
    };
  });
}

function buildPeakRows(factor: number): InsightsBreakdownRow[] {
  return BASE_PEAK.map((peak, i) => ({
    name: '',
    nameKey: peak.nameKey,
    value: '',
    valueKey: 'insights.peak.actions',
    valueCount: scaleInt(peak.baseCount, factor),
    share: i === 0 ? 100 : Math.max(20, Math.round(peak.share * (0.9 + factor * 0.05))),
  }));
}

export function getInsightsDemoSnapshot(period: InsightsPeriod): InsightsDemoSnapshot {
  if (period === 'custom') {
    return { ...BASE_30D, periodDays: 30, peakAutonomy: buildPeakRows(1) };
  }
  const factor = PERIOD_SCALE[period];
  const days = periodToDays(period);
  return {
    periodDays: days,
    revenueUpliftAmount: scaleInt(BASE_30D.revenueUpliftAmount, factor),
    revenueUpliftPercent: scaleFloat(
      BASE_30D.revenueUpliftPercent,
      period === '7d' ? 0.85 : period === '90d' ? 1.15 : 1,
      1,
    ),
    timeSavedHours: scaleFloat(BASE_30D.timeSavedHours, factor, 1),
    autonomousActions: scaleInt(BASE_30D.autonomousActions, factor),
    marginImprovementPct: scaleFloat(BASE_30D.marginImprovementPct, period === '90d' ? 1.08 : 1, 1),
    lowRiskAutonomous: scaleInt(BASE_30D.lowRiskAutonomous, factor),
    highRiskWithApproval: scaleInt(BASE_30D.highRiskWithApproval, Math.max(0.5, factor * 0.9)),
    topCategories: scaleRows(BASE_30D.topCategories, factor),
    topSuppliers: scaleSupplierRows(BASE_30D.topSuppliers, factor),
    peakAutonomy: buildPeakRows(factor),
    autonomyBullets: BASE_30D.autonomyBullets.map((b) => ({
      ...b,
      count: scaleInt(b.count, factor),
    })),
    recentActions: BASE_30D.recentActions,
  };
}
