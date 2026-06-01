import type { EmailContextPort, EmailContextData } from '../ports/EmailContextPort';

export type EmailContext = EmailContextData;

export class EmailContextProvider {
  constructor(private port: EmailContextPort) {}

  async getContext(fromEmail: string, tenantId: string): Promise<EmailContext> {
    return this.port.loadContext(fromEmail, tenantId);
  }
}
