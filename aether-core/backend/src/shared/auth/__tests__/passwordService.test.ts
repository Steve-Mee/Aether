import { hashPassword, verifyPassword } from '../passwordService';

describe('passwordService', () => {
  it('round-trips password verification', async () => {
    const hash = await hashPassword('AetherDev2026!');
    expect(await verifyPassword(hash, 'AetherDev2026!')).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correct-password');
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  it('rejects invalid hash', async () => {
    expect(await verifyPassword('not-a-hash', 'password')).toBe(false);
  });
});
