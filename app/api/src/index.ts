import express from 'express';
import cors from 'cors';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import 'dotenv/config';

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
  employmentType?: string;
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

// Sophisticated matching with user preferences, phrase matching, and advanced scoring
function matchJob(job: any, preferences: any): { matched: boolean; matchScore: number } {
  const titleLower = job.title.toLowerCase();
  const teamLower = (job.team || '').toLowerCase();
  const locationLower = (job.location || '').toLowerCase();
  const snippetLower = (job.snippet || '').toLowerCase();

  // Separate title and other text for weighted scoring
  const titleText = titleLower;
  const otherText = `${teamLower} ${locationLower} ${snippetLower}`;
  const jobText = `${titleText} ${otherText}`;

  // Parse user preferences if available
  const lookingFor = preferences?.lookingFor?.toLowerCase() || '';
  const notLookingFor = preferences?.notLookingFor?.toLowerCase() || '';

  let score = 0;
  const maxPossibleScore = 2.0; // ✨ Increased to account for weighted scoring

  // === PHASE 1: User-defined positive preferences (highest priority) ===
  if (lookingFor) {
    const userPositiveTerms = extractKeyTerms(lookingFor);
    const userPhrases = extractPhrases(lookingFor);

    // Check phrases in TITLE first (exact multi-word matches) - 0.5 points each (2x weight)
    for (const phrase of userPhrases) {
      if (titleText.includes(phrase)) {
        score += 0.5;  // ✨ 2x weight for title matches
      } else if (otherText.includes(phrase)) {
        score += 0.25; // 1x weight for other matches
      }
    }

    // Check individual terms - weighted by where they appear
    let userTermScore = 0;
    for (const term of userPositiveTerms) {
      if (!userPhrases.some(p => p.includes(term))) {
        if (titleText.includes(term)) {
          userTermScore += 0.2;  // ✨ 2x weight for title
        } else if (otherText.includes(term)) {
          userTermScore += 0.1;  // 1x weight for other
        }
      }
    }
    score += Math.min(0.5, userTermScore);  // ✨ Increased cap
  }

  // === PHASE 2: User-defined negative preferences (can disqualify) ===
  if (notLookingFor) {
    const userNegativeTerms = extractKeyTerms(notLookingFor);
    const userNegativePhrases = extractPhrases(notLookingFor);

    // Check negative phrases - immediate disqualification
    for (const phrase of userNegativePhrases) {
      if (jobText.includes(phrase)) {
        return { matched: false, matchScore: 0 };
      }
    }

    // Check negative terms - reduce score by 0.3 each
    for (const term of userNegativeTerms) {
      if (jobText.includes(term) && !userNegativePhrases.some(p => p.includes(term))) {
        score -= 0.3;
      }
    }
  }

  // === PHASE 3: Built-in seniority matching (high weight) ===
  const seniorityTerms = {
    high: ['staff', 'principal', 'distinguished', 'fellow'],
    medium: ['senior', 'lead', 'sr.', 'sr '],
    low: ['mid-level', 'intermediate']
  };

  let seniorityScore = 0;
  for (const term of seniorityTerms.high) {
    if (titleLower.includes(term)) {
      seniorityScore = Math.max(seniorityScore, 0.4);
    }
  }
  for (const term of seniorityTerms.medium) {
    if (titleLower.includes(term)) {
      seniorityScore = Math.max(seniorityScore, 0.25);
    }
  }
  for (const term of seniorityTerms.low) {
    if (titleLower.includes(term)) {
      seniorityScore = Math.max(seniorityScore, 0.1);
    }
  }
  score += seniorityScore;

  // === PHASE 4: Technical domain matching (medium weight) ===
  const domainKeywords = {
    distributed_systems: ['distributed system', 'distributed computing', 'microservice', 'service mesh'],
    ai_ml: ['ai', 'machine learning', 'ml', 'llm', 'large language model', 'multi-agent'],
    backend_infra: ['backend', 'infrastructure', 'platform', 'reliability', 'sre', 'devops'],
    orchestration: ['orchestration', 'workflow', 'scheduler', 'coordinator'],
    observability: ['observability', 'monitoring', 'tracing', 'telemetry']
  };

  let domainScore = 0;
  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    for (const keyword of keywords) {
      if (jobText.includes(keyword)) {
        domainScore += 0.08;
        break; // Only count once per domain
      }
    }
  }
  score += Math.min(0.35, domainScore);

  // === PHASE 5: Role type validation (required minimum) ===
  const roleTypes = ['engineer', 'engineering', 'architect', 'developer', 'scientist', 'researcher'];
  let hasRoleType = false;
  for (const role of roleTypes) {
    if (titleLower.includes(role)) {
      hasRoleType = true;
      score += 0.15;
      break;
    }
  }

  // === PHASE 6: Strong negative filters (immediate disqualification) ===
  const strongNegativeTerms = [
    'marketing', 'sales', 'account executive', 'recruiter', 'recruiting',
    'operations manager', 'finance', 'legal', 'compliance', 'hr',
    'customer success', 'account manager', 'business development'
  ];

  for (const term of strongNegativeTerms) {
    if (titleLower.includes(term) || teamLower.includes(term)) {
      return { matched: false, matchScore: 0 };
    }
  }

  // === PHASE 7: Moderate negative filters (significant penalty) ===
  const moderateNegativeTerms = {
    frontend: ['frontend', 'front-end', 'react', 'vue', 'angular', 'ui engineer', 'ux engineer'],
    research: ['research scientist', 'research engineer', 'phd required'],
    product: ['product manager', 'program manager', 'tpm'],
    junior: ['junior', 'entry level', 'intern', 'internship', 'new grad']
  };

  for (const [category, terms] of Object.entries(moderateNegativeTerms)) {
    for (const term of terms) {
      if (jobText.includes(term)) {
        score -= 0.25;
        break; // Only penalize once per category
      }
    }
  }

  // === PHASE 8: Location bonus (optional enhancement) ===
  const preferredLocations = ['remote', 'san francisco', 'sf', 'bay area', 'new york'];
  for (const loc of preferredLocations) {
    if (locationLower.includes(loc)) {
      score += 0.05;
      break;
    }
  }

  // Normalize score to 0-1 range
  const normalizedScore = Math.max(0, Math.min(1, score / maxPossibleScore));

  // ✨ Lowered threshold from 0.25 to 0.20 to catch more relevant jobs
  // Match threshold: need at least 0.20 normalized score AND must have valid role type
  const matched = normalizedScore >= 0.20 && hasRoleType && score > 0;

  return { matched, matchScore: normalizedScore };
}

