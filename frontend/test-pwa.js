const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  
  // Wait a moment for SW to register
  await new Promise(r => setTimeout(r, 2000));
  
  const hasSW = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length > 0;
  });
  
  console.log('Service Worker Registered:', hasSW);
  await browser.close();
})();
