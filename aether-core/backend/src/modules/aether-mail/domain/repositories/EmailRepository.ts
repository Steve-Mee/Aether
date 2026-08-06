import { EmailMessage } from '../entities/EmailMessage';

export interface EmailRepository {
  findAll(tenantId: string): Promise<EmailMessage[]>;
  findById(id: string, tenantId: string): Promise<EmailMessage | null>;
  findByMessageId?(messageId: string, tenantId: string): Promise<EmailMessage | null>;
  findRecent(tenantId: string, statuses: string[], limit: number): Promise<EmailMessage[]>;
  create(
    email: EmailMessage,
    meta?: { tenantId: string; category?: string; confidence?: number; messageId?: string }
  ): Promise<EmailMessage>;
  update(
    email: EmailMessage,
    data?: {
      status?: string;
      riskLevel?: string;
      category?: string;
      confidence?: number;
      draftReply?: string;
      sentAt?: Date;
    }
  ): Promise<EmailMessage>;
}
