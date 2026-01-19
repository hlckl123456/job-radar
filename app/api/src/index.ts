import express from 'express';
import cors from 'cors';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Simple keyword-based matching
function matchJob(job: any, preferences: any): { matched: boolean; matchScore: number } {
  const lookingFor = (preferences?.lookingFor || '').toLowerCase();
  const notLookingFor = (preferences?.notLookingFor || '').toLowerCase();
  const jobText = `${job.title} ${job.team || ''} ${job.location || ''}`.toLowerCase();

  // Extract key positive terms
  const positiveTerms = [
    'senior', 'staff', 'engineer', 'engineering', 'distributed', 'system',
    'ai', 'infrastructure', 'backend', 'platform', 'workflow', 'orchestration'
  ];

  //Extract negative terms
  const negativeTerms = [
    'frontend', 'research', 'prompt-only', 'model training'
  ];

  let score = 0;
  let matched = false;

  // Check positive terms
  for (const term of positiveTerms) {
    if (jobText.includes(term)) {
      score += 0.1;
    }
  }

  // Check negative terms
  for (const term of negativeTerms) {
    if (jobText.includes(term)) {
      score -= 0.3;
    }
  }

  // Basic threshold
  matched = score > 0.2;

  return { matched, matchScore: Math.max(0, Math.min(1, score)) };
}

// Scrape Anthropic jobs from Greenhouse API
async function scrapeAnthropic(): Promise<Job[]> {
  try {
    const response = await fetch('https://boards-api.greenhouse.io/v1/boards/anthropic/jobs');
    const data = await response.json();

    return data.jobs.slice(0, 50).map((job: any) => ({
      id: `anthropic-${job.id}`,
      company: 'Anthropic',
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
    console.error('Error scraping Anthropic:', error);
    return [];
  }
}

// Placeholder scrapers for other companies
async function scrapeOtherCompanies(): Promise<Job[]> {
  // Return empty for now - to be implemented
  return [];
}

// Trigger job scraping
app.post('/api/jobs/update', async (req, res) => {
  try {
    const { preferences } = req.body;

    // Ensure data directory exists
    await mkdir(DATA_DIR, { recursive: true });

    // Scrape jobs
    console.log('Scraping Anthropic jobs...');
    const anthropicJobs = await scrapeAnthropic();

    console.log('Scraping other companies...');
    const otherJobs = await scrapeOtherCompanies();

    // Combine all jobs
    let allJobs = [...anthropicJobs, ...otherJobs];

    // Apply matching logic
    allJobs = allJobs.map(job => {
      const { matched, matchScore } = matchJob(job, preferences);
      return { ...job, matched, matchScore };
    });

    // Filter to only matched jobs
    const matchedJobs = allJobs.filter(job => job.matched);

    const result = {
      jobs: matchedJobs,
      lastUpdated: new Date().toISOString()
    };

    await writeFile(DATA_FILE, JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('Error updating jobs:', error);
    res.status(500).json({ error: 'Failed to update jobs' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
