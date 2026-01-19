import { chromium } from 'playwright';

async function debugOpenAI() {
  console.log('=== Debugging OpenAI ===');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to OpenAI careers...');
    await page.goto('https://openai.com/careers/search', { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('Waiting 5 seconds for content to load...');
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: 'openai-debug.png', fullPage: true });
    console.log('Screenshot saved to openai-debug.png');

    // Try to find any links
    const allLinks = await page.$$eval('a', links => links.map(a => ({
      text: a.textContent?.trim().substring(0, 100),
      href: a.href
    })));

    console.log(`Found ${allLinks.length} total links`);
    console.log('Sample links:', allLinks.slice(0, 10));

    // Look for job-related links
    const jobLinks = allLinks.filter(link =>
      link.href.includes('careers') ||
      link.text?.toLowerCase().includes('engineer') ||
      link.text?.toLowerCase().includes('software')
    );
    console.log(`Found ${jobLinks.length} potential job links:`, jobLinks);

    await browser.close();
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

async function debugApple() {
  console.log('\n=== Debugging Apple ===');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to Apple careers...');
    await page.goto('https://jobs.apple.com/en-us/search?team=apps-and-frameworks-SFTWR-AF+cloud-and-infrastructure-SFTWR-CLD',
      { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('Waiting 5 seconds for content to load...');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'apple-debug.png', fullPage: true });
    console.log('Screenshot saved to apple-debug.png');

    const allLinks = await page.$$eval('a', links => links.map(a => ({
      text: a.textContent?.trim().substring(0, 100),
      href: a.href
    })));

    console.log(`Found ${allLinks.length} total links`);

    const jobLinks = allLinks.filter(link =>
      link.href.includes('details') || link.href.includes('job')
    );
    console.log(`Found ${jobLinks.length} potential job links:`, jobLinks.slice(0, 10));

    await browser.close();
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

async function debugGoogle() {
  console.log('\n=== Debugging Google ===');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to Google careers...');
    await page.goto('https://careers.google.com/jobs/results/?q=software%20engineer',
      { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('Waiting 8 seconds for content to load...');
    await page.waitForTimeout(8000);

    await page.screenshot({ path: 'google-debug.png', fullPage: true });
    console.log('Screenshot saved to google-debug.png');

    const allLinks = await page.$$eval('a', links => links.map(a => ({
      text: a.textContent?.trim().substring(0, 100),
      href: a.href
    })));

    console.log(`Found ${allLinks.length} total links`);

    const jobLinks = allLinks.filter(link =>
      link.href.includes('jobs') && !link.href.endsWith('/jobs/results/')
    );
    console.log(`Found ${jobLinks.length} potential job links:`, jobLinks.slice(0, 10));

    await browser.close();
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

async function debugMeta() {
  console.log('\n=== Debugging Meta ===');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to Meta careers...');
    await page.goto('https://www.metacareers.com/jobs?q=software%20engineer',
      { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('Waiting 8 seconds for content to load...');
    await page.waitForTimeout(8000);

    await page.screenshot({ path: 'meta-debug.png', fullPage: true });
    console.log('Screenshot saved to meta-debug.png');

    const allLinks = await page.$$eval('a', links => links.map(a => ({
      text: a.textContent?.trim().substring(0, 100),
      href: a.href
    })));

    console.log(`Found ${allLinks.length} total links`);

    const jobLinks = allLinks.filter(link =>
      link.href.includes('jobs/') && link.text && link.text.length > 10
    );
    console.log(`Found ${jobLinks.length} potential job links:`, jobLinks.slice(0, 10));

    await browser.close();
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

// Run all debuggers
(async () => {
  await debugOpenAI();
  await debugApple();
  await debugGoogle();
  await debugMeta();
})();
