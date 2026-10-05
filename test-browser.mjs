import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
  });

  page.on('requestfailed', request => {
    console.log(`[REQUEST FAILED]: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[HTTP ERROR]: ${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  page.on('pageerror', err => {
    console.error('[BROWSER RUNTIME ERROR]:', err);
  });

  console.log('Navigating to login...');
  await page.goto('https://tanstack-start-app.elihu-dante115korn.workers.dev/login');
  await page.waitForLoadState('networkidle');

  console.log('Logging in...');
  await page.fill('#emp', 'testadmin@universumk9.local');
  await page.fill('#pw', 'Solutions115.');
  await page.click('button:has-text("Iniciar sesión")');

  console.log('Waiting for URL after login...');
  await page.waitForTimeout(6000);
  console.log('URL after login:', page.url());

  console.log('Navigating to patients...');
  await page.goto('https://tanstack-start-app.elihu-dante115korn.workers.dev/app/pacientes');
  await page.waitForLoadState('networkidle');
  console.log('URL on patients page:', page.url());

  const firstLink = page.locator('a[href*="/app/pacientes/"]').first();
  const linkText = await firstLink.innerText();
  console.log('First patient link text:', linkText);

  console.log('Clicking patient link...');
  await firstLink.click();
  await page.waitForTimeout(8000);
  console.log('URL after clicking patient:', page.url());

  const content = await page.locator('body').innerText();
  console.log('Page Body Text Preview (first 1000 chars):');
  console.log(content.substring(0, 1000));

  await browser.close();
}

run().catch(console.error);
