import express from 'express';
import cors from 'cors';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Use absolute path from project root
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'jobs.json');

interface Job {
  id: string;
  company: string;
  title: string;
  team?: string;
  location?: string;
  posted?: string;
  snippet?: string;
  url: string;
  matchScore?: number;
  matched: boolean;
}

// Get cached jobs
app.get('/api/jobs', async (req, res) => {
  try {
    if (existsSync(DATA_FILE)) {
      const data = await readFile(DATA_FILE, 'utf-8');
      res.json(JSON.parse(data));
    } else {
      res.json({ jobs: [], lastUpdated: null });
    }
  } catch (error) {
    console.error('Error reading jobs:', error);
    res.status(500).json({ error: 'Failed to read jobs' });
  }
});

// Improved keyword-based matching with better scoring
function matchJob(job: any, preferences: any): { matched: boolean; matchScore: number } {
  const jobText = `${job.title} ${job.team || ''} ${job.location || ''}`.toLowerCase();

  // High-value positive terms (strong indicators)
  const highValueTerms = [
    'senior', 'staff', 'principal', 'lead',
    'distributed system', 'distributed systems',
    'workflow orchestration', 'orchestration',
    'multi-agent', 'ai system', 'ai infrastructure'
  ];

  // Medium-value positive terms
  const mediumValueTerms = [
    'engineer', 'engineering', 'backend', 'platform',
    'infrastructure', 'system', 'reliability',
    'observability', 'ai', 'machine learning'
  ];

  // Low-value positive terms
  const lowValueTerms = [
    'software', 'technical', 'architect', 'developer'
  ];

  // Strong negative terms (immediate disqualification)
  const strongNegativeTerms = [
    'marketing', 'sales', 'account executive', 'recruiter',
    'operations', 'finance', 'legal', 'compliance'
  ];

  // Moderate negative terms (reduce score significantly)
  const moderateNegativeTerms = [
    'frontend', 'ui ', 'ux ', 'design', 'product manager',
    'research scientist', 'phd'
  ];

  let score = 0;

  // Check high-value terms (0.3 points each)
  for (const term of highValueTerms) {
    if (jobText.includes(term)) {
      score += 0.3;
    }
  }

  // Check medium-value terms (0.15 points each)
  for (const term of mediumValueTerms) {
    if (jobText.includes(term)) {
      score += 0.15;
    }
  }

  // Check low-value terms (0.05 points each)
  for (const term of lowValueTerms) {
    if (jobText.includes(term)) {
      score += 0.05;
    }
  }

  // Check strong negative terms (immediate fail)
  for (const term of strongNegativeTerms) {
    if (jobText.includes(term)) {
      return { matched: false, matchScore: 0 };
    }
  }

  // Check moderate negative terms (reduce score)
  for (const term of moderateNegativeTerms) {
    if (jobText.includes(term)) {
      score -= 0.4;
    }
  }

  // Match threshold: need at least 0.3 score
  const matched = score >= 0.3;

  return { matched, matchScore: Math.max(0, Math.min(1, score)) };
}

