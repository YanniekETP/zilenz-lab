const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  retries: 1,
  use: { baseURL: 'http://127.0.0.1:8765', browserName: 'chromium', headless: true },
  reporter: [['list'], ['html', { open: 'never' }]]
});
