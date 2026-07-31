import type { TodayReadyInsight } from './types';

export function syncTimeLabel(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** Home landing: no demo cards until NL flow reveals them. */
export function getInitialTodayReadyInsightsForHome(): TodayReadyInsight[] {
  return getInitialTodayReadyInsights().map((insight) => ({
    ...insight,
    visible: false,
    executed: false,
    exiting: false,
    justAppeared: false,
  }));
}

export function getInitialTodayReadyInsights(): TodayReadyInsight[] {
  return [
    {
      id: 'pricing',
      variant: 'pricing',
      visible: true,
      executed: false,
      sortOrder: 0,
      eyebrow: 'Prijs',
      title: 'Earbuds Pro · +4,2%',
      accent: 'success',
      confidence: { value: '87%' },
      metric: { label: 'Marge', value: '+€1,2k', subValue: '/ maand' },
    },
    {
      id: 'supplier',
      variant: 'supplier',
      visible: false,
      executed: false,
      sortOrder: 1,
      eyebrow: 'Leverancier',
      title: 'Nordic · inkoop −6,8%',
      accent: 'default',
      chips: ['4 producten', syncTimeLabel()],
    },
    {
      id: 'approvals',
      variant: 'approvals',
      visible: true,
      executed: false,
      sortOrder: 1,
      eyebrow: 'Goedkeuringen',
      title: '4 high-risk',
      accent: 'danger',
      confidence: { value: '4', label: 'Wachten' },
      listItems: [
        { label: 'Bulkprijs · 23 SKU', risk: 'Hoog' },
        { label: 'Mail escalatie', risk: 'Kritiek' },
      ],
      listOverflow: '+2 meer',
    },
    {
      id: 'margins',
      variant: 'margins',
      visible: false,
      executed: false,
      sortOrder: 3,
      eyebrow: 'Marge',
      title: 'Marge per categorie',
      accent: 'default',
      confidence: { value: '31,4%', label: 'Gem. marge' },
      listItems: [
        { label: 'Elektronica · 34,2%', risk: 'Hoog' },
        { label: 'Mode · 28,1%', risk: 'Gemiddeld' },
      ],
      listOverflow: '+3 categorieën',
    },
    {
      id: 'autonomous',
      variant: 'autonomous',
      visible: false,
      executed: false,
      sortOrder: 4,
      eyebrow: 'Autonomie',
      title: '3 SKU · low-risk batch',
      accent: 'success',
      chips: ['low-risk', 'rollback 24u', '+€870/mnd'],
    },
    {
      id: 'returns',
      variant: 'returns',
      visible: false,
      executed: false,
      sortOrder: 6,
      eyebrow: 'Retour',
      title: '2 orders · hoog risico',
      accent: 'warning',
      listItems: [
        { label: '#4821 · Audio bundle', risk: 'Hoog' },
        { label: '#4798 · Earbuds Pro', risk: 'Hoog' },
      ],
    },
    {
      id: 'summary',
      variant: 'summary',
      visible: false,
      executed: false,
      sortOrder: 5,
      eyebrow: 'Week',
      title: 'Sterke week · +12%',
      accent: 'success',
      chips: ['Omzet €48,2k', '312 orders', 'Marge 31,4%'],
    },
  ];
}
