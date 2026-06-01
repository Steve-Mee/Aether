export interface MailboxPort {
  listMailboxes(tenantId: string): Promise<unknown[]>;
  createMailbox(
    tenantId: string,
    data: { email: string; imapHost?: string; smtpHost?: string; credentialsEnc?: string }
  ): Promise<unknown>;
}
