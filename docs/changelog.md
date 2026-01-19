# Job Radar - Changelog

## Round 1 - Project Setup and Scaffolding

### Date
2026-01-18

### Summary
Initial project setup with complete directory structure, minimal web UI, API server, and Playwright E2E test suite.

### Changes Made

#### Project Structure
- Created directory structure: `app/web`, `app/api`, `e2e/tests`, `e2e/artifacts`, `docs`, `scripts`, `data`
- Set up pnpm workspace with 3 packages: web, api, e2e

#### Frontend (app/web)
- Initialized React + Vite + TypeScript application
- Implemented Job Radar UI with:
  - Header and branding
  - Preferences section (editable with default values)
  - Update Jobs button
  - Results section grouped by company (10 companies)
  - HTML table display for job listings
- Added localStorage persistence for:
  - User preferences
  - Last search results
- Styled with custom CSS

#### Backend (app/api)
- Set up Express + TypeScript server on port 3001
- Implemented two endpoints:
  - `GET /api/jobs` - Returns cached jobs
  - `POST /api/jobs/update` - Triggers job update (mock data for now)
- Added CORS support
- Jobs cached to `data/jobs.json`

#### E2E Testing (e2e)
- Set up Playwright with TypeScript
- Configured trace, screenshots, and video on failure
- Created comprehensive smoke tests:
  - Page load with default preferences
  - Edit and persist preferences
  - Update jobs flow
  - All 10 company sections displayed
  - Job links validation
  - Results persistence after refresh

#### Scripts
- `scripts/dev.sh` - Starts both web and API servers
- `scripts/test-e2e.sh` - Runs full E2E test suite

#### Documentation
- `docs/requirements.md` - Full requirements specification
- `docs/sources.md` - Data sources tracking (template)
- `docs/changelog.md` - This file
- `agent.md` - Agent workflow documentation (next)
- `README.md` - Project overview (next)

### What Works
- Project structure is complete
- Web UI loads and displays default preferences
- Preferences can be edited and persist to localStorage
- Update Jobs button triggers API call
- Mock data returns one Anthropic job
- All 10 company sections display
- E2E tests should pass smoke tests

### Known Issues / TODO
- Only mock data, no actual scraping yet
- Matching logic not implemented (all jobs marked as matched)
- Need to research and implement scrapers for 10 companies
- Error handling is basic
- No loading indicators during scraping
- No rate limiting or retry logic

### Next Steps (Round 3+)
1. Research and implement scrapers for remaining 9 companies
2. Improve matching logic with semantic analysis
3. Add error handling and retry logic
4. Implement rate limiting

## Round 2 - Anthropic Scraper + Matching Logic

### Date
2026-01-19

### Summary
Implemented real job scraping for Anthropic via Greenhouse API and added keyword-based matching logic.

### Changes Made

#### API Server
- Added `matchJob()` function with keyword-based scoring
  - Positive terms: senior, staff, engineer, distributed, system, AI, etc.
  - Negative terms: frontend, research, prompt-only, model training
  - Score threshold: 0.2 for match
- Added `scrapeAnthropic()` function
  - Fetches jobs from Greenhouse API: `https://boards-api.greenhouse.io/v1/boards/anthropic/jobs`
  - Extracts up to 50 jobs with title, team, location, posted date, URL
  - No authentication required
- Updated `/api/jobs/update` endpoint
  - Scrapes Anthropic jobs in real-time
  - Applies matching logic to all jobs
  - Filters to only return matched jobs
  - Returns match scores for debugging

#### Documentation
- Updated `docs/sources.md`
  - Marked Anthropic as DONE with full API details
  - Marked remaining 9 companies as TODO (Future iteration)
- Updated `docs/changelog.md` (this file)

### What Works
- Real job scraping from Anthropic (337+ jobs available)
- Keyword-based matching filters jobs to relevant positions
- Match scores help rank job relevance
- All 10 company sections still display (Anthropic shows matches, others show "no jobs")
- E2E tests should pass with real data

### Known Issues / TODO
- Only Anthropic implemented (9 companies remaining)
- Matching logic is basic keyword-based (no semantic analysis)
- No rate limiting or error retry
- Scraping is synchronous (could be slow with more companies)

### Next Steps (Round 3+)
1. Research and implement scrapers for remaining 9 companies
2. Improve matching logic
3. Add proper error handling
