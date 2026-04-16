import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

interface E2EConfig {
  playwrightBaseUrl?: string;
}

function loadBaseUrlFromConfig(): string {
  const configPath = path.resolve(__dirname, 'src/assets/config.json');

  try {
    const rawConfig = readFileSync(configPath, 'utf-8');
    const parsedConfig = JSON.parse(rawConfig) as E2EConfig;

    return parsedConfig.playwrightBaseUrl || 'http://localhost:4200';
  } catch {
    return 'http://localhost:4200';
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || loadBaseUrlFromConfig();

export default defineConfig({
  testDir: './e2e/web',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
