# Job Radar - Requirements Document

## Overview
Job Radar is an AI-driven job aggregator MVP that scrapes job postings from 10 major tech companies and matches them against user preferences.

## Target Companies (V1)
1. Anthropic
2. OpenAI
3. Amazon
4. Stripe
5. Apple
6. Databricks
7. Glean
8. Google
9. Meta
10. Sentry

## Core Features

### 1. Job Scraping
- Fetch latest job postings from each company's careers page
- Priority: Use official ATS/careers JSON API when available
- Fallback: Use Playwright browser scraping for structured data extraction
- Store results locally in `data/jobs.json` for caching and replay

### 2. Job Matching
- Compare job postings against user preferences
- Rule-based matching with keyword scoring (V1)
- Output: `matched` boolean and optional `matchScore`

### 3. User Interface
- Display preferences (editable, with defaults)
- "Update Jobs" button to trigger scraping
- Results grouped by company
- Each company section shows:
  - Company name
  - Jobs table with: Title, Team, Location, Posted date, Match score, Snippet, Link
  - "No matching jobs" message if empty
- Results persist across page refreshes

### 4. Preferences Management
- Default preferences pre-filled
- Editable via UI
- Saved to localStorage
- Persisted across sessions

## Default Preferences

### Looking For:
- Senior / Staff level AI engineering or distributed system roles (engineering-focused, not research)
- Distributed Systems: consistency, failure recovery, idempotency, long-running workflows, cross-service orchestration
- Workflow Orchestration: durable execution, failure-aware workflows, compensation vs fix-forward, Temporal-like systems
- Multi-Agent Orchestration: coordination, role separation, capability boundaries, tool contracts, sandboxing
- Distributed AI Systems: treat LLM/agents as unreliable components, production hardening and governance
- Observability & Reliability: tracing/metrics at workflow/agent level, failure mode analysis, debuggability-first

### Not Looking For:
- Pure AI research / model training / algorithm papers
- Prompt-only roles with no system complexity
- Pure frontend roles

## Matching Logic (V1)

### Rule-based Keyword Matching
Current implementation uses simple keyword matching:
- Positive keywords from "Looking for" increase score
- Negative keywords from "Not looking for" decrease score or filter out
- Match threshold determines if job is shown

### Future Improvements
- Semantic similarity using embeddings
- More sophisticated scoring (e.g., TF-IDF, weighted keywords)
- Learning from user feedback
- Role level detection (Senior, Staff, etc.)

## Technical Architecture

### Frontend (app/web)
- React + Vite + TypeScript
- Runs on port 3000
- Uses localStorage for:
  - User preferences
  - Last job search results

### Backend (app/api)
- Express + TypeScript
- Runs on port 3001
- Endpoints:
  - `GET /api/jobs` - Get cached jobs
  - `POST /api/jobs/update` - Trigger scraping and return results
- Caches results to `data/jobs.json`

### E2E Testing (e2e)
- Playwright with Chromium
- Tests cover:
  - Page load with default preferences
  - Preference editing and persistence
  - Job update flow
  - Results display for all 10 companies
  - Link validation
  - Results persistence after refresh

## Development Workflow

### Round 1 (Current)
- Project structure and scaffolding
- Basic UI with preferences and update button
- Mock data API
- Playwright smoke tests

### Round 2+ (Next)
- Implement actual scrapers for each company
- Add matching logic
- Improve UI/UX
- Handle edge cases and errors

## Data Sources Strategy
See `sources.md` for detailed per-company information.

General strategy:
1. Research company careers page
2. Check for JSON/API endpoints (inspect network tab)
3. Document URL, field mappings, and limitations
4. Implement scraper (API client or Playwright)
5. Test and verify data quality