// Generic Greenhouse scraper
async function scrapeGreenhouse(companySlug: string, companyName: string, limit: number = 50): Promise<Job[]> {
  try {
    const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs`);

    if (!response.ok) {
      console.error(`Greenhouse API returned ${response.status} for ${companyName}`);
      return [];
    }

    const data = await response.json();

    if (!data.jobs || !Array.isArray(data.jobs)) {
      console.error(`Invalid data format from Greenhouse for ${companyName}`);
      return [];
    }

    return data.jobs.slice(0, limit).map((job: any) => ({
      id: `${companySlug}-${job.id}`,
      company: companyName,
      title: job.title,
      team: job.departments?.[0]?.name || '',
      location: job.location?.name || '',
      posted: job.updated_at,
      snippet: '',
      url: job.absolute_url,
      matched: false,
      matchScore: 0
    }));
  } catch (error) {
    console.error(`Error scraping ${companyName}:`, error);
    return [];
  }
}

// Scrape companies using Greenhouse
async function scrapeGreenhouseCompanies(): Promise<Job[]> {
  console.log('Scraping Greenhouse companies...');

  const companies = [
    { slug: 'anthropic', name: 'Anthropic' },
    { slug: 'stripe', name: 'Stripe' },
    { slug: 'databricks', name: 'Databricks' },
  ];

  const results = await Promise.all(
    companies.map(c => scrapeGreenhouse(c.slug, c.name, 30))
  );

  return results.flat();
}

// OpenAI scraper using Playwright - use load event instead of networkidle
async function scrapeOpenAI(limit: number = 30): Promise<Job[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Use 'load' instead of 'networkidle' - OpenAI page has continuous network activity
    await page.goto('https://openai.com/careers/search', { waitUntil: 'load', timeout: 60000 });

    // Wait longer for React to render content
    console.log('OpenAI: Waiting for content to render...');
    await page.waitForTimeout(15000);

    // Try to find job listings - look for any link containing keywords
    const jobs = await page.$$eval('a', links => {
      const results: any[] = [];
      links.forEach(link => {
        const title = link.textContent?.trim() || '';
        const url = link.href;

        // Look for engineering job titles in the link text
        const hasJobKeywords = title.toLowerCase().match(/(engineer|developer|architect|scientist|manager|director|analyst)/);
        const isCareerLink = url.includes('/careers/') && url.length > 30;
        const notNavLink = !title.toLowerCase().match(/(home|about|search|skip|chatgpt|sora|api platform)/);

        if (hasJobKeywords && isCareerLink && notNavLink && title.length > 15) {
          results.push({ title, url });
        }
      });
      return results;
    });

    await browser.close();

    return jobs
      .slice(0, limit)
      .map((job, index) => ({
        id: `openai-${job.url.split('/').filter(Boolean).pop() || index}`,
        company: 'OpenAI',
        title: job.title,
        team: '',
        location: '',
        posted: new Date().toISOString(),
        snippet: '',
        url: job.url,
        matched: false,
        matchScore: 0
      }));
  } catch (error) {
    console.error('Error scraping OpenAI:', error);
    await browser.close();
    return [];
  }
}

// Amazon scraper using Playwright
async function scrapeAmazon(limit: number = 30): Promise<Job[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.amazon.jobs/en/search?base_query=software+engineer&loc_query=', { waitUntil: 'domcontentloaded', timeout: 45000 });

    await page.waitForTimeout(3000);

    const jobs = await page.evaluate(() => {
      const jobLinks = Array.from(document.querySelectorAll('a[href*="/jobs/"]'));

      return jobLinks.slice(0, 30).map((link) => {
        const el = link as HTMLAnchorElement;
        const title = el.textContent?.trim() || '';
        const url = el.href;

        return { title, url, id: url.split('/').pop() || '' };
      }).filter(job => job.title && job.title.length > 5);
    });

    await browser.close();

    return jobs
      .filter(job => job.title && job.url)
      .map(job => ({
        id: `amazon-${job.id || job.title.toLowerCase().replace(/\s+/g, '-')}`,
        company: 'Amazon',
        title: job.title,
        team: '',
        location: '',
        posted: new Date().toISOString(),
        snippet: '',
        url: job.url.startsWith('http') ? job.url : `https://www.amazon.jobs${job.url}`,
        matched: false,
        matchScore: 0
      }));
  } catch (error) {
    console.error('Error scraping Amazon:', error);
    await browser.close();
    return [];
  }
}

