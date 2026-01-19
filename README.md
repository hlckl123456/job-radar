# 🎯 Job Radar

> An intelligent job aggregator that scrapes and matches jobs from 10 major tech companies using a sophisticated multi-stage scoring algorithm.

Stop manually checking 10+ career pages every day. Job Radar automates job discovery, intelligently matches against your preferences, and surfaces only the opportunities that matter to you.

## ✨ Key Features

### 🎪 Smart Matching Algorithm
- **8-phase scoring system** with user preferences, seniority, technical domains, and role validation
- **Phrase-based matching** - 2-3 word phrases score 2.5x higher than single keywords
- **Automatic disqualification** of unwanted roles (research, sales, frontend, etc.)
- **25% match threshold** ensures only relevant jobs are shown
- **Percentage-based scores** (25-100%) help prioritize applications

### 🏢 10 Major Tech Companies
| Company | Data Source | Accuracy |
|---------|-------------|----------|
| Anthropic | Greenhouse API | ✓ Official - Highly Accurate |
| Stripe | Greenhouse API | ✓ Official - Highly Accurate |
| Databricks | Greenhouse API | ✓ Official - Highly Accurate |
| Sentry | Greenhouse API | ✓ Official - Highly Accurate |
| OpenAI | JSearch API | ⚠️ May be incomplete |
| Google | JSearch API | ⚠️ May be incomplete |
| Meta | JSearch API | ⚠️ May be incomplete |
| Amazon | JSearch API | ⚠️ May be incomplete |
| Apple | JSearch API | ⚠️ May be incomplete |
| Glean | JSearch API | ⚠️ May be incomplete |

**Hybrid Strategy**: Uses official APIs (Greenhouse) where available for maximum accuracy, and JSearch API for companies with bot detection (Playwright-resistant).

### 🎨 Rich UI Features
- **Collapsible company sections** - Focus on what matters
- **4-column sorting** - Sort by Title, Employment Type, Location, or Match %
- **Advanced filtering** - Filter by US locations, Remote, or Employment Type
- **Default match-based ordering** - Jobs automatically sorted by relevance
- **Data accuracy badges** - Know which sources are official vs aggregated
- **One-click career page links** - Jump directly to source for verification

### 💾 Persistent Storage
- **localStorage-based** - No database required
- **Customizable preferences** - Saved across sessions
- **Reset to defaults** - Optimized phrase-based preferences included
- **Cached results** - Fast refresh without re-scraping

### 🔍 Optimized for Senior Engineers
Default preferences target:
- Distributed systems & backend infrastructure
- Platform engineering & workflow orchestration
- AI/ML infrastructure & agent systems
- Senior/Staff level positions
- Production-grade system design

**Anti-patterns filtered out**:
- Pure research positions
- Frontend/mobile development
- Sales, marketing, recruiting
- Model training & prompt engineering

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm
- RapidAPI Key (for JSearch API)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/job-radar.git
cd job-radar

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Add your RAPIDAPI_KEY to .env

# Start development servers
pnpm dev
```

Open http://localhost:3000 in your browser.

### First Time Setup

1. **Edit Preferences** - Click "Edit Preferences" or use "Reset to Defaults" for optimized settings
2. **Click "Update Jobs"** - Scrapes jobs from all 10 companies (~30-60 seconds)
3. **Explore Results** - Use filters, sorting, and collapsing to find your next role
4. **Apply** - Click job titles to view full descriptions on company career pages

## 📊 How It Works

### Matching Algorithm

Jobs are scored through 8 phases:

1. **User Positive Preferences** (0-0.5 pts)
   - 2-3 word phrases: +0.25 each
   - Single keywords: +0.1 each (max 0.25)

2. **User Negative Preferences** (disqualify or penalty)
   - Phrase match: Instant disqualification ❌
   - Keyword match: -0.3 per term

3. **Seniority** (0-0.4 pts)
   - Staff/Principal: +0.4
   - Senior/Lead: +0.25
   - Mid-level: +0.1

4. **Technical Domains** (0-0.35 pts)
   - Distributed systems, backend, AI/ML, orchestration, observability
   - +0.08 per domain (max 0.35)

5. **Role Type** (0.15 pts, required)
   - Must contain: engineer, developer, architect, scientist

6. **Strong Negatives** (instant disqualification)
   - Marketing, sales, recruiting, finance, HR, etc.

7. **Moderate Negatives** (-0.25 per category)
   - Frontend, pure research, product/program manager, junior roles

8. **Location Bonus** (+0.05 pts)
   - Remote, San Francisco, New York, etc.

**Final Score**: Normalized to 0-100%, threshold: 25%

### Data Collection Strategy

**Greenhouse Companies** (4 companies, ~1000+ jobs):
- Direct API access to official job boards
- 100% accurate and complete
- No bot detection issues
- Includes: Anthropic (338 jobs), Stripe, Databricks, Sentry

**JSearch Companies** (6 companies, ~300+ jobs):
- Aggregated from job boards via RapidAPI
- May miss some listings (coverage varies 30-80%)
- Bypasses Playwright bot detection
- Employment Type coverage: 94%+
- Includes: OpenAI, Google, Meta, Amazon, Apple, Glean

**Why not Greenhouse for all?** Some companies don't use Greenhouse, and direct scraping with Playwright triggers bot detection on modern career pages.

## 🎯 Writing Effective Preferences

### ✅ Good Examples (2-3 word phrases)

```
Looking for:
- distributed systems
- backend infrastructure
- platform engineering
- senior engineer
- staff engineer
- workflow orchestration
- ai infrastructure

