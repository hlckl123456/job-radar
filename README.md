# Job Radar

An AI-driven job aggregator MVP that scrapes job postings from 10 major tech companies and matches them against your preferences.

## What is This?

Job Radar is an experimental project demonstrating **AI Agent-driven development**. An AI agent (Claude) built this entire application autonomously through iterative development cycles, following test-driven development principles.

### Target Companies
- Anthropic
- OpenAI
- Amazon
- Stripe
- Apple
- Databricks
- Glean
- Google
- Meta
- Sentry

### Key Features
- One-click job scraping from company careers pages
- Customizable job preferences with keyword matching
- Results grouped by company and sorted by posting date
- Local persistence (no backend database needed)
- Fully tested with Playwright E2E tests

## How to Run

### Prerequisites
- Node.js 18+ and pnpm installed
- Git

### Development Mode
```bash
# Install dependencies
pnpm install

# Start both web and API servers
./scripts/dev.sh

# Open browser to http://localhost:3000
```

### Running Tests
```bash
# Run full E2E test suite
./scripts/test-e2e.sh
```

## Project Structure

```
job-radar/
├── app/
│   ├── web/           # React frontend (port 3000)
│   └── api/           # Express API server (port 3001)
├── e2e/
│   ├── tests/         # Playwright E2E tests
│   └── artifacts/     # Test output (traces, screenshots)
├── docs/
│   ├── requirements.md     # Full requirements spec
│   ├── changelog.md        # Development history
│   ├── sources.md          # Data sources for each company
│   └── retrospective.md    # Lessons learned (post-completion)
├── scripts/
│   ├── dev.sh             # Start dev servers
│   └── test-e2e.sh        # Run E2E tests
├── data/                  # Cached job results
└── agent.md              # AI agent workflow documentation
```

## Technology Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Express + TypeScript + Playwright (for scraping)
- **Testing**: Playwright E2E
- **Package Manager**: pnpm
- **Storage**: Local JSON files + localStorage

## How It Works

1. **User edits preferences** - Specify what you're looking for and what to avoid
2. **Click "Update Jobs"** - Triggers scraping from all 10 companies
3. **Jobs are matched** - Rule-based keyword matching against your preferences
4. **Results displayed** - Grouped by company, showing only matched jobs
5. **Results persist** - Cached locally so you can refresh without re-scraping

## AI Agent Development

This project was built by an AI agent following these principles:
- **Test-driven**: Every iteration must pass E2E tests
- **Git-tracked**: All changes committed with clear messages
- **File-system driven**: Requirements and changes documented in `docs/`
- **Iterative**: Small, incremental improvements per cycle

See [agent.md](./agent.md) for the full agent workflow and [docs/changelog.md](./docs/changelog.md) for detailed development history.

## Development Status

Current version: **Round 1 - MVP Scaffolding**

- [x] Project structure and setup
- [x] Basic UI with preferences management
- [x] API server with mock data
- [x] Playwright E2E test suite
- [ ] Actual scrapers for 10 companies (next iteration)
- [ ] Sophisticated matching logic
- [ ] Error handling and edge cases

## Documentation

- [Requirements](./docs/requirements.md) - Full product requirements
- [Changelog](./docs/changelog.md) - Development history and changes
- [Data Sources](./docs/sources.md) - Company careers page URLs and scraping strategies
- [Agent Workflow](./agent.md) - How the AI agent builds this project

## License

MIT

## Contributing

This is an AI agent experiment. The AI agent will continue development through autonomous iterations. Watch the git history and changelog to see how it evolves!