// Helper: Extract key terms from text (remove common words)
function extractKeyTerms(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can']);

  return text
    .split(/[\s,;.!?]+/)
    .map(t => t.trim())
    .filter(t => t.length > 2 && !stopWords.has(t));
}

// Helper: Extract meaningful phrases (2-3 word combinations)
function extractPhrases(text: string): string[] {
  const phrases: string[] = [];
  const words = text.split(/\s+/).filter(w => w.length > 0);

  // Extract 2-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }

  // Extract 3-word phrases
  for (let i = 0; i < words.length - 2; i++) {
    phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return phrases;
}

// Error handling wrapper with retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; retryDelay?: number; timeoutMs?: number; companyName: string }
): Promise<T> {
  const { maxRetries = 2, retryDelay = 2000, timeoutMs = 60000, companyName } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      );

      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (isLastAttempt) {
        console.error(`${companyName}: Failed after ${maxRetries + 1} attempts - ${errorMessage}`);
        throw error;
      }

      console.warn(`${companyName}: Attempt ${attempt + 1} failed, retrying in ${retryDelay}ms - ${errorMessage}`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(`${companyName}: Max retries exceeded`);
}

// Data validation and sanitization
function validateAndSanitizeJob(job: any, company: string): Job | null {
  try {
    // Required fields validation
    if (!job.id || typeof job.id !== 'string') {
      console.warn(`${company}: Invalid job ID`);
      return null;
    }

    if (!job.title || typeof job.title !== 'string' || job.title.trim().length < 3) {
      console.warn(`${company}: Invalid job title`);
      return null;
    }

    if (!job.url || typeof job.url !== 'string') {
      console.warn(`${company}: Invalid job URL`);
      return null;
    }

    // URL validation
    try {
      new URL(job.url);
    } catch {
      console.warn(`${company}: Malformed URL - ${job.url}`);
      return null;
    }

    // Sanitize and return
    return {
      id: String(job.id).trim(),
      company: String(company).trim(),
      title: String(job.title).trim(),
      team: job.team ? String(job.team).trim() : '',
      location: job.location ? String(job.location).trim() : '',
      posted: job.posted || new Date().toISOString(),
      snippet: job.snippet ? String(job.snippet).trim() : '',
      url: String(job.url).trim(),
      matched: Boolean(job.matched),
      matchScore: typeof job.matchScore === 'number' ? job.matchScore : 0
    };
  } catch (error) {
    console.error(`${company}: Error validating job`, error);
    return null;
  }
}

