import type { Page } from '@playwright/test';
import { setupAuthenticatedSession } from './auth';
import { setupMockAdminApi } from '../visual/mock-admin-api';

/** Standard Playwright flow setup: auth session + mocked admin API. */
export async function setupFlowPage(page: Page): Promise<void> {
  await setupAuthenticatedSession(page);
  await setupMockAdminApi(page);
}
