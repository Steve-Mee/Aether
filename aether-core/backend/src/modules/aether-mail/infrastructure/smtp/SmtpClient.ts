import { logger } from '../../../../shared/logging/logger';

export class SmtpClient {
  isConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
  }

  async send(params: { to: string; subject: string; body: string; from?: string }): Promise<{ sent: boolean; messageId?: string }> {
    if (!this.isConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SMTP not configured in production');
      }
      logger.info('smtp_send_skipped', { reason: 'SMTP not configured', to: params.to });
      return { sent: false };
    }

    if (process.env.SMTP_SEND === 'false' || process.env.NODE_ENV === 'test') {
      logger.info('smtp_send_dry_run', { to: params.to, subject: params.subject });
      return { sent: true, messageId: `dry_${Date.now()}` };
    }

    try {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
      });
      const info = await transport.sendMail({
        from: params.from ?? process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to: params.to,
        subject: params.subject,
        text: params.body,
      });
      return { sent: true, messageId: info.messageId };
    } catch (error) {
      logger.error('smtp_send_failed', { error: String(error) });
      return { sent: false };
    }
  }
}

export const smtpClient = new SmtpClient();
