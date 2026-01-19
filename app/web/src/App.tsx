import { useState, useEffect } from 'react';
import './App.css';

interface Job {
  id: string;
  company: string;
  title: string;
  team?: string;
  location?: string;
  posted?: string;
  snippet?: string;
  url: string;
  matchScore?: number;
  matched: boolean;
}

interface JobsData {
  jobs: Job[];
  lastUpdated: string | null;
  stats?: {
    totalScraped: number;
    totalMatched: number;
    scrapingTimeMs: number;
  };
}

interface Preferences {
  lookingFor: string;
  notLookingFor: string;
}

const DEFAULT_PREFERENCES: Preferences = {
  lookingFor: `- Senior / Staff level AI engineering or distributed system roles (engineering-focused, not research)
- Distributed Systems: consistency, failure recovery, idempotency, long-running workflows, cross-service orchestration
- Workflow Orchestration: durable execution, failure-aware workflows, compensation vs fix-forward, Temporal-like systems
- Multi-Agent Orchestration: coordination, role separation, capability boundaries, tool contracts, sandboxing
- Distributed AI Systems: treat LLM/agents as unreliable components, production hardening and governance
- Observability & Reliability: tracing/metrics at workflow/agent level, failure mode analysis, debuggability-first`,
  notLookingFor: `- Pure AI research / model training / algorithm papers
- Prompt-only roles with no system complexity
- Pure frontend roles`
};

function App() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [jobsData, setJobsData] = useState<JobsData>({ jobs: [], lastUpdated: null });
  const [loading, setLoading] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);

  // Load preferences and jobs from localStorage on mount
  useEffect(() => {
    // Check data version and clear old cache if needed
    const DATA_VERSION = '2'; // Increment when data structure changes
    const currentVersion = localStorage.getItem('jobRadarDataVersion');

    if (currentVersion !== DATA_VERSION) {
      console.log('Clearing old cache due to data version change');
      localStorage.removeItem('jobRadarLastResults');
      localStorage.setItem('jobRadarDataVersion', DATA_VERSION);
    }

    const savedPrefs = localStorage.getItem('jobRadarPreferences');
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs));
    }

    const savedJobs = localStorage.getItem('jobRadarLastResults');
    if (savedJobs) {
      setJobsData(JSON.parse(savedJobs));
    }
  }, []);

  const handleSavePreferences = () => {
    localStorage.setItem('jobRadarPreferences', JSON.stringify(preferences));
    setEditingPreferences(false);
  };

  const handleUpdateJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/jobs/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences })
      });
      const data = await response.json();
      setJobsData(data);
      localStorage.setItem('jobRadarLastResults', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to update jobs:', error);
      alert('Failed to update jobs. Make sure the API server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Group jobs by company
  const jobsByCompany = jobsData.jobs.reduce((acc, job) => {
    if (!acc[job.company]) {
      acc[job.company] = [];
    }
    acc[job.company].push(job);
    return acc;
  }, {} as Record<string, Job[]>);

  const companies = ['Anthropic', 'OpenAI', 'Amazon', 'Stripe', 'Apple', 'Databricks', 'Glean', 'Google', 'Meta', 'Sentry'];

  return (
    <div className="app">
      <header>
        <h1>Job Radar</h1>
        <p>AI-driven job aggregator for senior engineering roles</p>
      </header>

      <section className="preferences-section">
        <h2>Job Preferences</h2>
        {!editingPreferences ? (
          <div>
            <button onClick={() => setEditingPreferences(true)}>Edit Preferences</button>
            <div className="preferences-display">
              <div>
                <strong>Looking for:</strong>
                <pre>{preferences.lookingFor}</pre>
              </div>
              <div>
                <strong>Not looking for:</strong>
                <pre>{preferences.notLookingFor}</pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="preferences-edit">
            <div>
              <label>
                <strong>Looking for:</strong>
                <textarea
                  value={preferences.lookingFor}
                  onChange={(e) => setPreferences({ ...preferences, lookingFor: e.target.value })}
                  rows={8}
                />
              </label>
            </div>
            <div>
              <label>
                <strong>Not looking for:</strong>
                <textarea
                  value={preferences.notLookingFor}
                  onChange={(e) => setPreferences({ ...preferences, notLookingFor: e.target.value })}
                  rows={5}
                />
              </label>
            </div>
            <button onClick={handleSavePreferences}>Save Preferences</button>
            <button onClick={() => setEditingPreferences(false)}>Cancel</button>
          </div>
        )}
      </section>

      <section className="actions-section">
        <button
          onClick={handleUpdateJobs}
          disabled={loading}
          className="update-button"
        >
          {loading ? 'Updating Jobs...' : 'Update Jobs'}
        </button>
        {jobsData.lastUpdated && (
          <p className="last-updated">
            Last updated: {new Date(jobsData.lastUpdated).toLocaleString()}
          </p>
        )}
      </section>

      <section className="results-section">
        <h2>Job Results</h2>
        {jobsData.stats && (
          <p className="stats-summary">
            Total: {jobsData.stats.totalScraped} jobs scraped, {jobsData.stats.totalMatched} matched
          </p>
        )}
        {companies.map(company => {
          const companyJobs = jobsByCompany[company] || [];
          const matchedCount = companyJobs.filter(job => job.matched).length;
          const totalCount = companyJobs.length;

          // Company career page URLs
          const careerUrls: Record<string, string> = {
            'Anthropic': 'https://boards.greenhouse.io/anthropic',
            'OpenAI': 'https://openai.com/careers/search',
            'Amazon': 'https://www.amazon.jobs/en/search?base_query=software+engineer',
            'Stripe': 'https://stripe.com/jobs/search',
            'Apple': 'https://jobs.apple.com/en-us/search?team=apps-and-frameworks-SFTWR-AF+cloud-and-infrastructure-SFTWR-CLD',
            'Databricks': 'https://databricks.com/company/careers',
            'Glean': 'https://glean.com/careers',
            'Google': 'https://careers.google.com/jobs/results/?q=software%20engineer',
            'Meta': 'https://www.metacareers.com/jobs?q=software%20engineer',
            'Sentry': 'https://sentry.io/careers/'
          };

          const matchedJobs = companyJobs.filter(job => job.matched);

          return (
            <div key={company} className="company-section" data-company={company}>
              <h3>
                {company} ({matchedCount}/{totalCount})
                {careerUrls[company] && (
                  <a href={careerUrls[company]} target="_blank" rel="noopener noreferrer" className="source-link">
                    🔗 Source
                  </a>
                )}
              </h3>
              {matchedJobs.length === 0 ? (
                <p className="no-jobs">No matched jobs for {company}</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Team</th>
                      <th>Location</th>
                      <th>Match</th>
                      <th>Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedJobs.map(job => (
                      <tr key={job.id} className="matched">
                        <td>{job.title}</td>
                        <td>{job.team || '-'}</td>
                        <td>{job.location || '-'}</td>
                        <td>
                          <span className="match-badge">✓ {(job.matchScore! * 100).toFixed(0)}%</span>
                        </td>
                        <td>
                          <a href={job.url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default App;
