import type { Page } from '@playwright/test';
import { setupAuthenticatedSession } from '../shared/auth';
import { setupMockAdminApi } from './mock-admin-api';

/** Visual regression setup — auth session + mocked admin API (matches flow tests). */
export async function setupVisualPage(page: Page): Promise<void> {
  await setupAuthenticatedSession(page);
  await setupMockAdminApi(page);
}
