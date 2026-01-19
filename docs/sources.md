# Job Radar - Data Sources

This document tracks the careers page URLs and scraping strategies for each company.

## Status Legend
- **TODO**: Not yet researched
- **IN_PROGRESS**: Currently being implemented
- **DONE**: Fully implemented and tested

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
- **Status**: TODO (Future iteration)
- **Careers URL**: https://openai.com/careers
- **JSON/API**: Not Greenhouse or Lever - needs further research
- **Scraping Strategy**: TBD
- **Notes**: Will require custom scraper or different ATS platform detection

---

## Amazon
- **Status**: TODO (Future iteration)
- **Careers URL**: https://www.amazon.jobs
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: Large ATS system, likely has API

---

## Stripe
- **Status**: TODO (Future iteration)
- **Careers URL**: https://stripe.com/jobs
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: To be researched

---

## Apple
- **Status**: TODO (Future iteration)
- **Careers URL**: https://www.apple.com/careers
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: Large company, likely uses standard ATS

---

## Databricks
- **Status**: TODO (Future iteration)
- **Careers URL**: https://www.databricks.com/company/careers
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: To be researched

---

## Glean
- **Status**: TODO (Future iteration)
- **Careers URL**: https://glean.com/careers
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: May use Greenhouse or Lever

---

## Google
- **Status**: TODO (Future iteration)
- **Careers URL**: https://careers.google.com
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: Large custom ATS

---

## Meta
- **Status**: TODO (Future iteration)
- **Careers URL**: https://www.metacareers.com
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: Custom careers platform

---

## Sentry
- **Status**: TODO (Future iteration)
- **Careers URL**: https://sentry.io/careers
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: May use standard ATS

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
