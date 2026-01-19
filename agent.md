# Job Radar - AI Agent Workflow

This document describes the AI agent-driven development process for Job Radar.

## Agent Role
AI engineer working in a local git repository, implementing a job aggregator MVP through iterative development cycles.

## Core Principles
1. **Test-driven**: Every iteration must pass Playwright E2E tests
2. **Git-tracked**: All changes committed with clear messages
3. **File-system driven**: All requirements and changes documented in `docs/`
4. **No research**: Focus on engineering and product delivery
5. **Avoid LinkedIn**: Use official company APIs and careers pages only

## Iteration Loop

Each iteration follows this cycle:

### 1. Read Requirements
- Check `docs/requirements.md` for current goals
- Review `docs/changelog.md` for previous progress
- Check `docs/sources.md` for data source status

### 2. Implement
- Write/modify code to achieve iteration goals
- Follow MVP principles (minimal, functional, testable)
- Document any assumptions or decisions

### 3. Test
- Run `scripts/test-e2e.sh`
- Ensure all Playwright tests pass (0 failures)
- Fix any issues until tests are green

### 4. Document
- Update `docs/changelog.md` with:
  - What was changed
  - What was fixed
  - What remains to be done
- Update `docs/sources.md` if data sources were researched/implemented

### 5. Commit
- Stage all changes: `git add -A`
- Commit with clear message: `git commit -m "[round-X] description"`
- NO PUSH (local commits only for now)

### 6. Next Iteration
- Continue until completion criteria met

## Completion Criteria

The project is complete when ALL of the following are true:

1. Web + API can be started with `scripts/dev.sh`
2. Jobs can be scraped and displayed (at least minimally functional)
3. Preferences are editable and persist locally
4. Last search results persist across refreshes
5. All docs exist and have content: `requirements.md`, `changelog.md`, `sources.md`, `retrospective.md`
6. `README.md` explains the project and links to docs
7. Playwright E2E tests are fully green (0 failures)
8. All 10 companies are covered (0 jobs allowed but must explain in `sources.md`)
9. Changes are committed per iteration (no push required yet)

## Current Status: Round 1

### Goals
- Project structure and scaffolding
- Basic web UI with preferences
- Mock API server
- Playwright smoke tests
- Documentation foundation

### Completion Status
- [x] Directory structure created
- [x] Web app initialized
- [x] API server set up
- [x] E2E tests configured
- [x] Scripts created (dev.sh, test-e2e.sh)
- [x] Core docs written (requirements.md, sources.md, changelog.md, agent.md)
- [ ] README.md written
- [ ] Dependencies installed
- [ ] E2E tests run and passing
- [ ] Round 1 committed

## Development Philosophy

### Minimal Viable Product (MVP)
- Do the simplest thing that works
- Avoid over-engineering
- Focus on testable, working code

### Incremental Progress
- Each iteration adds value
- Tests prove functionality
- Git history tracks evolution

### Documentation First
- Requirements drive implementation
- Changes are documented
- Future developers (or agents) can understand the history

## Tools and Technologies

- **Frontend**: React, Vite, TypeScript
- **Backend**: Express, TypeScript, Playwright (for scraping)
- **Testing**: Playwright E2E
- **Package Manager**: pnpm
- **Version Control**: git (local commits only)
- **Storage**: Local JSON files + localStorage

## Anti-Patterns to Avoid

- Skipping tests
- Committing broken code
- LinkedIn scraping
- Over-engineering
- Missing documentation
- Pushing to remote (until approved)
