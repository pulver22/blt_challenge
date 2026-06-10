import { useEffect, useState } from 'react';
import { EyeOff, HeartPulse, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  createInvite,
  disableInvite,
  fetchAdminHealth,
  fetchAdminInvites,
  fetchAdminSubmissions,
  hideSubmission,
  publishSubmission,
} from '../lib/api';
import { categoryLabel, formatDate, formatRmse, statusLabel } from '../lib/format';

const storedToken = () => window.localStorage.getItem('blt_admin_token') ?? '';

export default function AdminPanel() {
  const [token, setToken] = useState(storedToken);
  const [teamLabel, setTeamLabel] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [health, setHealth] = useState(null);
  const [invites, setInvites] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState('');

  async function refresh() {
    if (!token) return;
    setError('');
    try {
      const [nextHealth, nextInvites, nextSubmissions] = await Promise.all([
        fetchAdminHealth(token),
        fetchAdminInvites(token),
        fetchAdminSubmissions(token),
      ]);
      setHealth(nextHealth);
      setInvites(nextInvites);
      setSubmissions(nextSubmissions);
      window.localStorage.setItem('blt_admin_token', token);
    } catch (adminError) {
      setError(adminError.message);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateInvite(event) {
    event.preventDefault();
    if (!teamLabel) return;
    try {
      const invite = await createInvite(token, teamLabel);
      setCreatedCode(invite.code);
      setTeamLabel('');
      await refresh();
    } catch (adminError) {
      setError(adminError.message);
    }
  }

  async function moderate(id, action) {
    try {
      if (action === 'publish') await publishSubmission(token, id);
      if (action === 'hide') await hideSubmission(token, id);
      await refresh();
    } catch (adminError) {
      setError(adminError.message);
    }
  }

  async function disable(id) {
    try {
      await disableInvite(token, id);
      await refresh();
    } catch (adminError) {
      setError(adminError.message);
    }
  }

  return (
    <section className="page-panel admin-page">
      <div className="section-heading">
        <p className="eyebrow">Admin</p>
        <h2>Review queue and invite codes</h2>
        <p>Use the admin token from the Pi environment to publish results after evo completes.</p>
      </div>

      <div className="admin-toolbar">
        <label>
          Admin token
          <input value={token} onChange={(event) => setToken(event.target.value)} type="password" />
        </label>
        <button className="secondary-action" type="button" onClick={refresh}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>
      {error && <p className="validation">{error}</p>}

      <div className="admin-grid">
        <section className="submission-card">
          <h3>
            <KeyRound size={18} />
            Invite codes
          </h3>
          <form onSubmit={handleCreateInvite} className="inline-form">
            <input
              value={teamLabel}
              onChange={(event) => setTeamLabel(event.target.value)}
              placeholder="Team label"
            />
            <button className="primary-action" type="submit">
              Create
            </button>
          </form>
          {createdCode && (
            <div className="success-box">
              <strong>New invite code</strong>
              <code>{createdCode}</code>
              <span>Store it now; only the hash is retained server-side.</span>
            </div>
          )}
          <div className="stack-list">
            {invites.map((invite) => (
              <div className="admin-row" key={invite.id}>
                <span>
                  <strong>{invite.team_label}</strong>
                  {invite.active ? 'Active' : 'Disabled'}
                </span>
                {invite.active ? (
                  <button className="secondary-action compact-action" type="button" onClick={() => disable(invite.id)}>
                    Disable
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="submission-card">
          <h3>
            <HeartPulse size={18} />
            Health
          </h3>
          {health ? (
            <dl className="detail-grid compact">
              <div>
                <dt>Queue</dt>
                <dd>{health.queue_length}</dd>
              </div>
              <div>
                <dt>Ground truth</dt>
                <dd>{health.ground_truth_available ? 'Ready' : 'Missing'}</dd>
              </div>
              <div>
                <dt>evo</dt>
                <dd>{health.evo_available ? 'Available' : 'Missing'}</dd>
              </div>
              <div>
                <dt>Data size</dt>
                <dd>{Math.round(health.disk_bytes / 1024)} KB</dd>
              </div>
            </dl>
          ) : (
            <p className="panel-note">Enter the admin token and refresh.</p>
          )}
        </section>
      </div>

      <section className="submission-card admin-submissions">
        <h3>
          <ShieldCheck size={18} />
          Submissions
        </h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team / method</th>
                <th>Category</th>
                <th>Status</th>
                <th>ATE</th>
                <th>Submitted</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td>
                    <strong>{submission.team}</strong>
                    <span>{submission.method}</span>
                    <span>{submission.contact_email}</span>
                  </td>
                  <td>{categoryLabel(submission.category)}</td>
                  <td>
                    {statusLabel(submission.status)}
                    <span>{submission.publication_state}</span>
                  </td>
                  <td>{formatRmse(submission.result?.ate_rmse)}</td>
                  <td>{formatDate(submission.created_at)}</td>
                  <td>
                    <div className="action-row">
                      <button
                        className="secondary-action compact-action"
                        type="button"
                        onClick={() => moderate(submission.id, 'publish')}
                        disabled={!submission.result}
                      >
                        Publish
                      </button>
                      <button
                        className="secondary-action compact-action"
                        type="button"
                        onClick={() => moderate(submission.id, 'hide')}
                      >
                        <EyeOff size={16} />
                        Hide
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
