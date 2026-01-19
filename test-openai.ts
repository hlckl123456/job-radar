import { chromium } from 'playwright';

async function testOpenAI() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading OpenAI careers page...');
    await page.goto('https://openai.com/careers/search', { waitUntil: 'networkidle', timeout: 60000 });

    console.log('Waiting 10 seconds for JS to render...');
    await page.waitForTimeout(10000);

    // Save HTML for debugging
    const html = await page.content();
    console.log(`Page HTML length: ${html.length} characters`);
    console.log(`Has "/careers/" in HTML: ${html.includes('/careers/')}`);


    const allLinks = await page.$$eval('a[href*="/careers/"]', links =>
      links.map(el => ({
        title: el.textContent?.trim() || '',
        url: (el as HTMLAnchorElement).href
      }))
    );

    console.log(`Found ${allLinks.length} total career links`);

    const jobs = allLinks.filter(job =>
      job.title &&
      job.title.length > 10 &&
      !job.url.endsWith('/careers/') &&
      !job.url.endsWith('/careers/search/')  &&
      job.url.match(/\/careers\/[^\/]+\/$/)
    ).map(job => ({
      ...job,
      id: job.url.split('/').filter(Boolean).pop() || ''
    }));

    console.log(`\nExtracted ${jobs.length} jobs`);
    console.log('\nFirst 5 jobs:');
    jobs.slice(0, 5).forEach(job => {
      console.log(`- ${job.title}`);
      console.log(`  URL: ${job.url}`);
    });

    await browser.close();
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

testOpenAI();
