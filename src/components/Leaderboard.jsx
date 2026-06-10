import { useEffect, useMemo, useState } from 'react';
import { categories } from '../data/challengeData';
import { fetchLeaderboards } from '../lib/api';
import { categoryLabel, formatRmse } from '../lib/format';

const tabs = categories;

export default function Leaderboard({ compact = false }) {
  const [active, setActive] = useState('combined');
  const [leaderboards, setLeaderboards] = useState({ lidar: [], vision: [], combined: [] });
  const [status, setStatus] = useState('loading');

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

  const rows = useMemo(() => leaderboards[active] ?? [], [active, leaderboards]);

  const visibleRows = compact ? rows.slice(0, 4) : rows;

  return (
    <section className={compact ? 'leaderboard compact-panel' : 'leaderboard page-panel'} id="leaderboards">
      <div className="section-heading">
        <p className="eyebrow">Public dashboard</p>
        <h2>{compact ? 'Current benchmark snapshot' : 'Leaderboards'}</h2>
        <p>
          Official category rankings use lower ATE RMSE. The Combined view is exploratory because LiDAR and
          Vision use different alignment policies.
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

      {status === 'loading' && <p className="panel-note">Loading live leaderboard...</p>}
      {status === 'error' && <p className="panel-note">Leaderboard API is not available yet.</p>}
      {status === 'ready' && visibleRows.length === 0 && <p className="panel-note">No published results yet.</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team / method</th>
              <th>Category</th>
              <th>ATE RMSE</th>
              <th>RPE</th>
              <th>Alignment</th>
              <th>Attempt</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((entry) => (
              <tr key={entry.submission_id}>
                <td>#{entry.rank}</td>
                <td>
                  <strong>{entry.team}</strong>
                  <span>{entry.method}</span>
                </td>
                <td>{categoryLabel(entry.category)}</td>
                <td>{formatRmse(entry.ate_rmse)}</td>
                <td>{formatRmse(entry.rpe_rmse)}</td>
                <td>{entry.alignment?.toUpperCase()}</td>
                <td>#{entry.attempt_number}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
