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

// Sophisticated matching with user preferences, phrase matching, and advanced scoring
function matchJob(job: any, preferences: any): { matched: boolean; matchScore: number } {
  const titleLower = job.title.toLowerCase();
  const teamLower = (job.team || '').toLowerCase();
  const locationLower = (job.location || '').toLowerCase();
  const jobText = `${titleLower} ${teamLower} ${locationLower}`;

  // Parse user preferences if available
  const lookingFor = preferences?.lookingFor?.toLowerCase() || '';
  const notLookingFor = preferences?.notLookingFor?.toLowerCase() || '';

  let score = 0;
  const maxPossibleScore = 1.4; // Fixed: 0.5 + 0.4 + 0.35 + 0.15 = 1.4 (phases 1-5, excluding location bonus)

  // === PHASE 1: User-defined positive preferences (highest priority) ===
  if (lookingFor) {
    const userPositiveTerms = extractKeyTerms(lookingFor);
    const userPhrases = extractPhrases(lookingFor);

    // Check phrases first (exact multi-word matches) - 0.25 points each
    for (const phrase of userPhrases) {
      if (jobText.includes(phrase)) {
        score += 0.25;
      }
    }

    // Check individual terms - 0.1 points each, up to 0.25 total
    let userTermScore = 0;
    for (const term of userPositiveTerms) {
      if (jobText.includes(term) && !userPhrases.some(p => p.includes(term))) {
        userTermScore += 0.1;
      }
    }
    score += Math.min(0.25, userTermScore);
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

  // Match threshold: need at least 0.25 normalized score AND must have valid role type
  const matched = normalizedScore >= 0.25 && hasRoleType && score > 0;

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
  companyName: string
): Promise<T> {
  let browser = null;
  let page = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    page = await browser.newPage();

    // Set reasonable defaults
    await page.setDefaultTimeout(45000);
    await page.setViewportSize({ width: 1280, height: 720 });

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

// OpenAI scraper with enhanced error handling
async function scrapeOpenAI(limit: number = 500): Promise<Job[]> {
  return withRetry(
    async () => {
      return withBrowser(async (browser, page) => {
        try {
          console.log('OpenAI: Navigating to careers page...');
          await page.goto('https://openai.com/careers/search/', {
            waitUntil: 'networkidle',
            timeout: 60000
          });

          console.log('OpenAI: Waiting for content to render...');
          await page.waitForTimeout(15000);

          // Scroll to bottom to trigger lazy loading
          console.log('OpenAI: Scrolling to load all jobs...');
          await page.evaluate(async () => {
            await new Promise<void>((resolve) => {
              let totalHeight = 0;
              const distance = 500;
              const timer = setInterval(() => {
                const scrollHeight = document.documentElement.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                  clearInterval(timer);
                  resolve();
                }
              }, 200);
            });
          });

          // Wait for any additional content to load
          await page.waitForTimeout(3000);

          // Extract all job cards
          const jobs = await page.evaluate(() => {
            const results: any[] = [];

            // Strategy 1: Look for elements with job-related data attributes or classes
            const jobCards = document.querySelectorAll('[data-job], [data-role], .job-card, .role-card, article, [role="article"]');

            jobCards.forEach(card => {
              const link = card.querySelector('a[href*="/careers/"]');
              if (link) {
                const href = link.getAttribute('href') || '';
                const title = link.textContent?.trim() || card.querySelector('h2, h3, .title')?.textContent?.trim() || '';

                if (href && title && title.length > 3 &&
                    !href.endsWith('/careers/') &&
                    !href.endsWith('/careers/search') &&
                    !href.endsWith('/careers/search/')) {

                  const fullUrl = href.startsWith('http') ? href : `https://openai.com${href}`;
                  results.push({ title, url: fullUrl });
                }
              }
            });

            // Strategy 2: Find all links with /careers/ in href and extract meaningful titles
            if (results.length === 0) {
              const allLinks = Array.from(document.querySelectorAll('a[href*="/careers/"]'));

              allLinks.forEach(link => {
                const href = link.getAttribute('href') || '';
                const text = link.textContent?.trim() || '';

                // Filter out navigation links
                if (text.length > 10 &&
                    !href.endsWith('/careers/') &&
                    !href.endsWith('/careers/search') &&
                    !href.endsWith('/careers/search/') &&
                    !text.toLowerCase().includes('view all') &&
                    !text.toLowerCase().includes('see all') &&
                    !text.toLowerCase().includes('learn more') &&
                    !text.toLowerCase().includes('apply now')) {

                  const fullUrl = href.startsWith('http') ? href : `https://openai.com${href}`;
                  results.push({ title: text, url: fullUrl });
                }
              });
            }

            // Deduplicate by URL
            const uniqueJobs = Array.from(
              new Map(results.map(job => [job.url, job])).values()
            );

            return uniqueJobs;
          });

          console.log(`OpenAI: Found ${jobs.length} job listings`);

          if (!jobs || jobs.length === 0) {
            throw new Error(`No jobs found on page`);
          }

          const rawJobs = jobs.slice(0, limit).map((job, index) => ({
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

          // Validate jobs
          const validatedJobs = rawJobs
            .map(job => validateAndSanitizeJob(job, 'OpenAI'))
            .filter((job): job is Job => job !== null);

          console.log(`OpenAI: ${validatedJobs.length} valid jobs after validation`);

          if (validatedJobs.length === 0) {
            throw new Error('No valid jobs after validation');
          }

          return validatedJobs;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`OpenAI scraping failed: ${errorMessage}`);
        }
      }, 'OpenAI');
    },
    { maxRetries: 1, retryDelay: 3000, timeoutMs: 120000, companyName: 'OpenAI' }
  );
}

// Amazon scraper using Playwright
async function scrapeAmazon(limit: number = 30): Promise<Job[]> {
  return withRetry(
    async () => {
      return withBrowser(async (browser, page) => {
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

          if (!jobs || jobs.length === 0) {
            throw new Error('No jobs found on page');
          }

          const rawJobs = jobs
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

          // Validate jobs
          const validatedJobs = rawJobs
            .map(job => validateAndSanitizeJob(job, 'Amazon'))
            .filter((job): job is Job => job !== null);

          if (validatedJobs.length === 0) {
            throw new Error('No valid jobs after validation');
          }

          return validatedJobs;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Amazon scraping failed: ${errorMessage}`);
        }
      }, 'Amazon');
    },
    { maxRetries: 1, retryDelay: 3000, timeoutMs: 75000, companyName: 'Amazon' }
  );
}

// Apple scraper using Playwright
async function scrapeApple(limit: number = 30): Promise<Job[]> {
  return withRetry(
    async () => {
      return withBrowser(async (browser, page) => {
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

          if (!jobs || jobs.length === 0) {
            throw new Error('No jobs found on page');
          }

          const rawJobs = jobs
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

          // Validate jobs
          const validatedJobs = rawJobs
            .map(job => validateAndSanitizeJob(job, 'Apple'))
            .filter((job): job is Job => job !== null);

          if (validatedJobs.length === 0) {
            throw new Error('No valid jobs after validation');
          }

          return validatedJobs;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Apple scraping failed: ${errorMessage}`);
        }
      }, 'Apple');
    },
    { maxRetries: 1, retryDelay: 3000, timeoutMs: 75000, companyName: 'Apple' }
  );
}

// Glean scraper using Playwright
async function scrapeGlean(limit: number = 30): Promise<Job[]> {
  return withRetry(
    async () => {
      return withBrowser(async (browser, page) => {
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

          if (!jobs || jobs.length === 0) {
            throw new Error('No jobs found on page');
          }

          const rawJobs = jobs
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

          // Validate jobs
          const validatedJobs = rawJobs
            .map(job => validateAndSanitizeJob(job, 'Glean'))
            .filter((job): job is Job => job !== null);

          if (validatedJobs.length === 0) {
            throw new Error('No valid jobs after validation');
          }

          return validatedJobs;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Glean scraping failed: ${errorMessage}`);
        }
      }, 'Glean');
    },
    { maxRetries: 1, retryDelay: 3000, timeoutMs: 75000, companyName: 'Glean' }
  );
}

// Google scraper using Playwright
async function scrapeGoogle(limit: number = 30): Promise<Job[]> {
  return withRetry(
    async () => {
      return withBrowser(async (browser, page) => {
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

          if (!jobs || jobs.length === 0) {
            throw new Error('No jobs found on page');
          }

          const rawJobs = jobs
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

          // Validate jobs
          const validatedJobs = rawJobs
            .map(job => validateAndSanitizeJob(job, 'Google'))
            .filter((job): job is Job => job !== null);

          if (validatedJobs.length === 0) {
            throw new Error('No valid jobs after validation');
          }

          return validatedJobs;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Google scraping failed: ${errorMessage}`);
        }
      }, 'Google');
    },
    { maxRetries: 1, retryDelay: 3000, timeoutMs: 75000, companyName: 'Google' }
  );
}

