import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4181';

export default defineConfig({
  testDir: './browser',
  fullyParallel: false,
  outputDir: '../test-results',
  reporter: 'list',
  timeout: 60_000,
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: {
    command: 'node helpers/static-server.mjs',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 15_000,
  },
  projects: [
    { name: 'desktop',       use: { viewport: { width: 1280, height: 800 } } },
    { name: 'ipad-landscape', use: { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true } },
    { name: 'ipad-portrait',  use: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true } },
    { name: 'phone',          use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: 'pages-subpath',  use: { baseURL: `${baseURL}/flag-mixer/`, viewport: { width: 1280, height: 800 } } },
    ...(process.env.WEBKIT ? [{ name: 'ipad-webkit', use: { browserName: 'webkit', viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true } }] : []),
  ],
});
