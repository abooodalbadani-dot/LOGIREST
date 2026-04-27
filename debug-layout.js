const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/en/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const cardRect = await page.evaluate(() => {
    const card = document.querySelector('.bg-white\\/90') || document.querySelector('form')?.parentElement?.parentElement;
    if (!card) return null;
    const rect = card.getBoundingClientRect();
    return { width: rect.width, height: rect.height, top: rect.top, left: rect.left };
  });
  
  console.log('Card Rect:', cardRect);

  const mainRect = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return null;
    const rect = main.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  
  console.log('Main Rect:', mainRect);

  await browser.close();
})();