// Generic Greenhouse scraper with enhanced error handling and pagination support
async function scrapeGreenhouse(companySlug: string, companyName: string, limit: number = 500): Promise<Job[]> {
  return withRetry(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(
          `https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs?per_page=${limit}`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Greenhouse API returned ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Invalid content type: ${contentType}`);
        }

        const data = await response.json();

        if (!data.jobs || !Array.isArray(data.jobs)) {
          throw new Error('Invalid data format: jobs array not found');
        }

        if (data.jobs.length === 0) {
          console.warn(`${companyName}: No jobs found`);
          return [];
        }

        console.log(`${companyName}: Fetched ${data.jobs.length} jobs from Greenhouse API`);

        const rawJobs = data.jobs.map((job: any) => ({
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

        // Validate and filter jobs
        const validatedJobs = rawJobs
          .map(job => validateAndSanitizeJob(job, companyName))
          .filter((job): job is Job => job !== null);

        if (validatedJobs.length === 0) {
          throw new Error('No valid jobs after validation');
        }

        return validatedJobs;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    { maxRetries: 2, retryDelay: 2000, timeoutMs: 35000, companyName }
  );
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
    companies.map(c => scrapeGreenhouse(c.slug, c.name)) // Use default limit of 500
  );

  return results.flat();
}

// Safe browser wrapper with proper cleanup
async function withBrowser<T>(
  fn: (browser: any, page: any) => Promise<T>,
  companyName: string,
  useStealth: boolean = false
): Promise<T> {
  let browser = null;
  let page = null;

  try {
    const launchOptions: any = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };

    // Enhanced stealth mode for bot detection bypass
    if (useStealth) {
      launchOptions.args.push(
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security'
      );
    }

    browser = await chromium.launch(launchOptions);

    const contextOptions: any = {
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York'
    };

    // Additional stealth context options
    if (useStealth) {
      contextOptions.extraHTTPHeaders = {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
      };
    }

    const context = await browser.newContext(contextOptions);

    // Hide webdriver flags for stealth mode
    if (useStealth) {
      await context.addInitScript(() => {
        // Override navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });

        // Override chrome property
        (window as any).chrome = {
          runtime: {}
        };

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: 'denied' } as PermissionStatus) :
            originalQuery(parameters)
        );

        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        });

        // Mock languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });
      });
    }

    page = await context.newPage();

    // Set reasonable defaults
    await page.setDefaultTimeout(45000);

    const result = await fn(browser, page);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`${companyName} browser error: ${errorMessage}`);
  } finally {
    // Ensure browser is always closed
    try {
      if (page) await page.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    } catch (cleanupError) {
      console.warn(`${companyName}: Error during browser cleanup`, cleanupError);
    }
  }
}

// JSearch API helper function
interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_description?: string;
  job_apply_link?: string;
  job_posted_at_datetime_utc?: string;
  job_employment_type?: string;
}

async function scrapeWithJSearch(
  companyName: string,
  query: string,
  numPages: number = 5
): Promise<Job[]> {
  const API_KEY = process.env.RAPIDAPI_KEY;

  if (!API_KEY) {
    console.warn(`${companyName}: RAPIDAPI_KEY not found, returning empty results`);
    return [];
  }

  try {
    // Add 1 second delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    const params = new URLSearchParams({
      query,
      page: '1',
      num_pages: numPages.toString(),
      date_posted: 'month',           // ✨ Only get jobs from last month
      employment_types: 'FULLTIME'    // ✨ Filter out intern, contractor, part-time
    });

    const url = `https://jsearch.p.rapidapi.com/search?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`JSearch API returned ${response.status}`);
    }

    const data = await response.json();
    const jobs: JSearchJob[] = data.data || [];

    // Filter to ensure we only get jobs from the target company
    const filteredJobs = jobs.filter(job =>
      job.employer_name.toLowerCase().includes(companyName.toLowerCase())
    );

    console.log(`${companyName}: Found ${filteredJobs.length} jobs via JSearch API`);

    return filteredJobs.map((job) => {
      const location = [job.job_city, job.job_state, job.job_country]
        .filter(Boolean)
        .join(', ') || 'Location not specified';

      return {
        id: job.job_id,
        title: job.job_title,
        company: companyName,
        location,
        snippet: job.job_description?.substring(0, 200) || '',
        url: job.job_apply_link || '',
        posted: job.job_posted_at_datetime_utc || new Date().toISOString(),
        matched: false
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${companyName}: JSearch API error: ${errorMessage}`);
    return [];
  }
}

// OpenAI scraper using JSearch API
async function scrapeOpenAI(limit: number = 500): Promise<Job[]> {
  return scrapeWithJSearch('OpenAI', 'software engineer OpenAI', 5);
}

// Amazon scraper using JSearch API
async function scrapeAmazon(limit: number = 2000): Promise<Job[]> {
  return scrapeWithJSearch('Amazon', 'software engineer Amazon', 5);
}

// Apple scraper using JSearch API
async function scrapeApple(limit: number = 1000): Promise<Job[]> {
  return scrapeWithJSearch('Apple', 'software engineer Apple', 5);
}

// Glean scraper using JSearch API
async function scrapeGlean(limit: number = 1000): Promise<Job[]> {
  return scrapeWithJSearch('Glean', 'software engineer Glean', 5);
}

// Google scraper using JSearch API
async function scrapeGoogle(limit: number = 1000): Promise<Job[]> {
  return scrapeWithJSearch('Google', 'software engineer Google', 5);
}

// Meta scraper using JSearch API
async function scrapeMeta(limit: number = 1000): Promise<Job[]> {
  return scrapeWithJSearch('Meta', 'software engineer Meta', 5);
}

// Sentry scraper using Playwright
async function scrapeSentry(limit: number = 1000): Promise<Job[]> {
  return withRetry(
    async () => {
      return withBrowser(async (browser, page) => {
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

          if (!jobs || jobs.length === 0) {
            throw new Error('No jobs found on page');
          }

          const rawJobs = jobs
            .filter(job => job.title && job.url && !job.url.endsWith('/careers/'))
            .map(job => {
              // Extract location from title (format: "Job TitleLocation" - NO SPACE between title and location)
              // Location patterns: "San Francisco, California", "Toronto, Ontario, Canada", "Amsterdam, Netherlands", etc.
              const titleText = job.title;

              // Match location at the end: City, State/Country or City, State, Country
              // Pattern: matches capitalized words separated by commas and spaces at the end
              const locationMatch = titleText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)?)$/);
              const location = locationMatch ? locationMatch[1] : '';
              const cleanTitle = location ? titleText.substring(0, titleText.lastIndexOf(location)).trim() : titleText;

              return {
                id: `sentry-${cleanTitle.toLowerCase().replace(/\s+/g, '-')}`,
                company: 'Sentry',
                title: cleanTitle,
                team: '',
                location: location,
                posted: new Date().toISOString(),
                snippet: '',
                url: job.url,
                matched: false,
                matchScore: 0
              };
            });

          // Validate jobs
          const validatedJobs = rawJobs
            .map(job => validateAndSanitizeJob(job, 'Sentry'))
            .filter((job): job is Job => job !== null);

          if (validatedJobs.length === 0) {
            throw new Error('No valid jobs after validation');
          }

          return validatedJobs;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Sentry scraping failed: ${errorMessage}`);
        }
      }, 'Sentry');
    },
    { maxRetries: 1, retryDelay: 3000, timeoutMs: 75000, companyName: 'Sentry' }
  );
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

