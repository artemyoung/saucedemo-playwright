import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Один воркер: тести з `sessionTest` ділять одну залогінену сесію (див. tests/fixtures.ts)
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // У CI додатково `github`: падіння показуються анотаціями прямо в коміті/PR
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://www.saucedemo.com',
    testIdAttribute: 'data-test',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Затримка між діями в мс для візуального перегляду: SLOWMO=500 npm run test:headed
    launchOptions: { slowMo: Number(process.env.SLOWMO ?? 0) },
  },
  projects: [
    // UI-тести saucedemo.com
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /tests\/api\// },
    // API-тести restful-booker (без браузера)
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts/,
      use: {
        baseURL: 'https://restful-booker.herokuapp.com',
        extraHTTPHeaders: { Accept: 'application/json' },
      },
    },
  ],
});
