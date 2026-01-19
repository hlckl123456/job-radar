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

### Next Steps (Round 2)
1. Install dependencies (pnpm install)
2. Run E2E tests to verify setup
3. Research data sources for each company
4. Implement first company scraper
5. Add matching logic