// Safe scraper wrapper that catches errors and returns empty array
async function safeScrape(scraperFn: () => Promise<Job[]>, companyName: string): Promise<Job[]> {
  try {
    const jobs = await scraperFn();
    console.log(`${companyName}: ${jobs.length} jobs scraped`);
    return jobs;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${companyName}: Scraping failed - ${errorMessage}`);

    // Use fallback on error
    const fallback = getFallbackJobs(companyName);
    if (fallback.length > 0) {
      console.log(`${companyName}: Using ${fallback.length} fallback jobs`);
      return fallback;
    }

    return [];
  }
}

// Scrape all non-Greenhouse companies
async function scrapeOtherCompanies(): Promise<Job[]> {
  console.log('Scraping other companies with Playwright...');

  // Run JSearch API scrapers SEQUENTIALLY to avoid rate limiting
  const jsearchCompanies = [
    { fn: scrapeOpenAI, name: 'OpenAI' },
    { fn: scrapeAmazon, name: 'Amazon' },
    { fn: scrapeApple, name: 'Apple' },
    { fn: scrapeGlean, name: 'Glean' },
    { fn: scrapeGoogle, name: 'Google' },
    { fn: scrapeMeta, name: 'Meta' }
  ];

  const allJobs: Job[] = [];

  // Scrape JSearch companies one by one
  for (const { fn, name } of jsearchCompanies) {
    const jobs = await safeScrape(fn, name);
    allJobs.push(...jobs);
  }

  // Sentry can run independently (uses Playwright, not JSearch)
  const sentryJobs = await safeScrape(() => scrapeSentry(), 'Sentry');
  allJobs.push(...sentryJobs);

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

    // ✨ Load previous job data to merge with new data (preserve data for failed scrapes)
    let previousJobs: Job[] = [];
    try {
      if (existsSync(DATA_FILE)) {
        const previousData = await readFile(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(previousData);
        previousJobs = parsed.jobs || [];
      }
    } catch (error) {
      console.warn('Could not load previous job data:', error);
    }

    // Group new jobs by company
    const newJobsByCompany = new Map<string, Job[]>();
    for (const job of [...greenhouseJobs, ...otherJobs]) {
      if (!newJobsByCompany.has(job.company)) {
        newJobsByCompany.set(job.company, []);
      }
      newJobsByCompany.get(job.company)!.push(job);
    }

    // Group previous jobs by company
    const previousJobsByCompany = new Map<string, Job[]>();
    for (const job of previousJobs) {
      if (!previousJobsByCompany.has(job.company)) {
        previousJobsByCompany.set(job.company, []);
      }
      previousJobsByCompany.get(job.company)!.push(job);
    }

    // Merge strategy: use new data if available, otherwise keep old data
    const allCompanies = new Set([
      ...newJobsByCompany.keys(),
      ...previousJobsByCompany.keys()
    ]);

    let allJobs: Job[] = [];
    for (const company of allCompanies) {
      const newJobs = newJobsByCompany.get(company) || [];
      const oldJobs = previousJobsByCompany.get(company) || [];

      if (newJobs.length > 0) {
        // Successfully scraped new data - use it
        allJobs.push(...newJobs);
        console.log(`${company}: Using fresh data (${newJobs.length} jobs)`);
      } else if (oldJobs.length > 0) {
        // No new data but have old data - preserve it
        allJobs.push(...oldJobs);
        console.log(`${company}: Preserving cached data (${oldJobs.length} jobs) - scraping failed`);
      } else {
        // No data at all
        console.log(`${company}: No data available`);
      }
    }

    console.log(`Total jobs after merge: ${allJobs.length}`);

    if (allJobs.length === 0) {
      console.warn('No jobs available (no new scrapes and no cached data)');
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

    // Count matched jobs for stats
    const matchedCount = allJobs.filter(job => job.matched).length;
    console.log(`Matched jobs: ${matchedCount} out of ${allJobs.length}`);

    const endTime = Date.now();
    console.log(`Total scraping time: ${(endTime - startTime) / 1000}s`);

    const result = {
      jobs: allJobs, // Save ALL jobs with their match status
      lastUpdated: new Date().toISOString(),
      stats: {
        totalScraped: allJobs.length,
        totalMatched: matchedCount,
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
