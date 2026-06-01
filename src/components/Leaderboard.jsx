import { useMemo, useState } from 'react';
import { categories, sampleSubmissions } from '../data/challengeData';
import { buildCombinedLeaderboard, getLeaderboardByCategory } from '../lib/scoring';

const tabs = categories;

export default function Leaderboard({ compact = false }) {
  const [active, setActive] = useState('combined');
  const rows = useMemo(() => {
    if (active === 'combined') {
      return buildCombinedLeaderboard(sampleSubmissions);
    }
    return getLeaderboardByCategory(sampleSubmissions, active);
  }, [active]);

  const visibleRows = compact ? rows.slice(0, 4) : rows;

  return (
    <section className={compact ? 'leaderboard compact-panel' : 'leaderboard page-panel'} id="leaderboards">
      <div className="section-heading">
        <p className="eyebrow">Public dashboard</p>
        <h2>{compact ? 'Current benchmark snapshot' : 'Leaderboards'}</h2>
        <p>
          Composite score is provisional. Raw evo-style metrics stay visible so teams can interpret the
          result even while the final scoring policy matures.
        </p>
      </div>

      <div className="tab-list" role="tablist" aria-label="Leaderboard category">
        {tabs.map((tab) => (
          <button
            className={active === tab.id ? 'tab active' : 'tab'}
            type="button"
            key={tab.id}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team / method</th>
              <th>Category</th>
              <th>Score</th>
              <th>ATE RMSE</th>
              <th>RPE</th>
              <th>Coverage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((entry) => (
              <tr key={entry.id}>
                <td>#{entry.rank}</td>
                <td>
                  <strong>{entry.team}</strong>
                  <span>{entry.method}</span>
                </td>
                <td>{entry.categoryLabel}</td>
                <td>{entry.compositeScore.toFixed(1)}</td>
                <td>{entry.ateRmse.toFixed(2)} m</td>
                <td>{entry.rpe.toFixed(3)}</td>
                <td>{entry.completeness.toFixed(1)}%</td>
                <td>{entry.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
