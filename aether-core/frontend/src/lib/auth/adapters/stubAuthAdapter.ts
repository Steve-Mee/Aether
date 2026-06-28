import { env } from '@/lib/config';
import { merchantDisplayName } from '@/lib/merchantDisplay';
import type { AuthPort, SignInInput } from '../AuthPort';
import {
  clearPersistedSession,
  readPersistedSession,
  writePersistedSession,
} from '../sessionStorage';
import type { Session, User, UserRole } from '../types';

export const LOGIN_PATH = '/login';

export interface DemoPersona {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  { id: 'u_steve', name: 'Steve', email: 'admin@aether.local', role: 'admin' },
  { id: 'u_ops', name: 'Operator', email: 'ops@aether.local', role: 'operator' },
  { id: 'u_view', name: 'Viewer', email: 'view@aether.local', role: 'viewer' },
];

const DEFAULT_PERSONA = DEMO_PERSONAS[0];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function findPersona(email: string): DemoPersona | undefined {
  const normalized = normalizeEmail(email);
  return DEMO_PERSONAS.find((p) => normalizeEmail(p.email) === normalized);
}

function buildSessionFromPersona(persona: DemoPersona): Session {
  const user: User = {
    id: persona.id,
    name: persona.name,
    email: persona.email,
    role: persona.role,
  };
  return {
    tenantId: env.tenantId,
    merchantName: merchantDisplayName(),
    user,
    isAuthenticated: true,
    accessToken: null,
  };
}

export function createStubAuthAdapter(): AuthPort {
  return {
    async restoreSession() {
      return readPersistedSession();
    },

    async signIn(credentials: SignInInput) {
      const persona = findPersona(credentials.email) ?? DEFAULT_PERSONA;
      const session = buildSessionFromPersona(persona);
      writePersistedSession(session);
      return session;
    },

    async signOut() {
      clearPersistedSession();
    },
  };
}

export function getDefaultSignInEmail(): string {
  return DEFAULT_PERSONA.email;
}
