import { AgentRegistry } from '../AgentRegistry';
import { DEFAULT_SPECIALIST_AGENTS } from '../agents';
import {
  needsSupplierIntel,
  resolveCollaborationChain,
  resolveMultiAgentKeywords,
} from '../AgentCollaborationPolicy';

describe('AgentCollaborationPolicy', () => {
  const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);

  it('detects pricing commands needing supplier intel', () => {
    expect(needsSupplierIntel('verhoog prijs op basis van leverancier', 'PRICE_UPDATE')).toBe(true);
    expect(needsSupplierIntel('verhoog prijzen 5%', 'PRICE_UPDATE')).toBe(false);
  });

  it('resolves cross-domain keyword match to sequential supplier→pricing', () => {
    const chain = resolveCollaborationChain(
      'check leveranciersprijzen en stel prijsaanpassingen voor',
      'UNKNOWN',
      registry
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('cross-domain-single');
    expect(chain!.mode).toBe('sequential');
    expect(chain!.steps.map((s) => s.agentKey)).toEqual(['supplier', 'pricing']);
  });

  it('resolves pricing-needs-supplier prepend chain', () => {
    const chain = resolveCollaborationChain(
      'verhoog prijs op basis van inkoopprijs leverancier',
      'PRICE_UPDATE',
      registry,
      'pricing'
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('pricing-needs-supplier');
    expect(chain!.mode).toBe('prepend');
    expect(chain!.steps[0].agentKey).toBe('supplier');
    expect(chain!.primaryAgentKey).toBe('pricing');
  });

  it('resolves supplier-to-pricing sequential chain', () => {
    const chain = resolveCollaborationChain(
      'monitor leverancier en stel prijsvoorstel voor',
      'SUPPLIER_MONITOR',
      registry
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('supplier-to-pricing');
    expect(chain!.steps.map((s) => s.agentKey)).toEqual(['supplier', 'pricing']);
  });

  it('resolveMultiAgentKeywords returns multiple agents for cross-domain command', () => {
    const keys = resolveMultiAgentKeywords(
      'leverancier prijs marge optimaliseer',
      registry
    );
    expect(keys).toContain('supplier');
    expect(keys).toContain('pricing');
  });

  it('resolves cross-domain inventory→pricing sequential chain', () => {
    const chain = resolveCollaborationChain(
      'toon low-stock producten en stel prijsoptimalisatie voor',
      'UNKNOWN',
      registry
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('cross-domain-inventory-pricing');
    expect(chain!.steps.map((s) => s.agentKey)).toEqual(['inventory', 'pricing']);
  });

  it('resolves pricing-needs-inventory prepend chain', () => {
    const chain = resolveCollaborationChain(
      'optimaliseer prijzen voor low-stock producten',
      'PRICING_OPTIMIZE',
      registry,
      'pricing'
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('pricing-needs-inventory');
    expect(chain!.mode).toBe('prepend');
    expect(chain!.steps[0].agentKey).toBe('inventory');
  });

  it('resolves inventory-to-pricing sequential chain', () => {
    const chain = resolveCollaborationChain(
      'check voorraad en stel marge optimalisatie voor',
      'INVENTORY_STATUS',
      registry
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('inventory-to-pricing');
    expect(chain!.steps.map((s) => s.agentKey)).toEqual(['inventory', 'pricing']);
  });

  it('resolves parallel-intel-supplier-pricing for read-only cross-domain', () => {
    const chain = resolveCollaborationChain(
      'check leverancier prijzen en marge rapport',
      'UNKNOWN',
      registry
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('parallel-intel-supplier-pricing');
    expect(chain!.mode).toBe('parallel');
  });

  it('resolves parallel-intel-inventory-mail when both domains match', () => {
    const chain = resolveCollaborationChain(
      'geef inventory status en email samenvatting',
      'UNKNOWN',
      registry
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('parallel-intel-inventory-mail');
    expect(chain!.mode).toBe('parallel');
  });

  it('resolves customer-to-pricing sequential chain', () => {
    const chain = resolveCollaborationChain(
      'analyseer klantbestellingen en stel prijsoptimalisatie voor',
      'CUSTOMER_ORDER_TRENDS',
      registry
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('customer-to-pricing');
    expect(chain!.steps.map((s) => s.agentKey)).toEqual(['customer', 'pricing']);
  });

  it('resolves cross-domain customer→pricing sequential chain', () => {
    const chain = resolveCollaborationChain(
      'toon klant order trends en stel marge optimalisatie voor',
      'UNKNOWN',
      registry
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('cross-domain-customer-pricing');
    expect(chain!.steps.map((s) => s.agentKey)).toEqual(['customer', 'pricing']);
  });

  it('resolves customer-to-mail sequential chain', () => {
    const chain = resolveCollaborationChain(
      'detecteer churn signalen en geef email samenvatting',
      'CUSTOMER_CHURN_SIGNALS',
      registry
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('customer-to-mail');
    expect(chain!.steps.map((s) => s.agentKey)).toEqual(['customer', 'mail']);
  });

  it('resolves parallel-intel-customer-inventory for read-only cross-domain', () => {
    const chain = resolveCollaborationChain(
      'geef klant order trends en inventory status',
      'UNKNOWN',
      registry
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('parallel-intel-customer-inventory');
    expect(chain!.mode).toBe('parallel');
  });

  it('resolves cross-domain forecast→pricing sequential chain', () => {
    const chain = resolveCollaborationChain(
      'voorspel demand en stel marge optimalisatie voor',
      'UNKNOWN',
      registry
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('cross-domain-forecast-pricing');
    expect(chain!.steps.map((s) => s.agentKey)).toEqual(['forecast', 'pricing']);
  });

  it('resolves cross-domain outcomes→pricing sequential chain', () => {
    const chain = resolveCollaborationChain(
      'toon attribution uplift en stel prijsoptimalisatie voor',
      'UNKNOWN',
      registry
    );
    expect(chain).not.toBeNull();
    expect(chain!.ruleId).toBe('cross-domain-outcomes-pricing');
    expect(chain!.steps.map((s) => s.agentKey)).toEqual(['outcomes', 'pricing']);
  });
});
