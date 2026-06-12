import type { Page } from '@playwright/test';

/** Admin session for Playwright — matches stubAuthAdapter demo persona. */
export const PLAYWRIGHT_SESSION = {
  tenantId: 'tenant_default',
  merchantName: 'Demo Merchant',
  user: {
    id: 'u_steve',
    name: 'Steve',
    email: 'admin@aether.local',
    role: 'admin' as const,
  },
  accessToken: null,
};

const STORAGE_KEY = 'aether.session.v1';

/** Seed localStorage before app boot so ProtectedRoute allows shell access. */
export async function setupAuthenticatedSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    },
    { key: STORAGE_KEY, session: PLAYWRIGHT_SESSION }
  );
}
