import { test, expect } from '@playwright/test';

test('Test Patient Details Page Loading', async ({ page }) => {
  // Listen to console errors
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error('[BROWSER RUNTIME ERROR]:', err);
  });

  console.log('Navigating to login...');
  await page.goto('https://tanstack-start-app.elihu-dante115korn.workers.dev/login');
  await page.waitForLoadState('networkidle');

  console.log('Logging in...');
  await page.fill('input[placeholder*="Empleado"]', 'EO1303');
  await page.fill('input[type="password"]', 'Solutions115.');
  await page.click('button:has-text("Iniciar Sesión")');

  console.log('Waiting for dashboard navigation...');
  await page.waitForURL('**/app/dashboard', { timeout: 10000 });
  console.log('Login successful, current URL:', page.url());

  // Close tour if visible
  console.log('Checking for onboarding tour...');
  try {
    const nextBtn = page.locator('button:has-text("Siguiente")');
    if (await nextBtn.isVisible()) {
      console.log('Closing onboarding tour...');
      for (let i = 0; i < 6; i++) {
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  } catch (e) {
    console.log('No onboarding tour overlay detected.');
  }

  console.log('Navigating to patients list...');
  // Navigate client-side or directly
  await page.goto('https://tanstack-start-app.elihu-dante115korn.workers.dev/app/pacientes');
  await page.waitForLoadState('networkidle');
  console.log('On patients list page, URL:', page.url());

  // Click on the first patient link
  console.log('Locating patient link...');
  const patientLink = page.locator('a[href*="/app/pacientes/"]').first();
  await expect(patientLink).toBeVisible({ timeout: 5000 });
  const patientName = await patientLink.locator('h3').first().textContent();
  console.log(`Clicking patient link for: ${patientName}...`);
  await patientLink.click();

  console.log('Waiting for navigation to patient details page...');
  await page.waitForTimeout(5000);
  console.log('URL after click:', page.url());

  const heading = page.locator('h2');
  if (await heading.count() > 0) {
    console.log('Found heading:', await heading.first().textContent());
  } else {
    console.log('No h2 heading found on details page.');
  }

  // Print page screenshot or HTML snippet
  const bodyHtml = await page.locator('body').innerHTML();
  console.log('Body HTML length:', bodyHtml.length);
  if (bodyHtml.includes('cargando') || bodyHtml.includes('error')) {
    console.log('Body contains loading or error text.');
  }
});
