import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  FileSpreadsheet,
  HeartPulse,
  History,
  KeyRound,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  addBlacklist,
  createInvite,
  deleteBlacklist,
  deleteSubmission,
  disableInvite,
  fetchAdminHealth,
  fetchAdminInvites,
  fetchAdminSubmissions,
  fetchAuditLogs,
  fetchBlacklist,
  fetchSubmissionLogs,
  fetchSystemSettings,
  hideSubmission,
  publishSubmission,
  resetTeamQuota,
  retrySubmission,
  toggleBaseline,
  updateSystemSetting,
} from '../lib/api';
import { categoryLabel, formatDate, formatRmse, statusLabel } from '../lib/format';
import {
  AdminHealth,
  AdminInvite,
  AdminSubmissionItem,
  AuditEvent,
  BlacklistEntry,
  SubmissionLogDetail,
} from '../types';

const storedToken = () => window.localStorage.getItem('blt_admin_token') ?? '';

export const AdminPanel: React.FC = () => {
  const [token, setToken] = useState(storedToken);
  const [teamLabel, setTeamLabel] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [frozen, setFrozen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Quota Override Form State
  const [quotaEmail, setQuotaEmail] = useState('');
  const [quotaCategory, setQuotaCategory] = useState<'lidar' | 'vision'>('lidar');
  const [quotaAddAttempts, setQuotaAddAttempts] = useState(5);
  const [quotaMsg, setQuotaMsg] = useState('');

  // Blacklist Form State
  const [blType, setBlType] = useState<'email' | 'ip'>('email');
  const [blValue, setBlValue] = useState('');
  const [blReason, setBlReason] = useState('');

  // Log Inspector Modal State
  const [selectedLog, setSelectedLog] = useState<SubmissionLogDetail | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);

  // Audit Logs Modal State
  const [showAuditModal, setShowAuditModal] = useState(false);

  async function refresh() {
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      const [
        nextHealth,
        nextInvites,
        nextSubmissions,
        nextBlacklist,
        sysSettings,
      ] = await Promise.all([
        fetchAdminHealth(token),
        fetchAdminInvites(token),
        fetchAdminSubmissions(token),
        fetchBlacklist(token),
        fetchSystemSettings(token),
      ]);
      setHealth(nextHealth);
      setInvites(nextInvites);
      setSubmissions(nextSubmissions);
      setBlacklist(nextBlacklist);
      setFrozen(sysSettings.submissions_frozen);
      window.localStorage.setItem('blt_admin_token', token);
    } catch (adminError: any) {
      setError(adminError.message || 'Admin authentication failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggleFreeze() {
    try {
      const nextVal = (!frozen).toString();
      await updateSystemSetting(token, 'submissions_frozen', nextVal);
      setFrozen(!frozen);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleResetQuota(event: React.FormEvent) {
    event.preventDefault();
    if (!quotaEmail) return;
    setQuotaMsg('');
    try {
      const res = await resetTeamQuota(token, quotaEmail, quotaCategory, quotaAddAttempts);
      setQuotaMsg(`Quota updated for ${res.contact_email} (${res.category}): new limit ${res.new_limit} attempts.`);
      setQuotaEmail('');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAddBlacklist(event: React.FormEvent) {
    event.preventDefault();
    if (!blValue) return;
    try {
      await addBlacklist(token, blType, blValue, blReason);
      setBlValue('');
      setBlReason('');
      await refresh();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteBlacklist(id: string) {
    try {
      await deleteBlacklist(token, id);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCreateInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!teamLabel) return;
    try {
      const invite = await createInvite(token, teamLabel);
      setCreatedCode(invite.code);
      setTeamLabel('');
      await refresh();
    } catch (adminError: any) {
      setError(adminError.message);
    }
  }

  async function moderate(id: string, action: 'publish' | 'hide') {
    try {
      if (action === 'publish') await publishSubmission(token, id);
      if (action === 'hide') await hideSubmission(token, id);
      await refresh();
    } catch (adminError: any) {
      setError(adminError.message);
    }
  }

  async function handleRetry(id: string) {
    try {
      await retrySubmission(token, id);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteSubmission(id: string) {
    if (!window.confirm('Are you sure you want to permanently delete this submission and its disk files?')) return;
    try {
      await deleteSubmission(token, id);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleToggleBaseline(id: string) {
    try {
      await toggleBaseline(token, id);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleInspectLog(id: string) {
    setLoadingLog(true);
    try {
      const details = await fetchSubmissionLogs(token, id);
      setSelectedLog(details);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingLog(false);
    }
  }

  async function handleShowAuditLogs() {
    try {
      const logs = await fetchAuditLogs(token);
      setAuditLogs(logs);
      setShowAuditModal(true);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function copyCode() {
    if (!createdCode) return;
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="page-panel admin-page">
      <div className="section-heading">
        <p className="eyebrow">Administrator Portal</p>
        <h2 className="gradient-title">System Governance & Benchmark Control</h2>
        <p>Use your administrative authentication token to manage team quotas, system state, error logs, and moderation queues.</p>
      </div>

      {/* ADMIN TOOLBAR */}
      <div className="admin-toolbar" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <label style={{ minWidth: '280px' }}>
          Admin Token
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            type="password"
            placeholder="Enter X-Admin-Token"
          />
        </label>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="secondary-action" type="button" onClick={refresh} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
            {loading ? 'Authenticating...' : 'Refresh'}
          </button>

          <button
            className={`secondary-action ${frozen ? 'valid' : ''}`}
            type="button"
            onClick={handleToggleFreeze}
            style={{ color: frozen ? '#ef4444' : 'var(--text-primary)' }}
          >
            {frozen ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
            {frozen ? 'Unfreeze Submissions' : 'Freeze Submissions'}
          </button>

          <button className="secondary-action" type="button" onClick={handleShowAuditLogs}>
            <History size={18} />
            Audit Log
          </button>

          <a
            className="primary-action compact-action"
            href={`/api/admin/export/csv`}
            download="blt_benchmark_leaderboard.csv"
            style={{ textDecoration: 'none' }}
          >
            <FileSpreadsheet size={18} />
            Export Leaderboard CSV
          </a>
        </div>
      </div>

      {frozen && (
        <div className="validation" style={{ borderLeftColor: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
          <strong>Notice:</strong> Submissions are currently frozen globally. Participants will receive a 530 error if they attempt to submit.
        </div>
      )}

      {error && <p className="validation" role="alert">{error}</p>}

      {/* HEALTH & OVERRIDES GRID */}
      <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {/* HEALTH CARD */}
        <section className="submission-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 1rem', fontSize: '1.1rem' }}>
            <HeartPulse size={18} style={{ color: 'var(--accent-emerald)' }} />
            Engine Health
          </h3>
          {health ? (
            <dl className="detail-grid compact">
              <div>
                <dt>Queue Length</dt>
                <dd>{health.queue_length}</dd>
              </div>
              <div>
                <dt>Ground Truth</dt>
                <dd style={{ color: health.ground_truth_available ? 'var(--accent-emerald)' : '#ef4444' }}>
                  {health.ground_truth_available ? 'Ready' : 'Missing'}
                </dd>
              </div>
              <div>
                <dt>evo Toolchain</dt>
                <dd style={{ color: health.evo_available ? 'var(--accent-emerald)' : '#ef4444' }}>
                  {health.evo_available ? 'Available' : 'Missing'}
                </dd>
              </div>
              <div>
                <dt>Disk Bytes</dt>
                <dd>{Math.round(health.disk_bytes / 1024)} KB</dd>
              </div>
            </dl>
          ) : (
            <p className="panel-note">Enter admin token and click Refresh.</p>
          )}
        </section>

        {/* TEAM QUOTA OVERRIDE */}
        <section className="submission-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 1rem', fontSize: '1.1rem' }}>
            <RotateCcw size={18} style={{ color: 'var(--accent-emerald)' }} />
            Quota Extension Tool
          </h3>
          <form onSubmit={handleResetQuota} style={{ display: 'grid', gap: '0.6rem' }}>
            <input
              type="email"
              placeholder="Team contact email"
              value={quotaEmail}
              onChange={(e) => setQuotaEmail(e.target.value)}
              required
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={quotaCategory}
                onChange={(e) => setQuotaCategory(e.target.value as 'lidar' | 'vision')}
              >
                <option value="lidar">LiDAR SLAM</option>
                <option value="vision">Vision SLAM</option>
              </select>
              <input
                type="number"
                min="1"
                max="50"
                value={quotaAddAttempts}
                onChange={(e) => setQuotaAddAttempts(Number(e.target.value))}
                style={{ width: '90px' }}
              />
            </div>
            <button className="secondary-action compact-action" type="submit" disabled={!quotaEmail}>
              Grant +{quotaAddAttempts} Attempts
            </button>
            {quotaMsg && <p className="validation valid" style={{ fontSize: '0.82rem' }}>{quotaMsg}</p>}
          </form>
        </section>

        {/* ACCESS & BLACKLIST MANAGER */}
        <section className="submission-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 1rem', fontSize: '1.1rem' }}>
            <Ban size={18} style={{ color: '#ef4444' }} />
            Blacklist Control
          </h3>
          <form onSubmit={handleAddBlacklist} style={{ display: 'grid', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select value={blType} onChange={(e) => setBlType(e.target.value as 'email' | 'ip')}>
                <option value="email">Email</option>
                <option value="ip">IP Addr</option>
              </select>
              <input
                placeholder={blType === 'email' ? 'spammer@domain.org' : '192.168.1.100'}
                value={blValue}
                onChange={(e) => setBlValue(e.target.value)}
                required
              />
            </div>
            <input
              placeholder="Reason (optional)"
              value={blReason}
              onChange={(e) => setBlReason(e.target.value)}
            />
            <button className="secondary-action compact-action" type="submit" disabled={!blValue}>
              Block Entry
            </button>
          </form>

          <div style={{ marginTop: '0.8rem', maxHeight: '120px', overflowY: 'auto' }}>
            {blacklist.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.3rem 0.5rem',
                  fontSize: '0.8rem',
                  borderBottom: '1px solid var(--border-glass)',
                }}
              >
                <span>
                  <strong>[{entry.entry_type.toUpperCase()}]</strong> {entry.value}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteBlacklist(entry.id)}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* SUBMISSIONS QUEUE & MODERATION TABLE */}
      <section className="submission-card admin-submissions" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 1rem', fontSize: '1.15rem' }}>
          <ShieldCheck size={18} style={{ color: 'var(--accent-emerald)' }} />
          Submissions Queue & Advanced Governance
        </h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team / Method</th>
                <th>Category</th>
                <th>Status</th>
                <th>ATE RMSE</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <strong>
                      {sub.team}
                      {sub.is_baseline ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            marginLeft: '0.5rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '0.3rem',
                            background: 'var(--accent-cyan-light)',
                            color: 'var(--accent-cyan)',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                          }}
                        >
                          <Tag size={10} /> Baseline
                        </span>
                      ) : null}
                    </strong>
                    <span>{sub.method}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sub.contact_email}</span>
                  </td>
                  <td>{categoryLabel(sub.category)}</td>
                  <td>
                    <strong style={{ textTransform: 'capitalize' }}>{statusLabel(sub.status)}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sub.publication_state}</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--accent-emerald)' }}>
                      {formatRmse(sub.result?.ate_rmse)}
                    </strong>
                  </td>
                  <td>{formatDate(sub.created_at)}</td>
                  <td>
                    <div className="action-row" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        className="secondary-action compact-action"
                        type="button"
                        onClick={() => moderate(sub.id, 'publish')}
                        disabled={!sub.result || sub.publication_state === 'published'}
                      >
                        <Eye size={14} /> Publish
                      </button>
                      <button
                        className="secondary-action compact-action"
                        type="button"
                        onClick={() => moderate(sub.id, 'hide')}
                      >
                        <EyeOff size={14} /> Hide
                      </button>
                      <button
                        className="secondary-action compact-action"
                        type="button"
                        onClick={() => handleRetry(sub.id)}
                        title="Re-enqueue evaluation"
                      >
                        <RotateCcw size={14} /> Retry
                      </button>
                      <button
                        className="secondary-action compact-action"
                        type="button"
                        onClick={() => handleInspectLog(sub.id)}
                        title="Inspect evo stdout/stderr logs"
                      >
                        <FileCode2 size={14} /> Inspect
                      </button>
                      <button
                        className="secondary-action compact-action"
                        type="button"
                        onClick={() => handleToggleBaseline(sub.id)}
                        title="Toggle Official Baseline Tag"
                      >
                        <Tag size={14} />
                      </button>
                      <button
                        className="secondary-action compact-action"
                        type="button"
                        onClick={() => handleDeleteSubmission(sub.id)}
                        style={{ color: '#ef4444' }}
                        title="Delete submission permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* LOG INSPECTOR MODAL */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            className="submission-card"
            style={{
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Log Inspector: {selectedLog.submission.team} - {selectedLog.submission.method}</h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <a
                className="secondary-action compact-action"
                href={`/api/admin/submissions/${selectedLog.submission.id}/download`}
                download
              >
                <Download size={14} /> Download Uploaded Trajectory
              </a>
            </div>

            {selectedLog.failure_log ? (
              <div>
                <strong>Failure Traceback:</strong>
                <pre
                  style={{
                    background: '#000000',
                    color: '#ef4444',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    overflowX: 'auto',
                    fontSize: '0.85rem',
                  }}
                >
                  {selectedLog.failure_log}
                </pre>
              </div>
            ) : null}

            {selectedLog.submission.result ? (
              <div style={{ marginTop: '1rem' }}>
                <strong>Raw Metrics JSON:</strong>
                <pre
                  style={{
                    background: 'var(--bg-app)',
                    color: 'var(--accent-emerald)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    overflowX: 'auto',
                    fontSize: '0.85rem',
                  }}
                >
                  {JSON.stringify(selectedLog.submission.result.raw_metrics, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      {showAuditModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            className="submission-card"
            style={{
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>System Audit Trail Log</h3>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem' }}>{formatDate(log.created_at)}</td>
                      <td><strong>{log.actor}</strong></td>
                      <td>{log.action}</td>
                      <td>{log.entity_type} ({log.entity_id.slice(0, 8)})</td>
                      <td style={{ fontSize: '0.78rem' }}><code>{log.metadata_json}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminPanel;
