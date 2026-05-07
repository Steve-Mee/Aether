import { EmailMessage } from '../entities/EmailMessage';

export interface EmailRepository {
  findAll(): Promise<EmailMessage[]>;
  findById(id: string): Promise<EmailMessage | null>;
  create(email: EmailMessage): Promise<EmailMessage>;
  update(email: EmailMessage): Promise<EmailMessage>;
}