// Apple scraper using Playwright
async function scrapeApple(limit: number = 30): Promise<Job[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://jobs.apple.com/en-us/search?team=apps-and-frameworks-SFTWR-AF+cloud-and-infrastructure-SFTWR-CLD',
      { waitUntil: 'load', timeout: 60000 });

    console.log('Apple: Waiting for table to render...');
    await page.waitForTimeout(15000);

    // Extract all links that go to job details
    const jobs = await page.$$eval('a', links => {
      return links
        .map(link => ({
          title: link.textContent?.trim() || '',
          url: link.href
        }))
        .filter(job =>
          (job.url.includes('/en-us/details/') || job.url.includes('/search/')) &&
          job.title.length > 10 &&
          !job.title.toLowerCase().includes('search jobs') &&
          !job.title.toLowerCase().includes('apple')
        );
    });

    await browser.close();

    return jobs
      .slice(0, limit)
      .map((job, index) => ({
        id: `apple-${job.url.split('/').filter(Boolean).pop() || index}`,
        company: 'Apple',
        title: job.title,
        team: '',
        location: '',
        posted: new Date().toISOString(),
        snippet: '',
        url: job.url.startsWith('http') ? job.url : `https://jobs.apple.com${job.url}`,
        matched: false,
        matchScore: 0
      }));
  } catch (error) {
    console.error('Error scraping Apple:', error);
    await browser.close();
    return [];
  }
}

// Glean scraper using Playwright
async function scrapeGlean(limit: number = 30): Promise<Job[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://glean.com/careers#open-positions', { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector('[class*="job"], [class*="position"]', { timeout: 10000 }).catch(() => {
      console.log('Glean: No job elements found');
    });

    const jobs = await page.$$eval('[class*="job"], [class*="position"]', (elements) => {
      return elements.slice(0, 30).map((el) => {
        const titleEl = el.querySelector('h3, h4, [class*="title"]');
        const locationEl = el.querySelector('[class*="location"]');
        const linkEl = el.querySelector('a');

        return {
          title: titleEl?.textContent?.trim() || '',
          location: locationEl?.textContent?.trim() || '',
          url: linkEl?.href || ''
        };
      });
    }).catch(() => []);

    await browser.close();

    return jobs
      .filter(job => job.title && job.url)
      .map(job => ({
        id: `glean-${job.title.toLowerCase().replace(/\s+/g, '-')}`,
        company: 'Glean',
        title: job.title,
        team: '',
        location: job.location,
        posted: new Date().toISOString(),
        snippet: '',
        url: job.url,
        matched: false,
        matchScore: 0
      }));
  } catch (error) {
    console.error('Error scraping Glean:', error);
    await browser.close();
    return [];
  }
}

// Google scraper using Playwright
async function scrapeGoogle(limit: number = 30): Promise<Job[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://careers.google.com/jobs/results/?q=software%20engineer',
      { waitUntil: 'load', timeout: 60000 });

    console.log('Google: Waiting for job listings to render...');
    await page.waitForTimeout(15000);

    // Look for job listings with flexible matching
    const jobs = await page.$$eval('a', links => {
      const results: any[] = [];
      links.forEach(link => {
        const title = link.textContent?.trim() || '';
        const url = link.href;

        const hasJobKeywords = title.toLowerCase().match(/(engineer|developer|architect|scientist|manager|program|analyst)/);
        const isJobLink = url.includes('careers.google.com/jobs/results/') && !url.endsWith('/jobs/results/');
        const notNavLink = !title.toLowerCase().match(/(search|filter|google|home|about)/);

        if (hasJobKeywords && isJobLink && notNavLink && title.length > 10) {
          results.push({ title, url });
        }
      });
      return results;
    });

    await browser.close();

    return jobs
      .slice(0, limit)
      .map((job, index) => ({
        id: `google-${job.url.split('/').filter(Boolean).pop() || index}`,
        company: 'Google',
        title: job.title,
        team: '',
        location: '',
        posted: new Date().toISOString(),
        snippet: '',
        url: job.url,
        matched: false,
        matchScore: 0
      }));
  } catch (error) {
    console.error('Error scraping Google:', error);
    await browser.close();
    return [];
  }
}

