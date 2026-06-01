import Imap from 'imap';
import { ParsedMail, simpleParser } from 'mailparser';
import { EventEmitter } from 'events';

export class ImapClient extends EventEmitter {
  private imap: Imap;
  private isConnected = false;

  constructor(config: {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
  }) {
    super();
    this.imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: {
        rejectUnauthorized: process.env.IMAP_TLS_REJECT_UNAUTHORIZED !== 'false',
      },
    });

    this.imap.once('ready', () => {
      this.isConnected = true;
      this.emit('ready');
    });

    this.imap.once('error', (err) => {
      this.emit('error', err);
    });

    this.imap.once('end', () => {
      this.isConnected = false;
      this.emit('end');
    });
  }

  connect() {
    this.imap.connect();
  }

  private async parseMessageStream(stream: NodeJS.ReadableStream): Promise<ParsedMail> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    return simpleParser(Buffer.concat(chunks));
  }

  async fetchUnseenEmails(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', true, (err: Error | null) => {
        if (err) return reject(err);

        this.imap.search(['UNSEEN'], (err: Error | null, results: number[]) => {
          if (err) return reject(err);
          if (!results.length) return resolve([]);

          const fetch = this.imap.fetch(results, { bodies: '' });
          const emails: any[] = [];
          const pending: Promise<void>[] = [];

          fetch.on('message', (msg: any) => {
            const bodyPromise = new Promise<void>((res) => {
              msg.on('body', async (stream: NodeJS.ReadableStream) => {
                try {
                  const parsed = await this.parseMessageStream(stream);
                  emails.push({
                    from: parsed.from?.text,
                    subject: parsed.subject,
                    body: parsed.text || parsed.html,
                    date: parsed.date,
                    messageId: parsed.messageId,
                  });
                } catch (e) {
                  console.error('Failed to parse email:', e);
                } finally {
                  res();
                }
              });
            });
            pending.push(bodyPromise);
          });

          fetch.once('error', reject);
          fetch.once('end', () => {
            void Promise.all(pending).then(() => resolve(emails)).catch(reject);
          });
        });
      });
    });
  }

  disconnect() {
    if (this.isConnected) {
      this.imap.end();
    }
  }
}
