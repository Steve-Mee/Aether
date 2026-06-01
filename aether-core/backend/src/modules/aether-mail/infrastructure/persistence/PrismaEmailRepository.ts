import { PrismaClient } from '@prisma/client';
import { EmailMessage } from '../../domain/entities/EmailMessage';
import { EmailRepository } from '../../domain/repositories/EmailRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaEmailRepository implements EmailRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(tenantId: string): Promise<EmailMessage[]> {
    const tid = requireTenantId(tenantId, 'PrismaEmailRepository.findAll');
    const emails = await this.prisma.emailMessage.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: 'desc' },
    });
    return emails.map((e) => this.toDomain(e));
  }

  async findById(id: string, tenantId: string): Promise<EmailMessage | null> {
    const tid = requireTenantId(tenantId, 'PrismaEmailRepository.findById');
    const email = await this.prisma.emailMessage.findFirst({ where: { id, tenantId: tid } });
    return email ? this.toDomain(email) : null;
  }

  async findByMessageId(messageId: string, tenantId: string): Promise<EmailMessage | null> {
    const tid = requireTenantId(tenantId, 'PrismaEmailRepository.findByMessageId');
    const email = await this.prisma.emailMessage.findFirst({
      where: { messageId, tenantId: tid },
    });
    return email ? this.toDomain(email) : null;
  }

  async create(
    email: EmailMessage,
    meta: { tenantId: string; category?: string; confidence?: number; messageId?: string }
  ): Promise<EmailMessage> {
    const tid = requireTenantId(meta.tenantId, 'PrismaEmailRepository.create');
    const created = await this.prisma.emailMessage.create({
      data: {
        tenantId: tid,
        messageId: meta.messageId,
        from: email.from,
        subject: email.subject,
        body: email.body,
        status: email.status,
        riskLevel: email.riskLevel,
        category: meta.category,
        confidence: meta.confidence,
      },
    });
    return this.toDomain(created);
  }

  async update(
    email: EmailMessage,
    data?: {
      status?: string;
      riskLevel?: string;
      category?: string;
      confidence?: number;
      draftReply?: string;
      sentAt?: Date;
    }
  ): Promise<EmailMessage> {
    const updated = await this.prisma.emailMessage.update({
      where: { id: email.id },
      data: {
        status: data?.status ?? email.status,
        riskLevel: data?.riskLevel ?? email.riskLevel,
        category: data?.category,
        confidence: data?.confidence,
        draftReply: data?.draftReply,
        sentAt: data?.sentAt,
      },
    });
    return this.toDomain(updated);
  }

  private toDomain(row: {
    id: string;
    from: string;
    subject: string | null;
    body: string | null;
    status: string;
    riskLevel: string | null;
    createdAt: Date;
  }): EmailMessage {
    return new EmailMessage(
      row.id,
      row.from,
      row.subject,
      row.body,
      row.status,
      row.riskLevel,
      row.createdAt
    );
  }
}
