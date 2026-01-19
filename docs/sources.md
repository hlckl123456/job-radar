# Job Radar - Data Sources

This document tracks the careers page URLs and scraping strategies for each company.

## Status Legend
- **TODO**: Not yet researched
- **IN_PROGRESS**: Currently being implemented
- **DONE**: Fully implemented and tested

---

## Anthropic
- **Status**: TODO
- **Careers URL**: https://www.anthropic.com/careers
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: To be researched in next iteration

---

## OpenAI
- **Status**: TODO
- **Careers URL**: https://openai.com/careers
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: To be researched in next iteration

---

## Amazon
- **Status**: TODO
- **Careers URL**: https://www.amazon.jobs
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: Large ATS system, likely has API

---

## Stripe
- **Status**: TODO
- **Careers URL**: https://stripe.com/jobs
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: To be researched in next iteration

---

## Apple
- **Status**: TODO
- **Careers URL**: https://www.apple.com/careers
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: Large company, likely uses standard ATS

---

## Databricks
- **Status**: TODO
- **Careers URL**: https://www.databricks.com/company/careers
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: To be researched in next iteration

---

## Glean
- **Status**: TODO
- **Careers URL**: https://glean.com/careers
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: Smaller company, may use Greenhouse or Lever

---

## Google
- **Status**: TODO
- **Careers URL**: https://careers.google.com
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: Large ATS system

---

## Meta
- **Status**: TODO
- **Careers URL**: https://www.metacareers.com
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: Custom careers platform

---

## Sentry
- **Status**: TODO
- **Careers URL**: https://sentry.io/careers
- **JSON/API**: TBD
- **Scraping Strategy**: TBD
- **Notes**: Smaller company, may use standard ATS

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
