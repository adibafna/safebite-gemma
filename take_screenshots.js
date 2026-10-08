const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outDir = 'C:\\Users\\ZFXMIKEY\\Downloads\\safebite_screenshots';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  console.log('Launching Edge via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    defaultViewport: { width: 1280, height: 850, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Wait for status dot to show online
  await page.waitForSelector('.status-chip.online, .status-dot.online, #statusDot', { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  // 1. Dashboard screenshot
  console.log('Capturing Figure 1: Main Dashboard...');
  const fig1Path = path.join(outDir, 'fig1_dashboard.png');
  await page.screenshot({ path: fig1Path });
  console.log(`Saved ${fig1Path}`);

  // 2. Click danger sample and inspect
  console.log('Triggering Ingredient Scan (Danger Sample)...');
  await page.evaluate(() => {
    loadSample('danger');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.click('#scanBtn');

  // Wait for scanner result to become visible
  console.log('Waiting for Gemma 2 inference on scanner...');
  await page.waitForFunction(() => {
    const res = document.getElementById('scannerResult');
    return res && !res.classList.contains('hidden') && res.innerText.length > 50;
  }, { timeout: 35000 });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Capturing Figure 2: Scanner Result...');
  const fig2Path = path.join(outDir, 'fig2_scanner.png');
  await page.screenshot({ path: fig2Path });
  console.log(`Saved ${fig2Path}`);

  // 3. Switch to Recipe tab
  console.log('Switching to Recipe Tab...');
  const recipeTabBtn = await page.$('button[data-tab="recipe"], .tab-pill[data-tab="recipe"]');
  if (recipeTabBtn) {
    await recipeTabBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // Fill in pantry items
    await page.evaluate(() => {
      document.getElementById('pantryInput').value = 'Chicken breast, white jasmine rice, broccoli, olive oil, garlic, ginger, pure honey';
      document.getElementById('cuisineInput').value = 'Quick 20-min Asian glazed chicken bowl';
    });
    await new Promise(r => setTimeout(r, 400));
    await page.click('#recipeBtn');

    console.log('Waiting for Gemma 2 inference on recipe...');
    await page.waitForFunction(() => {
      const res = document.getElementById('recipeResult');
      return res && !res.classList.contains('hidden') && res.innerText.length > 50;
    }, { timeout: 45000 });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Capturing Figure 3: Safe Recipe Result...');
    const fig3Path = path.join(outDir, 'fig3_recipe.png');
    await page.screenshot({ path: fig3Path });
    console.log(`Saved ${fig3Path}`);
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
