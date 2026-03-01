const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 4000));
  
  // Lighthouse runs a similar check for installability
  const isInstallable = await page.evaluate(async () => {
    return new Promise(resolve => {
      // If the beforeinstallprompt event fires, it's installable
      let handled = false;
      window.addEventListener('beforeinstallprompt', (e) => {
        handled = true;
        resolve(true);
      });
      setTimeout(() => { if (!handled) resolve(false); }, 1000);
    });
  });
  
  console.log('Fired beforeinstallprompt?', isInstallable);
  await browser.close();
})();