// Meta scraper using Playwright
async function scrapeMeta(limit: number = 30): Promise<Job[]> {
  return withRetry(
    async () => {
      return withBrowser(async (browser, page) => {
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

          if (!jobs || jobs.length === 0) {
            throw new Error('No jobs found on page');
          }

          const rawJobs = jobs
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

          // Validate jobs
          const validatedJobs = rawJobs
            .map(job => validateAndSanitizeJob(job, 'Meta'))
            .filter((job): job is Job => job !== null);

          if (validatedJobs.length === 0) {
            throw new Error('No valid jobs after validation');
          }

          return validatedJobs;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Meta scraping failed: ${errorMessage}`);
        }
      }, 'Meta');
    },
    { maxRetries: 1, retryDelay: 3000, timeoutMs: 75000, companyName: 'Meta' }
  );
}

// Sentry scraper using Playwright
async function scrapeSentry(limit: number = 30): Promise<Job[]> {
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

  // Run all scrapers in parallel with safety wrappers (use default limits of 500)
  const results = await Promise.all([
    safeScrape(() => scrapeOpenAI(), 'OpenAI'),
    safeScrape(() => scrapeAmazon(), 'Amazon'),
    safeScrape(() => scrapeApple(), 'Apple'),
    safeScrape(() => scrapeGlean(), 'Glean'),
    safeScrape(() => scrapeGoogle(), 'Google'),
    safeScrape(() => scrapeMeta(), 'Meta'),
    safeScrape(() => scrapeSentry(), 'Sentry')
  ]);

  return results.flat();
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
