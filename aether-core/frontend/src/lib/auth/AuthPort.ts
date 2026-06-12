import type { Session } from './types';

export interface SignInInput {
  email: string;
  password?: string;
}

export interface AuthPort {
  restoreSession(): Promise<Session | null>;
  signIn(credentials: SignInInput): Promise<Session>;
  signOut(): Promise<void>;
}
