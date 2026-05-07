import { MedusaRequest, MedusaResponse } from "@medusajs/medusa";
import { AetherMailService } from "../../../../modules/aether-mail/service";
import { SupplierIntelligenceService } from "../../../../modules/supplier-intelligence/service";

/**
 * POST /admin/aether/command
 * Natuurlijke taal commando's verwerken (Sprint 1)
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { query } = req.body as { query: string };

  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  const aetherMail = req.scope.resolve("aetherMailService") as AetherMailService;
  const supplierAgent = req.scope.resolve("supplierIntelligenceService") as SupplierIntelligenceService;

  // Simpele intent detection (in productie: lokale LLM)
  const lowerQuery = query.toLowerCase();

  let result: any = { message: "Commando niet herkend. Probeer: 'Toon lage margin producten' of 'Samenvatting openstaande mails'" };

  if (lowerQuery.includes("margin") || lowerQuery.includes("lage prijs")) {
    // Low margin products
    const productService = req.scope.resolve("productService");
    const products = await productService.list({
      // Simpele filter — in echte versie: bereken margin via pricing module
      limit: 20,
    });

    result = {
      type: "low_margin_products",
      count: products.length,
      products: products.slice(0, 5).map((p: any) => ({
        id: p.id,
        title: p.title,
        // margin: calculateMargin(p) — placeholder voor nu
      })),
      suggestion: "Wil je dat ik prijsaanpassingen voorstel voor deze producten?",
    };
  }

  else if (lowerQuery.includes("mail") || lowerQuery.includes("email") || lowerQuery.includes("inbox")) {
    // Mail summary
    const mailSummary = await aetherMail.getMailSummary();
    result = {
      type: "mail_summary",
      ...mailSummary,
      action: "Bekijk volledige inbox in AETHER Mail tab",
    };
  }

  else if (lowerQuery.includes("leverancier") || lowerQuery.includes("supplier")) {
    const syncResult = await supplierAgent.syncSupplier("demo-supplier-1");
    result = {
      type: "supplier_sync",
      ...syncResult,
      message: "Leverancier gesynchroniseerd",
    };
  }

  res.json(result);
};