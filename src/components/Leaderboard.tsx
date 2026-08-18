import React, { useEffect, useId, useRef, useState } from 'react';
import { BarChart3, Search, Table, Trophy } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { categories } from '../data/challengeData';
import { fetchLeaderboards } from '../lib/api';
import { categoryLabel, formatRmse } from '../lib/format';
import { CategoryId, LeaderboardEntry, LeaderboardsData } from '../types';
import { useTheme } from '../context/ThemeContext';

interface LeaderboardProps {
  compact?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ compact = false }) => {
  const instanceId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [active, setActive] = useState<CategoryId>('lidar');
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [leaderboards, setLeaderboards] = useState<LeaderboardsData>({
    lidar: [],
    vision: [],
    combined: [],
  });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const { theme } = useTheme();

  useEffect(() => {
    let ignore = false;
    fetchLeaderboards()
      .then((payload) => {
        if (!ignore) {
          setLeaderboards(payload);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!ignore) setStatus('error');
      });
    return () => {
      ignore = true;
    };
  }, []);

  const tabId = (category: string) => `${instanceId}-leaderboard-tab-${category}`;
  const panelId = (category: string) => `${instanceId}-leaderboard-panel-${category}`;

  const handleTabKeyDown = (event: React.KeyboardEvent, currentTabId: CategoryId) => {
    const currentIndex = categories.findIndex((tab) => tab.id === currentTabId);
    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + categories.length) % categories.length;
        break;
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % categories.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = categories.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = categories[nextIndex];
    setActive(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  };

  return (
    <section
      className={compact ? 'leaderboard compact-panel' : 'leaderboard page-panel'}
      id={compact ? 'leaderboard-preview' : 'leaderboards'}
    >
      <div className="section-heading">
        <p className="eyebrow">
          <Trophy size={16} /> Benchmark Rankings
        </p>
        <h2 className="gradient-title">{compact ? 'Current Benchmark Snapshot' : 'Official Leaderboards'}</h2>
        {!compact && (
          <p>
            Rankings are determined by lower ATE RMSE (Absolute Trajectory Error). The Combined view provides
            an exploratory comparison across sensor modalities.
          </p>
        )}
      </div>

      <div className="tab-header-row">
        <div className="tab-list" role="tablist" aria-label="Leaderboard category">
          {categories.map((tab) => (
            <button
              className={active === tab.id ? 'tab active' : 'tab'}
              type="button"
              key={tab.id}
              id={tabId(tab.id)}
              role="tab"
              aria-selected={active === tab.id}
              aria-controls={panelId(tab.id)}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              ref={(element) => {
                tabRefs.current[tab.id] = element;
              }}
              tabIndex={active === tab.id ? 0 : -1}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {!compact && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter team or method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: '2.3rem',
                  paddingTop: '0.45rem',
                  paddingBottom: '0.45rem',
                  fontSize: '0.88rem',
                  minWidth: '220px',
                }}
              />
            </div>

            <div className="view-toggle-btns">
              <button
                type="button"
                className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <Table size={15} />
                Table
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'chart' ? 'active' : ''}`}
                onClick={() => setViewMode('chart')}
              >
                <BarChart3 size={15} />
                Chart
              </button>
            </div>
          </div>
        )}
      </div>

      {categories.map((tab) => {
        const rows = leaderboards[tab.id] ?? [];
        const filteredRows = rows.filter(
          (entry) =>
            entry.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.method.toLowerCase().includes(searchQuery.toLowerCase())
        );
        const visibleRows = compact ? filteredRows.slice(0, 4) : filteredRows;
        const isActive = active === tab.id;

        const chartData = visibleRows.map((entry) => ({
          name: `${entry.team} (${entry.method})`,
          ate: entry.ate_rmse,
          rpe: entry.rpe_rmse,
        }));

        return (
          <div
            id={panelId(tab.id)}
            key={tab.id}
            role="tabpanel"
            aria-labelledby={tabId(tab.id)}
            hidden={!isActive}
          >
            {isActive && status === 'loading' && (
              <p className="panel-note" role="status">
                Loading live leaderboard data...
              </p>
            )}
            {isActive && status === 'error' && (
              <p className="panel-note" role="status">
                Leaderboard is currently unavailable. Please try again later.
              </p>
            )}
            {isActive && status === 'ready' && visibleRows.length === 0 && (
              <p className="panel-note">No published results matching your criteria.</p>
            )}

            {isActive && status === 'ready' && visibleRows.length > 0 && (
              <>
                {!compact && viewMode === 'chart' ? (
                  <div className="chart-container">
                    <h3 className="chart-title">ATE RMSE Comparison (Lower is Better)</h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                        <XAxis type="number" unit=" m" stroke="var(--text-secondary)" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={140}
                          tick={{ fill: 'var(--text-primary)', fontSize: 13 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg-surface)',
                            borderColor: 'var(--border-glass)',
                            borderRadius: '0.6rem',
                            color: 'var(--text-primary)',
                            boxShadow: 'var(--shadow-lg)',
                          }}
                          formatter={(value: any) => [`${value} m`, 'ATE RMSE']}
                        />
                        <Bar dataKey="ate" radius={[0, 6, 6, 0]}>
                          {chartData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 0 ? '#10b981' : index === 1 ? '#06b6d4' : '#6366f1'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Team / Method</th>
                          <th>Category</th>
                          <th>ATE RMSE</th>
                          <th>RPE RMSE</th>
                          <th>Alignment</th>
                          <th>Attempt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map((entry) => {
                          const rankClass =
                            entry.rank === 1
                              ? 'rank-badge top-1'
                              : entry.rank === 2
                              ? 'rank-badge top-2'
                              : entry.rank === 3
                              ? 'rank-badge top-3'
                              : 'rank-badge';

                          return (
                            <tr key={entry.submission_id}>
                              <td>
                                <span className={rankClass}>#{entry.rank}</span>
                              </td>
                              <td>
                                <strong>{entry.team}</strong>
                                <span>{entry.method}</span>
                              </td>
                              <td>{categoryLabel(entry.category)}</td>
                              <td>
                                <strong style={{ color: 'var(--accent-emerald)' }}>
                                  {formatRmse(entry.ate_rmse)}
                                </strong>
                              </td>
                              <td>{formatRmse(entry.rpe_rmse)}</td>
                              <td>
                                <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                                  {entry.alignment}
                                </span>
                              </td>
                              <td>#{entry.attempt_number}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="leaderboard-cards">
                  {visibleRows.map((entry) => (
                    <article
                      className="leaderboard-card"
                      data-testid={`leaderboard-card-${entry.submission_id}`}
                      key={entry.submission_id}
                    >
                      <div className="leaderboard-card-heading">
                        <strong>#{entry.rank}</strong>
                        <span>{categoryLabel(entry.category)}</span>
                      </div>
                      <strong>{entry.team}</strong>
                      <span>{entry.method}</span>
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                        ATE RMSE: {formatRmse(entry.ate_rmse)}
                      </span>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}

      {compact && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <a className="secondary-action compact-action" href="/#leaderboards">
            View full leaderboards & charts
          </a>
        </div>
      )}
    </section>
  );
};

export default Leaderboard;