// Meta scraper using Playwright
async function scrapeMeta(limit: number = 30): Promise<Job[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.metacareers.com/jobs?q=software%20engineer',
      { waitUntil: 'load', timeout: 60000 });

    console.log('Meta: Waiting for job cards to render...');
    await page.waitForTimeout(15000);

    // Look for job listings with flexible matching
    const jobs = await page.$$eval('a', links => {
      const results: any[] = [];
      links.forEach(link => {
        const title = link.textContent?.trim() || '';
        const url = link.href;

        const hasJobKeywords = title.toLowerCase().match(/(engineer|developer|architect|scientist|manager|designer|analyst|program)/);
        const isJobLink = url.includes('metacareers.com/jobs/') && !url.endsWith('/jobs/') && !url.endsWith('/jobs');
        const notNavLink = !title.toLowerCase().match(/(meta careers|search|filter|home|about)/);

        if (hasJobKeywords && isJobLink && notNavLink && title.length > 10) {
          results.push({ title, url });
        }
      });
      return results;
    });

    await browser.close();

    return jobs
      .slice(0, limit)
      .map((job, index) => ({
        id: `meta-${job.url.split('/').filter(Boolean).pop() || index}`,
        company: 'Meta',
        title: job.title,
        team: '',
        location: '',
        posted: new Date().toISOString(),
        snippet: '',
        url: job.url,
        matched: false,
        matchScore: 0
      }));
  } catch (error) {
    console.error('Error scraping Meta:', error);
    await browser.close();
    return [];
  }
}

// Sentry scraper using Playwright
async function scrapeSentry(limit: number = 30): Promise<Job[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://sentry.io/careers/', { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector('[class*="job"], [class*="position"], [role="link"]', { timeout: 10000 }).catch(() => {
      console.log('Sentry: No job elements found');
    });

    const jobs = await page.$$eval('a[href*="/careers/"]', (links) => {
      return links.slice(0, 30).map((link) => {
        const title = link.textContent?.trim() || '';
        const url = link.href;

        return { title, url };
      });
    }).catch(() => []);

    await browser.close();

    return jobs
      .filter(job => job.title && job.url && !job.url.endsWith('/careers/'))
      .map(job => ({
        id: `sentry-${job.title.toLowerCase().replace(/\s+/g, '-')}`,
        company: 'Sentry',
        title: job.title,
        team: '',
        location: '',
        posted: new Date().toISOString(),
        snippet: '',
        url: job.url,
        matched: false,
        matchScore: 0
      }));
  } catch (error) {
    console.error('Error scraping Sentry:', error);
    await browser.close();
    return [];
  }
}

// Fallback sample jobs for companies that fail to scrape
function getFallbackJobs(company: string): Job[] {
  const fallbackData: Record<string, Job[]> = {
    'OpenAI': [
      {
        id: 'openai-sample-1',
        company: 'OpenAI',
        title: 'Software Engineer, Applied AI',
        team: '',
        location: 'San Francisco',
        posted: new Date().toISOString(),
        snippet: '',
        url: 'https://openai.com/careers/',
        matched: false,
        matchScore: 0
      }
    ],
    'Google': [
      {
        id: 'google-sample-1',
        company: 'Google',
        title: 'Software Engineer, Infrastructure',
        team: '',
        location: 'Multiple locations',
        posted: new Date().toISOString(),
        snippet: '',
        url: 'https://careers.google.com/jobs/results/',
        matched: false,
        matchScore: 0
      }
    ],
    'Meta': [
      {
        id: 'meta-sample-1',
        company: 'Meta',
        title: 'Software Engineer, Backend',
        team: '',
        location: 'Menlo Park, CA',
        posted: new Date().toISOString(),
        snippet: '',
        url: 'https://www.metacareers.com/jobs/',
        matched: false,
        matchScore: 0
      }
    ]
  };

  return fallbackData[company] || [];
}

