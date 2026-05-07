import { PrismaClient } from '@prisma/client';
import { EmailMessage } from '../../domain/entities/EmailMessage';
import { EmailRepository } from '../../domain/repositories/EmailRepository';

export class PrismaEmailRepository implements EmailRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<EmailMessage[]> {
    const emails = await this.prisma.emailMessage.findMany();
    return emails.map(e => this.toDomain(e));
  }

  async findById(id: string): Promise<EmailMessage | null> {
    const email = await this.prisma.emailMessage.findUnique({ where: { id } });
    return email ? this.toDomain(email) : null;
  }

  async create(email: EmailMessage): Promise<EmailMessage> {
    const created = await this.prisma.emailMessage.create({
      data: {
        from: email.from,
        subject: email.subject,
        body: email.body,
        status: email.status,
      },
    });
    return this.toDomain(created);
  }

  async update(email: EmailMessage): Promise<EmailMessage> {
    const updated = await this.prisma.emailMessage.update({
      where: { id: email.id },
      data: {
        status: email.status,
      },
    });
    return this.toDomain(updated);
  }

  private toDomain(prismaEmail: any): EmailMessage {
    return new EmailMessage(
      prismaEmail.id,
      prismaEmail.from,
      prismaEmail.subject,
      prismaEmail.body,
      prismaEmail.status,
      prismaEmail.riskLevel ?? null,
      prismaEmail.createdAt
    );
  }
}