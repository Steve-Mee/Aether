import { extractKeywords } from '../../../../../ai/intelligence/merchant-knowledge/extractKeywords';

export function matchIntent(text: string): { intent: string; parameters?: Record<string, unknown> } | null {
  const lower = text.toLowerCase();
  // Storefront intents (contracts §4) — before generic inventory/order matches
  if (
    /(publiceer|publish).*(website|webshop|store|storefront|site)/.test(lower) ||
    /zet\s+(de\s+)?(website|webshop|store|site)\s+live/.test(lower) ||
    /zet\s+live/.test(lower)
  ) {
    return { intent: 'STORE_PUBLISH' };
  }
  if (
    /(status).*(website|webshop|store|storefront|site)/.test(lower) ||
    /(website|webshop|store|storefront|site).*(status)/.test(lower)
  ) {
    return { intent: 'STORE_STATUS' };
  }
  if (
    /(bouw|build).*(webshop|website|store|storefront)/.test(lower) ||
    /(maak|create).*(mijn\s+)?(webshop|website|store|storefront)/.test(lower) ||
    /maak mijn store/.test(lower)
  ) {
    return { intent: 'STORE_BUILD', parameters: { prompt: text.trim() } };
  }
  if (
    /(maak de hero|hero.*(rustiger|aanpas|wijzig)|voeg\s+(een\s+)?faq|faq\s+toe|iterate.*(site|store|website)|pas.*(hero|faq|sectie)\s+aan)/.test(
      lower
    )
  ) {
    return { intent: 'STORE_ITERATE', parameters: { deltaPrompt: text.trim() } };
  }
  if (/forecast|voorspel|demand/.test(lower)) return { intent: 'FORECAST' };
  if (/add|create|new/.test(lower) && /supplier|leverancier/.test(lower)) return { intent: 'SUPPLIER_CREATE' };
  if (/verify|billable/.test(lower) && /outcome|uplift/.test(lower)) return { intent: 'OUTCOME_VERIFY' };
  if (/email|mail|inbox/.test(lower) && /summary|overzicht|status/.test(lower)) return { intent: 'EMAIL_SUMMARY' };
  if (/outcome|uplift|attribution/.test(lower)) return { intent: 'OUTCOMES_REPORT' };
  if (/pending|openstaand/.test(lower) && /approval|goedkeuring/.test(lower)) return { intent: 'PENDING_APPROVALS' };
  if (/monitor.*supplier|supplier.*monitor/.test(lower)) return { intent: 'SUPPLIER_MONITOR' };
  if (/restock|aanvull|replenish|bestel.*voorraad|voorraad.*bestel/.test(lower)) {
    return { intent: 'RESTOCK_SUGGEST' };
  }
  if (/low.?stock|onder.*voorraad|voorraad.*laag/.test(lower)) {
    return { intent: 'RESTOCK_SUGGEST' };
  }
  if (/churn|verloop|afhaken|klant.*verlies/.test(lower)) {
    return { intent: 'CUSTOMER_CHURN_SIGNALS' };
  }
  if (/segment|klantgroep|rfm/.test(lower)) {
    return { intent: 'CUSTOMER_SEGMENT' };
  }
  if (/order.*trend|vraag.*trend|klant.*trend|bestelling.*trend/.test(lower)) {
    return { intent: 'CUSTOMER_ORDER_TRENDS' };
  }
  if (/inventory|stock|voorraad/.test(lower)) return { intent: 'INVENTORY_STATUS' };
  if (/order|bestelling/.test(lower) && /status|overzicht/.test(lower)) return { intent: 'ORDER_STATUS' };
  if (/verhoog|raise|verlaag|lower|optimaliseer|optimize/.test(lower) && /prijs|price|prijzen|prices/.test(lower)) {
    const pctMatch = lower.match(/(\d+)\s*%/);
    const keywords = extractKeywords(text);
    if (/optimaliseer|optimize/.test(lower) && !pctMatch) {
      return { intent: 'PRICING_OPTIMIZE', parameters: { product: keywords.length >= 3 ? keywords : undefined } };
    }
    return {
      intent: 'PRICE_UPDATE',
      parameters: {
        percentage: pctMatch ? parseInt(pctMatch[1], 10) : 5,
        product: keywords.length >= 3 ? keywords : undefined,
      },
    };
  }
  if (/approve|goedkeur/.test(lower)) return { intent: 'APPROVE_CHANGES' };
  if (/margin|marge/.test(lower)) return { intent: 'LOW_MARGIN_REPORT' };
  return null;
}