Not looking for:
- pure research
- research scientist
- frontend engineer
- prompt engineering
- model training
```

Each phrase = +0.25 points (high impact!)

### ❌ Bad Examples (long sentences)

```
Looking for:
- Senior / Staff level AI engineering or distributed system roles (engineering-focused, not research)
```

This gets tokenized into individual words, each only +0.1 points (low impact!)

**Pro tip**: See `preferences-guide.md` for detailed best practices.

## 🔧 Project Structure

```
job-radar/
├── app/
│   ├── web/              # React + Vite frontend (port 3000)
│   │   └── src/
│   │       ├── App.tsx   # Main UI with filters, sorting, collapsing
│   │       └── App.css   # Styling
│   └── api/              # Express API server (port 3001)
│       └── src/
│           └── index.ts  # 8-phase matching + scrapers
├── test-*.ts             # API comparison & optimization scripts
├── preferences-guide.md  # How to write effective preferences
└── explore-jsearch.ts    # JSearch API exploration tool
```

## 🛠 Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Express, TypeScript, Playwright (for Sentry scraping)
- **APIs**:
  - Greenhouse API (official job boards)
  - JSearch API via RapidAPI (aggregated jobs)
- **Storage**: localStorage + JSON file cache
- **Package Manager**: pnpm workspaces

## 📈 Stats & Performance

- **Total Companies**: 10
- **Total Jobs Scraped**: ~1300+ per run
- **Average Matched**: 200-400 (varies by preferences)
- **Scraping Time**: 30-60 seconds (parallel execution)
- **Match Scoring Time**: ~100ms for 1300 jobs
- **Greenhouse Coverage**: 100% accurate
- **JSearch Coverage**: 30-80% depending on company

## 🧪 Testing & Validation

Built-in test scripts for API validation:

```bash
# Compare Greenhouse vs JSearch for Anthropic
npx tsx test-anthropic-comparison.ts

# Test all companies to determine best API
npx tsx test-all-companies-comparison.ts

# Explore JSearch API capabilities
npx tsx explore-jsearch.ts

# Test Sentry scraping and matching
npx tsx test-sentry-scraper.ts
npx tsx test-sentry-detailed-matching.ts
```

## 🎓 Key Learnings

### Why JSearch?
- Bypasses Playwright bot detection on modern career pages
- Single API for multiple companies reduces complexity
- 94%+ employment type coverage (better than expected!)
- Faster than browser automation (no headless overhead)

### Why Keep Greenhouse?
- Official APIs = 100% accuracy and completeness
- Anthropic alone has 338 jobs (JSearch only finds 100)
- No rate limits or API costs
- More reliable than scraping

### Hybrid Strategy Wins
Combining official APIs with aggregated data maximizes both accuracy and coverage while minimizing scraping complexity.

## 🚧 Known Limitations

- **JSearch Coverage**: Not all jobs appear in aggregated data (30-80% depending on company)
- **Sentry Location Parsing**: Extracts location from concatenated title (e.g., "TitleLocation")
- **No Job Descriptions**: Only fetches titles, locations, employment types (for performance)
- **Rate Limits**: JSearch has API limits; space out "Update Jobs" clicks
- **No Authentication**: Preferences stored in browser localStorage only

## 🔮 Future Enhancements

- [ ] Job description caching for better matching
- [ ] Email notifications for new matches
- [ ] More companies (Netflix, Airbnb, Uber, etc.)
- [ ] Salary information (where available)
- [ ] Application tracking
- [ ] Browser extension
- [ ] Mobile app

## 📜 License

MIT

## 🤝 Contributing

PRs welcome! Areas for contribution:
- Additional company scrapers
- Improved matching algorithm
- UI/UX enhancements
- Testing & validation
- Documentation

## ⭐ Star History

If you find Job Radar useful, give it a star! ⭐

---

**Built with ❤️ for senior engineers tired of manually checking 10+ career pages**

**Questions?** Open an issue or check `preferences-guide.md` for detailed usage instructions.
