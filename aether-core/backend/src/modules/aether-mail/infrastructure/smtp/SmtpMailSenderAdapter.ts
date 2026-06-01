import { MailSenderPort } from '../../application/ports/MailSenderPort';
import { smtpClient } from './SmtpClient';

export class SmtpMailSenderAdapter implements MailSenderPort {
  isConfigured(): boolean {
    return smtpClient.isConfigured();
  }

  send(params: { to: string; subject: string; body: string; from?: string }) {
    return smtpClient.send(params);
  }
}

export const smtpMailSender = new SmtpMailSenderAdapter();
