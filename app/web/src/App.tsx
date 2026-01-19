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
        {companies.map(company => {
          const companyJobs = jobsByCompany[company] || [];
          return (
            <div key={company} className="company-section" data-company={company}>
              <h3>{company}</h3>
              {companyJobs.length === 0 ? (
                <p className="no-jobs">No matching jobs found for {company}</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Team</th>
                      <th>Location</th>
                      <th>Posted</th>
                      <th>Match Score</th>
                      <th>Snippet</th>
                      <th>Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyJobs.map(job => (
                      <tr key={job.id}>
                        <td>{job.title}</td>
                        <td>{job.team || '-'}</td>
                        <td>{job.location || '-'}</td>
                        <td>{job.posted || '-'}</td>
                        <td>{job.matchScore ? job.matchScore.toFixed(2) : '-'}</td>
                        <td>{job.snippet || '-'}</td>
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
