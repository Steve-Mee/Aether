export interface AutoReplyPolicy {
  allowedCategories: string[];
  minConfidence: number;
  maxReplyLength: number;
}

const DEFAULT_POLICY: AutoReplyPolicy = {
  allowedCategories: ['order_status', 'tracking_request', 'simple_question'],
  minConfidence: 0.85,
  maxReplyLength: 500,
};

export class EmailPolicyService {
  canAutoReply(category: string, confidence: number): boolean {
    const policy = DEFAULT_POLICY;
    return policy.allowedCategories.includes(category) && confidence >= policy.minConfidence;
  }

  buildAutoReply(category: string): string {
    const templates: Record<string, string> = {
      order_status: 'Thank you for your message. We are checking your order status and will respond shortly.',
      tracking_request: 'Thank you. We have received your tracking inquiry and will update you soon.',
      simple_question: 'Thank you for contacting us. A team member will follow up if needed.',
    };
    const reply = templates[category] ?? 'Thank you for your message.';
    return reply.slice(0, DEFAULT_POLICY.maxReplyLength);
  }
}

export const emailPolicyService = new EmailPolicyService();
