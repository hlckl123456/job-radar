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

// Default preferences optimized for phrase matching (2-3 word phrases = +0.25 each)
const DEFAULT_PREFERENCES: Preferences = {
  lookingFor: `- distributed systems
- backend infrastructure
- platform engineering
- workflow orchestration
- system reliability
- senior engineer
- staff engineer
- production systems
- fault tolerance
- event driven
- service architecture
- observability platform
- ai infrastructure
- ml systems
- agent orchestration`,
  notLookingFor: `- pure research
- research scientist
- frontend engineer
- mobile developer
- prompt engineering
- model training
- fine tuning
- sales engineer
- marketing
- recruiter`
};

type SortColumn = 'title' | 'location' | 'match';
type SortDirection = 'asc' | 'desc' | null;

function App() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [jobsData, setJobsData] = useState<JobsData>({ jobs: [], lastUpdated: null });
  const [loading, setLoading] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set());
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<Record<string, SortColumn | null>>({});
  const [sortDirection, setSortDirection] = useState<Record<string, SortDirection>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');  // ✨ Search feature
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());  // ✨ Saved jobs feature

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

    const savedJobsData = localStorage.getItem('jobRadarLastResults');
    if (savedJobsData) {
      setJobsData(JSON.parse(savedJobsData));
    }

    // ✨ Load saved/bookmarked jobs
    const savedJobIds = localStorage.getItem('jobRadarSavedJobs');
    if (savedJobIds) {
      setSavedJobs(new Set(JSON.parse(savedJobIds)));
    }
  }, []);

  // ✨ Save bookmarked jobs to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('jobRadarSavedJobs', JSON.stringify([...savedJobs]));
  }, [savedJobs]);

  // ✨ Toggle save/bookmark for a job
  const toggleSaveJob = (jobId: string) => {
    setSavedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleSavePreferences = () => {
    localStorage.setItem('jobRadarPreferences', JSON.stringify(preferences));
    setEditingPreferences(false);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset preferences to defaults? This will overwrite your current preferences.')) {
      setPreferences(DEFAULT_PREFERENCES);
      localStorage.setItem('jobRadarPreferences', JSON.stringify(DEFAULT_PREFERENCES));
    }
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

      // ✨ Collapse all companies by default after refresh
      const allCompanies = new Set(data.jobs.map((job: Job) => job.company));
      setCollapsedCompanies(allCompanies);
    } catch (error) {
      console.error('Failed to update jobs:', error);
      alert('Failed to update jobs. Make sure the API server is running.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCompany = (company: string) => {
    setCollapsedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(company)) {
        newSet.delete(company);
      } else {
        newSet.add(company);
      }
      return newSet;
    });
  };

  const handleSort = (company: string, column: SortColumn) => {
    const currentColumn = sortColumn[company];
    const currentDirection = sortDirection[company];

    let newDirection: SortDirection;
    if (currentColumn === column) {
      // Cycle through: asc -> desc -> null
      if (currentDirection === 'asc') {
        newDirection = 'desc';
      } else if (currentDirection === 'desc') {
        newDirection = null;
      } else {
        newDirection = 'asc';
      }
    } else {
      newDirection = 'asc';
    }

    setSortColumn({ ...sortColumn, [company]: newDirection ? column : null });
    setSortDirection({ ...sortDirection, [company]: newDirection });
  };

  const sortJobs = (jobs: Job[], company: string): Job[] => {
    const column = sortColumn[company];
    const direction = sortDirection[company];

    // Default sort by match score (descending) if no sort is set
    if (!column || !direction) {
      return [...jobs].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    return [...jobs].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (column) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'location':
          aVal = (a.location || '').toLowerCase();
          bVal = (b.location || '').toLowerCase();
          break;
        case 'match':
          aVal = a.matchScore || 0;
          bVal = b.matchScore || 0;
          break;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
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
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button onClick={() => setEditingPreferences(true)}>Edit Preferences</button>
              <button onClick={handleResetToDefaults} style={{ backgroundColor: '#f0f0f0' }}>Reset to Defaults</button>
            </div>
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSavePreferences}>Save Preferences</button>
              <button onClick={() => setEditingPreferences(false)}>Cancel</button>
              <button onClick={handleResetToDefaults} style={{ backgroundColor: '#f0f0f0' }}>Reset to Defaults</button>
            </div>
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

        <div className="filters-section" style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* ✨ Search Box */}
          <div style={{ flex: '1 1 300px' }}>
            <input
              type="text"
              placeholder="🔍 Search jobs by title or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '0.95rem'
              }}
            />
          </div>

          {/* Location Filter */}
          <div>
            <label htmlFor="location-filter" style={{ marginRight: '8px' }}>Location:</label>
            <select
              id="location-filter"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="all">All Locations</option>
              <option value="us">United States</option>
              <option value="remote">Remote</option>
            </select>
          </div>

          {/* ✨ Saved Jobs Filter */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={searchTerm === ':saved'}
                onChange={(e) => setSearchTerm(e.target.checked ? ':saved' : '')}
                style={{ marginRight: '6px' }}
              />
              Show Saved Only ({savedJobs.size})
            </label>
          </div>
        </div>

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

          // Apply filters to matched jobs
          let matchedJobs = companyJobs.filter(job => job.matched);

          // ✨ Apply search filter
          if (searchTerm) {
            if (searchTerm === ':saved') {
              // Show only saved jobs
              matchedJobs = matchedJobs.filter(job => savedJobs.has(job.id));
            } else {
              // Search by title or location
              const searchLower = searchTerm.toLowerCase();
              matchedJobs = matchedJobs.filter(job =>
                job.title.toLowerCase().includes(searchLower) ||
                (job.location || '').toLowerCase().includes(searchLower)
              );
            }
          }

          // Apply location filter
          if (locationFilter !== 'all') {
            matchedJobs = matchedJobs.filter(job => {
              const location = (job.location || '').toLowerCase();
              if (locationFilter === 'us') {
                return location.includes('united states') ||
                       location.includes('us') ||
                       location.includes(', ca') ||
                       location.includes(', ny') ||
                       location.includes(', tx') ||
                       location.includes(', wa') ||
                       /\b(california|new york|texas|washington|florida|illinois|massachusetts)\b/i.test(location);
              } else if (locationFilter === 'remote') {
                return location.includes('remote');
              }
              return true;
            });
          }

          const filteredMatchedCount = matchedJobs.length;
          const isCollapsed = collapsedCompanies.has(company);

          // Apply sorting
          const sortedJobs = sortJobs(matchedJobs, company);

          // Helper to render sort indicator
          const getSortIndicator = (column: SortColumn) => {
            if (sortColumn[company] === column) {
              return sortDirection[company] === 'asc' ? ' ▲' : ' ▼';
            }
            return '';
          };

          // Determine data source for accuracy badge
          const jsearchCompanies = ['OpenAI', 'Google', 'Meta', 'Amazon', 'Apple', 'Glean'];
          const greenhouseCompanies = ['Anthropic', 'Stripe', 'Databricks', 'Sentry'];

          const getAccuracyBadge = () => {
            if (jsearchCompanies.includes(company)) {
              return (
                <span style={{
                  marginLeft: '10px',
                  fontSize: '0.75em',
                  color: '#ff6b6b',
                  fontWeight: 'normal',
                  backgroundColor: '#ffe0e0',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  ⚠️ May be incomplete - Check Source for accurate listings
                </span>
              );
            } else if (greenhouseCompanies.includes(company)) {
              return (
                <span style={{
                  marginLeft: '10px',
                  fontSize: '0.75em',
                  color: '#51cf66',
                  fontWeight: 'normal',
                  backgroundColor: '#e7f5e7',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  ✓ Official API - Highly accurate
                </span>
              );
            }
            return null;
          };

          return (
            <div key={company} className="company-section" data-company={company}>
              <h3 onClick={() => toggleCompany(company)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <span style={{ marginRight: '8px' }}>{isCollapsed ? '▶' : '▼'}</span>
                {company} ({filteredMatchedCount}/{totalCount})
                {getAccuracyBadge()}
                {careerUrls[company] && (
                  <a
                    href={careerUrls[company]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    🔗 Source
                  </a>
                )}
              </h3>
              {!isCollapsed && (
                sortedJobs.length === 0 ? (
                  <p className="no-jobs">No matched jobs for {company}</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th onClick={() => handleSort(company, 'title')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                          Title{getSortIndicator('title')}
                        </th>
                        <th onClick={() => handleSort(company, 'location')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                          Location{getSortIndicator('location')}
                        </th>
                        <th className="match-column" onClick={() => handleSort(company, 'match')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                          Match{getSortIndicator('match')}
                        </th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedJobs.map(job => (
                        <tr key={job.id} className="matched">
                          <td>{job.title}</td>
                          <td>{job.location || '-'}</td>
                          <td className="match-column">
                            <span className="match-badge">✓ {(job.matchScore! * 100).toFixed(0)}%</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {/* ✨ Save/Bookmark button */}
                            <button
                              onClick={() => toggleSaveJob(job.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.3rem',
                                padding: '4px 8px',
                                marginRight: '8px'
                              }}
                              title={savedJobs.has(job.id) ? 'Remove from saved' : 'Save job'}
                            >
                              {savedJobs.has(job.id) ? '⭐' : '☆'}
                            </button>
                            <a href={job.url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default App;
