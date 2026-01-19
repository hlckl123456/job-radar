import { chromium } from 'playwright';

async function testOpenAI() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to OpenAI careers page...');
    await page.goto('https://openai.com/careers/search/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('Waiting for content to render...');
    await page.waitForTimeout(25000);

    // Get page HTML
    const html = await page.content();
    console.log('\n=== PAGE HTML (first 5000 chars) ===');
    console.log(html.substring(0, 5000));

    // Try different selectors
    console.log('\n=== Testing selectors ===');

    const selectors = [
      'a[href*="/careers/"]',
      'article',
      '[role="article"]',
      '.job-card',
      '.role-card',
      '[data-job]',
      '[data-role]',
      'div[data-testid]',
      'button',
      'h2',
      'h3'
    ];

    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      console.log(`${selector}: ${count} elements`);

      if (count > 0 && count < 20) {
        const texts = await page.locator(selector).allTextContents();
        console.log(`  First few texts:`, texts.slice(0, 5));
      }
    }

    // Get all links
    console.log('\n=== All links with /careers/ ===');
    const careerLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/careers/"]'));
      return links.map(link => ({
        href: link.getAttribute('href'),
        text: link.textContent?.trim().substring(0, 100) || '',
        classes: link.className
      })).slice(0, 20);
    });
    console.log(JSON.stringify(careerLinks, null, 2));

    await page.screenshot({ path: 'openai-debug-2.png', fullPage: true });
    console.log('\nScreenshot saved to openai-debug-2.png');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testOpenAI();
