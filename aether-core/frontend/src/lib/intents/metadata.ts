import type { DemoExplainStep, DemoIntentId, SuggestionCategory } from './types';

export const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  prijs: 'Prijzen',
  leverancier: 'Leveranciers',
  goedkeuringen: 'Goedkeuringen',
  inzicht: 'Inzichten',
  autonomie: 'Autonomie',
  overzicht: 'Overzicht',
};
export const INTENT_LABELS: Record<DemoIntentId, string> = {
  PRICING_OPTIMIZATION: 'Prijsoptimalisatie',
  PRODUCT_PRICE_PROPOSAL: 'Productprijs',
  SUPPLIER_CHECK: 'Leveranciers',
  HIGH_RISK_APPROVALS: 'Goedkeuringen',
  INSIGHTS_OVERVIEW: 'Inzichten',
  MARGIN_INSIGHT: 'Marge-inzicht',
  AUTONOMOUS_ACTION: 'Autonome actie',
  BUSINESS_SUMMARY: 'Weekoverzicht',
  RETURN_RISK_ORDERS: 'Retourrisico',
  COMPOUND_WORKFLOW: 'Multi-stap workflow',
  UNKNOWN: 'Algemeen',
};
/** Higher index = lower priority when scores tie */
export const INTENT_SPECIFICITY: DemoIntentId[] = [
  'COMPOUND_WORKFLOW',
  'PRODUCT_PRICE_PROPOSAL',
  'RETURN_RISK_ORDERS',
  'AUTONOMOUS_ACTION',
  'MARGIN_INSIGHT',
  'BUSINESS_SUMMARY',
  'HIGH_RISK_APPROVALS',
  'SUPPLIER_CHECK',
  'PRICING_OPTIMIZATION',
  'INSIGHTS_OVERVIEW',
];
export const LOADING_PHASES: Record<DemoIntentId, string[]> = {
  PRICING_OPTIMIZATION: [
    'Intent herkend…',
    "3 SKU's geanalyseerd…",
    'Prijsoptimalisatie berekend…',
  ],
  PRODUCT_PRICE_PROPOSAL: ['Product gevonden…', 'Concurrentie vergeleken…', 'Voorstel klaar…'],
  SUPPLIER_CHECK: ['Leveranciers gescand…', 'Prijsdalingen gedetecteerd…', 'Sync voorbereid…'],
  HIGH_RISK_APPROVALS: ['Wachtrij geladen…', 'Risico geclassificeerd…', 'Prioriteiten bepaald…'],
  INSIGHTS_OVERVIEW: ['Dashboard samengevoegd…', 'Acties geprioriteerd…', 'Overzicht klaar…'],
  MARGIN_INSIGHT: ['Categorieën geladen…', 'Marges berekend…', 'Inzicht klaar…'],
  AUTONOMOUS_ACTION: ["Low-risk SKU's gefilterd…", 'Batch voorbereid…', 'Autonome run klaar…'],
  RETURN_RISK_ORDERS: ['Orders gescand…', 'Retourkans berekend…', 'Risico-orders gevonden…'],
  BUSINESS_SUMMARY: ['Weekdata opgehaald…', "KPI's berekend…", 'Samenvatting klaar…'],
  COMPOUND_WORKFLOW: ['Workflow herkend…', 'Stappen gepland…', 'Uitvoering voorbereid…'],
  UNKNOWN: ['Commando geïnterpreteerd…', 'Suggesties voorbereid…'],
};
export const EXPLAIN_TIMELINES: Record<DemoIntentId, DemoExplainStep[]> = {
  PRICING_OPTIMIZATION: [
    { at: '09:41', label: 'Marge-analyse', detail: "3 SKU's vergeleken met marktgemiddelde" },
    { at: '09:41', label: 'Elasticiteit', detail: 'Vraagcurve berekend op 30 dagen data' },
    { at: '09:42', label: 'Voorstel', detail: 'Earbuds Pro +4,2% binnen veiligheidsband' },
  ],
  PRODUCT_PRICE_PROPOSAL: [
    { at: '09:43', label: 'Product match', detail: 'Wireless Earbuds Pro (SKU-8842)' },
    { at: '09:43', label: 'Concurrentie', detail: '5 vergelijkbare listings gescand' },
    { at: '09:44', label: 'Prijsband', detail: '€89 → €92,87 (+4,2%) binnen policy' },
  ],
  SUPPLIER_CHECK: [
    { at: '09:14', label: 'Sync Nordic Components', detail: '4 producten met inkoopdaling' },
    { at: '09:15', label: 'Marge-impact', detail: 'Doorgeven of marge behouden per categorie' },
    { at: '09:15', label: 'Actie klaar', detail: 'Sync kan direct starten' },
  ],
  HIGH_RISK_APPROVALS: [
    { at: '08:52', label: 'Bulkprijs gedetecteerd', detail: "23 SKU's, risico hoog" },
    { at: '09:01', label: 'Mail escalatie', detail: 'Kritieke thread wacht op besluit' },
    { at: '09:10', label: 'Wachtrij', detail: '4 items vereisen jouw goedkeuring' },
  ],
  INSIGHTS_OVERVIEW: [
    { at: '09:00', label: 'Prijsactie', detail: '1 voorstel klaar voor publicatie' },
    { at: '09:05', label: 'Leverancier', detail: '4 producten sync gereed' },
    { at: '09:08', label: 'Goedkeuringen', detail: '4 high-risk in wachtrij' },
  ],
  MARGIN_INSIGHT: [
    { at: '09:20', label: 'Categorieën', detail: '5 actieve categorieën geanalyseerd' },
    { at: '09:21', label: 'Marge-berekening', detail: 'Bruto marge vs. inkoop per categorie' },
    { at: '09:21', label: 'Inzicht', detail: 'Elektronica leidt op 34,2% marge' },
  ],
  AUTONOMOUS_ACTION: [
    { at: '09:30', label: 'Risico-filter', detail: "3 SKU's binnen low-risk band" },
    { at: '09:31', label: 'Policy check', detail: 'Geen goedkeuring vereist per regels' },
    { at: '09:31', label: 'Batch klaar', detail: 'Verwachte marge +€870 / maand' },
  ],
  RETURN_RISK_ORDERS: [
    { at: '08:45', label: 'Retourmodel', detail: '30 dagen retourhistorie per klantsegment' },
    { at: '08:46', label: 'Orders gescand', detail: '2 orders boven drempel 35% retourkans' },
    { at: '08:46', label: 'Actie klaar', detail: 'Contact of preventieve maatregelen voorstellen' },
  ],
  BUSINESS_SUMMARY: [
    { at: '09:00', label: 'Omzet', detail: '€48,2k deze week (+12% vs. vorige week)' },
    { at: '09:00', label: 'Orders', detail: '312 orders, gem. orderwaarde €154' },
    { at: '09:01', label: 'Marge', detail: 'Bruto marge 31,4% (+0,8pp)' },
  ],
  COMPOUND_WORKFLOW: [
    { at: '09:40', label: 'Stap 1 · Prijzen', detail: 'Wireless Earbuds Pro geoptimaliseerd' },
    { at: '09:41', label: 'Stap 2 · Sync', detail: 'Nordic Components voorraad gesynchroniseerd' },
    { at: '09:41', label: 'Workflow', detail: 'Beide stappen binnen policy uitgevoerd' },
  ],
  UNKNOWN: [
    { at: 'Nu', label: 'Intent onduidelijk', detail: 'Probeer een van de suggesties hieronder' },
  ],
};
