import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: 'e2e/a11y',
  reporter: [['html', { open: 'never' }], ['list']],
});
