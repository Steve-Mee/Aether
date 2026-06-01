import crypto from 'crypto';

export interface MailboxCredentials {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}

function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, 'aether-mailbox', 32);
}

export function decryptMailboxCredentials(row: {
  imapHost?: string | null;
  credentialsEnc?: string | null;
}): MailboxCredentials | null {
  if (!row.credentialsEnc) return null;

  const key = process.env.MAILBOX_CREDENTIALS_KEY;
  let json: string;

  if (key) {
    const parts = row.credentialsEnc.split(':');
    if (parts.length !== 3) return null;
    const [ivB64, tagB64, dataB64] = parts;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      deriveKey(key),
      Buffer.from(ivB64, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    json = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } else {
    json = Buffer.from(row.credentialsEnc, 'base64').toString('utf8');
  }

  try {
    const parsed = JSON.parse(json) as {
      user: string;
      password: string;
      host?: string;
      port?: number;
      tls?: boolean;
    };
    if (!parsed.user || !parsed.password) return null;
    return {
      user: parsed.user,
      password: parsed.password,
      host: row.imapHost ?? parsed.host ?? 'imap.gmail.com',
      port: parsed.port ?? 993,
      tls: parsed.tls !== false,
    };
  } catch {
    return null;
  }
}

export function encryptMailboxCredentials(creds: {
  user: string;
  password: string;
  host?: string;
  port?: number;
  tls?: boolean;
}): string {
  const json = JSON.stringify(creds);
  const key = process.env.MAILBOX_CREDENTIALS_KEY;
  if (!key) return Buffer.from(json).toString('base64');

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(key), iv);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}
