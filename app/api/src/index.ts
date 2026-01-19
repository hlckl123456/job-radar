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

// Trigger job scraping
app.post('/api/jobs/update', async (req, res) => {
  try {
    const { preferences } = req.body;

    // Ensure data directory exists
    await mkdir(DATA_DIR, { recursive: true });

    // For now, return mock data - we'll implement scraping in next iterations
    const mockJobs: Job[] = [
      {
        id: 'anthropic-1',
        company: 'Anthropic',
        title: 'Senior AI Engineer',
        team: 'Engineering',
        location: 'San Francisco, CA',
        posted: '2024-01-15',
        snippet: 'Build AI systems at scale',
        url: 'https://www.anthropic.com/careers',
        matched: true,
        matchScore: 0.85
      }
    ];

    const result = {
      jobs: mockJobs,
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