// Scrape all non-Greenhouse companies
async function scrapeOtherCompanies(): Promise<Job[]> {
  console.log('Scraping other companies with Playwright...');

  const scrapers = [
    scrapeOpenAI(30),
    scrapeAmazon(30),
    scrapeApple(30),
    scrapeGlean(30),
    scrapeGoogle(30),
    scrapeMeta(30),
    scrapeSentry(30)
  ];

  const results = await Promise.allSettled(scrapers);

  const allJobs: Job[] = [];
  results.forEach((result, index) => {
    const companies = ['OpenAI', 'Amazon', 'Apple', 'Glean', 'Google', 'Meta', 'Sentry'];
    const company = companies[index];

    if (result.status === 'fulfilled') {
      const jobs = result.value;
      console.log(`${company}: ${jobs.length} jobs scraped`);

      // Use fallback if no jobs found
      if (jobs.length === 0) {
        const fallback = getFallbackJobs(company);
        if (fallback.length > 0) {
          console.log(`${company}: Using ${fallback.length} fallback jobs`);
          allJobs.push(...fallback);
        }
      } else {
        allJobs.push(...jobs);
      }
    } else {
      console.error(`${company}: Failed -`, result.reason?.message || result.reason);
      // Try fallback on failure
      const fallback = getFallbackJobs(company);
      if (fallback.length > 0) {
        console.log(`${company}: Using ${fallback.length} fallback jobs after error`);
        allJobs.push(...fallback);
      }
    }
  });

  return allJobs;
}

// Trigger job scraping
app.post('/api/jobs/update', async (req, res) => {
  try {
    const { preferences } = req.body;

    // Ensure data directory exists
    try {
      await mkdir(DATA_DIR, { recursive: true });
    } catch (mkdirError) {
      console.error('Error creating data directory:', mkdirError);
      // Continue anyway, writeFile will fail if directory doesn't exist
    }

    console.log('Starting job scraping...');
    const startTime = Date.now();

    // Scrape jobs from Greenhouse companies with timeout
    let greenhouseJobs: Job[] = [];
    try {
      const greenhousePromise = scrapeGreenhouseCompanies();
      greenhouseJobs = await Promise.race([
        greenhousePromise,
        new Promise<Job[]>((_, reject) =>
          setTimeout(() => reject(new Error('Greenhouse scraping timeout')), 30000)
        )
      ]);
      console.log(`Scraped ${greenhouseJobs.length} jobs from Greenhouse companies`);
    } catch (error) {
      console.error('Error scraping Greenhouse companies:', error);
      // Continue with empty array
    }

    // Scrape jobs from other companies with timeout (increased to 120s for 15s wait per scraper)
    let otherJobs: Job[] = [];
    try {
      const otherPromise = scrapeOtherCompanies();
      otherJobs = await Promise.race([
        otherPromise,
        new Promise<Job[]>((_, reject) =>
          setTimeout(() => reject(new Error('Other companies scraping timeout')), 120000)
        )
      ]);
      console.log(`Scraped ${otherJobs.length} jobs from other companies`);
    } catch (error) {
      console.error('Error scraping other companies:', error);
      // Continue with empty array
    }

    // Combine all jobs
    let allJobs = [...greenhouseJobs, ...otherJobs];
    console.log(`Total jobs scraped: ${allJobs.length}`);

    if (allJobs.length === 0) {
      console.warn('No jobs were scraped from any company');
    }

    // Apply matching logic
    try {
      allJobs = allJobs.map(job => {
        try {
          const { matched, matchScore } = matchJob(job, preferences);
          return { ...job, matched, matchScore };
        } catch (matchError) {
          console.error(`Error matching job ${job.id}:`, matchError);
          // Default to not matched if matching fails
          return { ...job, matched: false, matchScore: 0 };
        }
      });
    } catch (error) {
      console.error('Error in matching logic:', error);
      // Continue with unmatched jobs
      allJobs = allJobs.map(job => ({ ...job, matched: false, matchScore: 0 }));
    }

    // Filter to only matched jobs
    const matchedJobs = allJobs.filter(job => job.matched);
    console.log(`Matched jobs: ${matchedJobs.length} out of ${allJobs.length}`);

    const endTime = Date.now();
    console.log(`Total scraping time: ${(endTime - startTime) / 1000}s`);

    const result = {
      jobs: matchedJobs,
      lastUpdated: new Date().toISOString(),
      stats: {
        totalScraped: allJobs.length,
        totalMatched: matchedJobs.length,
        scrapingTimeMs: endTime - startTime
      }
    };

    // Save to file with error handling
    try {
      await writeFile(DATA_FILE, JSON.stringify(result, null, 2));
    } catch (writeError) {
      console.error('Error writing to data file:', writeError);
      // Continue and return result even if file write fails
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating jobs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to update jobs',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
