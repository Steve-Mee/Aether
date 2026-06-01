export interface MailSenderPort {
  send(params: { to: string; subject: string; body: string; from?: string }): Promise<{ sent: boolean; messageId?: string }>;
  isConfigured(): boolean;
}
