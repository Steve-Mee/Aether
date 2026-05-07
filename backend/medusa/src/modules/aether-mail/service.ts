import { MedusaService } from "@medusajs/utils";
import { AetherMail } from "./models/aether-mail";
import { EmailProcessor } from "./processors/email-processor";
import { LocalLLMClient } from "./clients/local-llm-client";

export default class AetherMailService extends MedusaService({
  AetherMail,
}) {
  private emailProcessor: EmailProcessor;
  private llmClient: LocalLLMClient;

  constructor(container: any) {
    super(container);
    this.llmClient = new LocalLLMClient();
    this.emailProcessor = new EmailProcessor(this.llmClient, container);
  }

  async processIncomingEmail(emailData: {
    from: string;
    subject: string;
    body: string;
    messageId: string;
  }): Promise<any> {
    // 1. Classificeer met lokale LLM
    const classification = await this.llmClient.classifyEmail(
      emailData.subject,
      emailData.body
    );

    // 2. Haal context op uit Medusa (orders, customer)
    const context = await this.getMerchantContext(emailData.from);

    // 3. Genereer reply of actie
    const result = await this.emailProcessor.process(
      emailData,
      classification,
      context
    );

    // 4. Log alles (immutable)
    await this.create({
      email_id: emailData.messageId,
      from: emailData.from,
      subject: emailData.subject,
      classification: classification.category,
      action_taken: result.action,
      confidence: classification.confidence,
      processed_at: new Date(),
    });

    return result;
  }

  private async getMerchantContext(email: string) {
    // Simpele lookup via Medusa Customer + Order modules
    const customerService = this.container.resolve("customerService");
    const orderService = this.container.resolve("orderService");

    const customer = await customerService.list({ email });
    if (!customer.length) return { customer: null, recentOrders: [] };

    const recentOrders = await orderService.list({
      customer_id: customer[0].id,
      limit: 5,
    });

    return { customer: customer[0], recentOrders };
  }
}