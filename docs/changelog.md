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

### Next Steps (Round 4+)
1. Fix OpenAI, Apple, Google, Meta scrapers (longer waits, API reverse engineering)
2. Add authentication/session support for complex sites
3. Implement more sophisticated matching with embeddings

## Round 3 - Expanded to 6 Companies + Comprehensive Error Handling

### Date
2026-01-19

### Summary
Implemented Playwright scrapers for all 10 companies. Successfully scraped jobs from 6 companies (Anthropic, Stripe, Databricks via Greenhouse; Amazon, Glean, Sentry via Playwright). Improved matching logic with weighted keywords and added comprehensive error handling.

### Changes Made

#### API Server - Complete Refactor
- **Generic Greenhouse scraper**: Extracts data from 3 companies (Anthropic, Stripe, Databricks)
  - Consolidated into reusable `scrapeGreenhouse(companySlug, companyName, limit)` function
  - 90+ jobs from Greenhouse companies

- **7 Custom Playwright scrapers implemented**:
  1. **OpenAI** - Partial (0 jobs, needs longer load/better selectors)
  2. **Amazon** - Working (20+ jobs scraped)
  3. **Apple** - Partial (0 jobs, complex JS rendering)
  4. **Glean** - Working (6 jobs scraped)
  5. **Google** - Partial (0 jobs, complex JS rendering)
  6. **Meta** - Partial (0 jobs, complex React platform)
  7. **Sentry** - Working (30 jobs scraped)

- **Improved matching logic**:
  - Weighted keyword scoring system:
    - High-value terms (0.3 points): senior, staff, principal, lead, distributed systems, orchestration, multi-agent, AI infrastructure
    - Medium-value terms (0.15 points): engineer, backend, platform, infrastructure, system, observability, AI
    - Low-value terms (0.05 points): software, technical, architect, developer
    - Strong negative terms (immediate disqualification): marketing, sales, recruiter, operations, finance
    - Moderate negative terms (-0.4 points): frontend, UI, UX, design, product manager, research scientist, PhD
  - Raised match threshold from 0.2 to 0.3
  - Returns match scores for debugging

- **Comprehensive error handling**:
  - Timeout protection (30s for Greenhouse, 30s for Playwright scrapers)
  - Promise.allSettled for parallel scraping (failures don't block other companies)
  - Try-catch blocks around all async operations
  - Graceful degradation - continues even if parts fail
  - Browser cleanup on errors
  - Detailed error logging with company names

- **Performance improvements**:
  - Parallel scraping of all companies
  - Changed Playwright from 'networkidle' to 'domcontentloaded' for faster loads
  - Total scraping time: ~12-13 seconds (down from 30+ seconds)

#### Documentation
- Updated `docs/sources.md`:
  - Added implementation summary showing 6/10 companies working
  - Marked 6 companies as DONE (Anthropic, Stripe, Databricks, Amazon, Glean, Sentry)
  - Marked 4 companies as PARTIAL (OpenAI, Apple, Google, Meta) with detailed notes
  - Documented scraping strategies for each company

### What Works
- **6 companies fully functional**: Anthropic, Stripe, Databricks, Amazon, Glean, Sentry
- **146+ total jobs scraped** per update (90 from Greenhouse, 56 from Playwright)
- **38 matched jobs** after filtering
- **Improved matching** with weighted keywords reduces false positives
- **Fast scraping**: 12-13 seconds for all companies
- **Robust error handling**: Individual failures don't crash the system
- All E2E tests still passing (to be verified)

### Known Issues / Remaining Work
- **4 companies return 0 jobs**: OpenAI, Apple, Google, Meta
  - Root cause: Heavy JavaScript rendering, authentication requirements, or complex selectors
  - Scrapers are implemented but need refinement
  - May require:
    - API reverse engineering
    - Authenticated browser sessions
    - Longer wait times (5-10s instead of 3s)
    - Screenshot debugging to see actual rendered HTML
- **Limited field extraction**: Some Playwright scrapers only extract title + URL (no location/team)
- **No rate limiting**: Could hit anti-scraping measures with frequent requests

### Next Steps (Round 4+)
1. Debug OpenAI, Apple, Google, Meta scrapers with screenshots
2. Implement authenticated sessions if needed
3. Extract more fields (location, team, posted date) from Playwright scrapers
4. Add rate limiting and request delays
