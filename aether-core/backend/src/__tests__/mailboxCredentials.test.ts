import { decryptMailboxCredentials, encryptMailboxCredentials } from '../modules/aether-mail/infrastructure/imap/mailboxCredentials';

describe('mailboxCredentials', () => {
  const originalKey = process.env.MAILBOX_CREDENTIALS_KEY;

  afterEach(() => {
    process.env.MAILBOX_CREDENTIALS_KEY = originalKey;
  });

  it('round-trips credentials without encryption key', () => {
    delete process.env.MAILBOX_CREDENTIALS_KEY;
    const enc = encryptMailboxCredentials({
      user: 'inbox@merchant.com',
      password: 'secret',
      host: 'imap.example.com',
    });
    const creds = decryptMailboxCredentials({ imapHost: 'imap.example.com', credentialsEnc: enc });
    expect(creds?.user).toBe('inbox@merchant.com');
    expect(creds?.password).toBe('secret');
  });

  it('round-trips credentials with encryption key', () => {
    process.env.MAILBOX_CREDENTIALS_KEY = 'test-key-for-mailbox';
    const enc = encryptMailboxCredentials({
      user: 'inbox@merchant.com',
      password: 'secret',
    });
    const creds = decryptMailboxCredentials({ imapHost: 'imap.gmail.com', credentialsEnc: enc });
    expect(creds?.user).toBe('inbox@merchant.com');
    expect(creds?.host).toBe('imap.gmail.com');
  });
});
