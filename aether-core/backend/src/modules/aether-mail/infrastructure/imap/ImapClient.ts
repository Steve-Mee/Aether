import Imap from 'imap';
import { simpleParser } from 'mailparser';
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
      tlsOptions: { rejectUnauthorized: false },
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

  async fetchUnseenEmails(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', true, (err, box) => {
        if (err) return reject(err);

        this.imap.search(['UNSEEN'], (err, results) => {
          if (err) return reject(err);
          if (!results.length) return resolve([]);

          const fetch = this.imap.fetch(results, { bodies: '' });
          const emails: any[] = [];

          fetch.on('message', (msg) => {
            msg.on('body', async (stream) => {
              try {
                const parsed = await simpleParser(stream);
                emails.push({
                  from: parsed.from?.text,
                  subject: parsed.subject,
                  body: parsed.text || parsed.html,
                  date: parsed.date,
                });
              } catch (e) {
                console.error('Failed to parse email:', e);
              }
            });
          });

          fetch.once('end', () => {
            resolve(emails);
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