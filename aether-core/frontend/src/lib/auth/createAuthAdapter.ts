import { env } from '@/lib/config';
import type { AuthPort } from './AuthPort';
import { createJwtAuthAdapter } from './adapters/jwtAuthAdapter';
import { createStubAuthAdapter } from './adapters/stubAuthAdapter';

export function createAuthAdapter(): AuthPort {
  if (env.authProvider === 'jwt') {
    return createJwtAuthAdapter();
  }
  return createStubAuthAdapter();
}
