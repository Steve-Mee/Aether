export const SUPPLIER_KEYWORD_PATTERN =
  /\b(leverancier|supplier|leveranciers|inkoop|inkoopprijs|inkoopkosten|cost\s*price|purchase)\b/i;

export const PRICING_KEYWORD_PATTERN =
  /\b(prij\w*|price\w*|marge|margin|optimaliseer|optimize)\b/i;

export const CROSS_DOMAIN_PATTERN =
  /(?=.*(?:leverancier|supplier|inkoop|inkoopprijs|inkoopkosten))(?=.*(?:prijs|price|marge|margin|prijsaanpassing|optimaliseer))/i;

export const INVENTORY_KEYWORD_PATTERN =
  /\b(voorraad\w*|stock\w*|inventory|low.?stock|restock|magazijn)\b/i;

export const CROSS_DOMAIN_INVENTORY_PRICING_PATTERN =
  /(?=.*(?:voorraad|stock|inventory|restock|magazijn))(?=.*(?:prijs|price|marge|margin|optimaliseer))/i;

export const MAIL_KEYWORD_PATTERN = /\b(email|mail|inbox|postvak)\b/i;

export const CROSS_DOMAIN_CUSTOMER_PRICING_PATTERN =
  /(?=.*(?:klant\w*|customer\w*|segment\w*|churn|bestelling\w*|order\s*trend))(?=.*(?:prijs|price|marge|margin|optimaliseer))/i;

export const CROSS_DOMAIN_CUSTOMER_MAIL_PATTERN =
  /(?=.*(?:klant\w*|customer\w*|segment\w*|churn))(?=.*(?:email|mail|inbox|postvak))/i;

export const CROSS_DOMAIN_CUSTOMER_INVENTORY_PATTERN =
  /(?=.*(?:klant\w*|customer\w*|segment\w*|bestelling\w*|order\s*trend))(?=.*(?:voorraad|stock|inventory|restock|magazijn))/i;

export const CROSS_DOMAIN_FORECAST_INVENTORY_PATTERN =
  /(?=.*(?:forecast|voorspel\w*|demand))(?=.*(?:voorraad|stock|inventory|restock|magazijn))/i;

export const CROSS_DOMAIN_FORECAST_PRICING_PATTERN =
  /(?=.*(?:forecast|voorspel\w*|demand))(?=.*(?:prijs|price|marge|margin|optimaliseer))/i;

export const CROSS_DOMAIN_ORDER_INVENTORY_PATTERN =
  /(?=.*(?:order|bestelling).*(?:status|overzicht))(?=.*(?:voorraad|stock|inventory))/i;

export const CROSS_DOMAIN_OUTCOMES_PRICING_PATTERN =
  /(?=.*(?:outcome\w*|attribution|uplift|roi))(?=.*(?:prijs|price|marge|margin|optimaliseer))/i;

export const CROSS_DOMAIN_NEGOTIATION_PRICING_PATTERN =
  /(?=.*(?:negotiat\w*|onderhandel\w*|counter.?offer))(?=.*(?:prijs|price|marge|margin))/i;

export const CATALOG_KEYWORD_PATTERN = /\b(product\w*|catalog\w*|catalogus|sku|artikel\w*)\b/i;

export const CROSS_DOMAIN_CATALOG_PRICING_PATTERN =
  /(?=.*(?:catalog\w*|catalogus|sku|artikel\w*|nieuw\w*\s+product))(?=.*(?:prijs|price|marge|margin|optimaliseer))(?!.*(?:voorraad|stock|inventory|low.?stock|restock|magazijn))/i;

export const APPROVAL_KEYWORD_PATTERN =
  /\b(approval\w*|goedkeur\w*|high.?risk|high.?impact)\b/i;

export const PROMOTION_KEYWORD_PATTERN =
  /\b(promotie\w*|korting\w*|clearance|uitverkoop|markdown)\b/i;

export const PROMOTION_CLEARANCE_PATTERN = /\b(promotie\w*|clearance|uitverkoop)\b/i;

export const STOCK_CHECK_PATTERN =
  /\b(voorraad\s*check|stock\s*level|verify\s*stock|controleer\s*voorraad)\b/i;

export const MUTATING_INTENTS = new Set(['PRICE_UPDATE', 'RESTOCK_SUGGEST', 'SUPPLIER_CREATE']);

export const MUTATING_COMMAND_PATTERN =
  /\b(prijsaanpassing|price\s*update|verhoog|verlaag|restock|bestel|wijzig|pas\s+\w+\s+aan|create\s+supplier)\w*/i;
