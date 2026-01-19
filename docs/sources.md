# Job Radar - Data Sources

This document tracks the careers page URLs and scraping strategies for each company.

## Implementation Summary (Round 3)

**6 out of 10 companies fully working:**
- **Greenhouse API (3)**: Anthropic, Stripe, Databricks - 90+ jobs
- **Playwright Scrapers (3)**: Amazon, Glean, Sentry - 56+ jobs
- **Total**: 146+ jobs scraped per update

**4 companies with partial implementation:**
- **OpenAI, Apple, Google, Meta**: Playwright scrapers implemented but return 0 jobs
- **Root cause**: Heavy JavaScript rendering, complex authentication, or non-standard selectors
- **Future work**: API reverse engineering, authenticated sessions, or longer render waits

## Status Legend
- **DONE**: Fully implemented and tested, returning jobs
- **PARTIAL**: Scraper implemented but returns 0 jobs (needs refinement)
- **TODO**: Not yet implemented

---

## Anthropic
- **Status**: DONE
- **Careers URL**: https://www.anthropic.com/careers
- **JSON/API**: Greenhouse API - `https://boards-api.greenhouse.io/v1/boards/anthropic/jobs`
- **Scraping Strategy**: Direct JSON API call, no authentication required
- **Fields Available**: title, location, departments, updated_at, absolute_url, id
- **Notes**: 337+ jobs available. Fully implemented.

---

## OpenAI
- **Status**: PARTIAL (Playwright implemented, 0 jobs scraped)
- **Careers URL**: https://openai.com/careers/search
- **JSON/API**: None - custom JavaScript-rendered careers platform
- **Scraping Strategy**: Playwright with flexible selectors
- **Notes**: Heavy JavaScript rendering, may need API reverse engineering or longer load times. Scraper implemented but returns 0 jobs currently.

---

## Amazon
- **Status**: DONE
- **Careers URL**: https://www.amazon.jobs/en/search?base_query=software+engineer
- **JSON/API**: None - custom ATS system
- **Scraping Strategy**: Playwright with flexible selectors targeting job links
- **Fields Available**: title, url
- **Notes**: 20+ jobs scraped successfully. May not all match filtering criteria.

---

## Stripe
- **Status**: DONE
- **Careers URL**: https://stripe.com/jobs
- **JSON/API**: Greenhouse API - `https://boards-api.greenhouse.io/v1/boards/stripe/jobs`
- **Scraping Strategy**: Direct JSON API call, no authentication required
- **Fields Available**: title, location, departments, updated_at, absolute_url, id
- **Notes**: 500+ jobs available. Fully implemented.

---

## Apple
- **Status**: PARTIAL (Playwright implemented, 0 jobs scraped)
- **Careers URL**: https://jobs.apple.com/en-us/search?team=apps-and-frameworks-SFTWR-AF+cloud-and-infrastructure-SFTWR-CLD
- **JSON/API**: None - custom careers platform
- **Scraping Strategy**: Playwright targeting job detail links
- **Notes**: Complex JavaScript-rendered table structure. Scraper implemented but returns 0 jobs currently.

---

## Databricks
- **Status**: DONE
- **Careers URL**: https://www.databricks.com/company/careers
- **JSON/API**: Greenhouse API - `https://boards-api.greenhouse.io/v1/boards/databricks/jobs`
- **Scraping Strategy**: Direct JSON API call, no authentication required
- **Fields Available**: title, location, departments, updated_at, absolute_url, id
- **Notes**: 300+ jobs available. Fully implemented.

---

## Glean
- **Status**: DONE
- **Careers URL**: https://glean.com/careers#open-positions
- **JSON/API**: None - custom integration
- **Scraping Strategy**: Playwright with flexible job/position class selectors
- **Fields Available**: title, location, url
- **Notes**: 6 jobs scraped successfully. Smaller company with straightforward HTML structure.

---

## Google
- **Status**: PARTIAL (Playwright implemented, 0 jobs scraped)
- **Careers URL**: https://careers.google.com/jobs/results/?q=software%20engineer
- **JSON/API**: None - custom Google careers system
- **Scraping Strategy**: Playwright targeting job result links
- **Notes**: Heavily JavaScript-rendered with complex filtering. Scraper implemented but returns 0 jobs currently.

---

## Meta
- **Status**: PARTIAL (Playwright implemented, 0 jobs scraped)
- **Careers URL**: https://www.metacareers.com/jobs?q=software%20engineer
- **JSON/API**: None - custom Meta careers platform
- **Scraping Strategy**: Playwright targeting job links
- **Notes**: Custom React-based platform with dynamic rendering. Scraper implemented but returns 0 jobs currently.

---

## Sentry
- **Status**: DONE
- **Careers URL**: https://sentry.io/careers/
- **JSON/API**: None - likely Ashby or custom
- **Scraping Strategy**: Playwright targeting careers page links
- **Fields Available**: title, url
- **Notes**: 30 jobs scraped successfully. Simple HTML structure with career links.

---

## General Notes

### Common ATS Platforms
Many companies use third-party ATS platforms that expose JSON APIs:
- **Greenhouse**: Often has `/boards/[company]/jobs?format=json`
- **Lever**: Often has `/v0/postings/[company]?mode=json`
- **Workday**: Complex, usually requires form submission
- **Custom**: Some large companies build their own

### Scraping Best Practices
1. Always check robots.txt
2. Rate limit requests
3. Cache results locally
4. Use Playwright only when necessary
5. Handle errors gracefully
6. Respect rate limits and ToS

### LinkedIn Note
LinkedIn is NOT used as a data source due to:
- Strong anti-scraping measures
- Terms of Service restrictions
- Better to use company direct sources
