import { LocalLLMClient } from "../clients/local-llm-client";

export class EmailProcessor {
  constructor(
    private llmClient: LocalLLMClient,
    private container: any
  ) {}

  async process(email: any, classification: any, context: any) {
    const { category, confidence } = classification;

    if (confidence < 0.85 || ["complaint", "return_request", "payment_issue"].includes(category)) {
      return {
        action: "proposal",
        message: "High-risk email — awaiting merchant approval",
        draft: await this.llmClient.generateReply(email, context),
      };
    }

    // Low-risk: auto-reply
    if (["order_status", "tracking_request", "simple_question"].includes(category)) {
      const reply = await this.llmClient.generateReply(email, context);
      // TODO: Send via SMTP (integrate with Resend or merchant SMTP)
      return { action: "auto_replied", reply };
    }

    return { action: "escalated", reason: "Unknown category" };
  }
}