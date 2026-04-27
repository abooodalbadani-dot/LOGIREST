const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log('Navigating to localhost:3000/en/login...');
  await page.goto('http://localhost:3000/en/login', { waitUntil: 'networkidle' });

  // Wait a moment for any client-side rendering
  await page.waitForTimeout(2000);

  const html = await page.content();
  console.log('HTML Length:', html.length);
  
  // Extract text content of the body
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body Text:', bodyText.substring(0, 500));

  await browser.close();
})();
