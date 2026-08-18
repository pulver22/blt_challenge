import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileWarning, RefreshCw } from 'lucide-react';
import { fetchSubmission } from '../lib/api';
import { categoryLabel, formatDate, formatRmse, statusLabel } from '../lib/format';
import { SubmissionStatusDetail } from '../types';

interface SubmissionStatusProps {
  id: string;
  token: string;
}

export const SubmissionStatus: React.FC<SubmissionStatusProps> = ({ id, token }) => {
  const [submission, setSubmission] = useState<SubmissionStatusDetail | null>(null);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadStatus() {
    if (!id || !token) {
      setError('Missing private submission token.');
      return;
    }
    setIsRefreshing(true);
    try {
      const data = await fetchSubmission(id, token);
      setSubmission(data);
      setError('');
    } catch (statusError: any) {
      setError(statusError.message || 'Failed to load submission details.');
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadStatus();

    // Auto-poll every 3 seconds if status is queued or evaluating
    const interval = setInterval(() => {
      if (submission?.status === 'queued' || submission?.status === 'evaluating') {
        loadStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, token, submission?.status]);

  const icon = useMemo(() => {
    if (submission?.status === 'failed_evo') return <FileWarning size={24} style={{ color: '#ef4444' }} />;
    if (submission?.status === 'published' || submission?.publication_state === 'published') {
      return <CheckCircle2 size={24} style={{ color: 'var(--accent-emerald)' }} />;
    }
    return <Clock3 size={24} style={{ color: '#f59e0b' }} />;
  }, [submission]);

  return (
    <section className="page-panel status-page">
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p className="eyebrow">Private Result Page</p>
          <h2 className="gradient-title">Submission Status</h2>
          <p>This private status page displays evaluator progress and benchmark metrics prior to publication.</p>
        </div>
        <button
          type="button"
          className="secondary-action compact-action"
          onClick={loadStatus}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <p className="validation" role="alert">{error}</p>}
      {!submission && !error && <p className="panel-note">Loading submission status...</p>}

      {submission && (
        <div className="submission-card status-card">
          <div className="status-heading">
            {icon}
            <div>
              <strong style={{ fontSize: '1.2rem', textTransform: 'capitalize' }}>
                {statusLabel(submission.status)}
              </strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Publication State: {submission.publication_state}
              </span>
            </div>
          </div>

          <dl className="detail-grid">
            <div>
              <dt>Team</dt>
              <dd>{submission.team}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>{submission.method}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{categoryLabel(submission.category)}</dd>
            </div>
            <div>
              <dt>Attempt</dt>
              <dd>#{submission.attempt_number}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDate(submission.updated_at)}</dd>
            </div>
          </dl>

          {submission.result ? (
            <div className="result-grid" style={{ marginTop: '1rem' }}>
              <div className="metric-card">
                <span>ATE RMSE</span>
                <strong style={{ color: 'var(--accent-emerald)' }}>
                  {formatRmse(submission.result.ate_rmse)}
                </strong>
              </div>
              <div className="metric-card">
                <span>RPE RMSE</span>
                <strong>{formatRmse(submission.result.rpe_rmse)}</strong>
              </div>
              <div className="metric-card">
                <span>Alignment</span>
                <strong style={{ textTransform: 'uppercase' }}>{submission.result.alignment}</strong>
              </div>
            </div>
          ) : (
            <div className="demo-result" style={{ marginTop: '1rem' }}>
              <p className="eyebrow">Evaluator in Progress</p>
              <strong>Running evo against hidden ground truth...</strong>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem' }}>
                Metrics will populate automatically once evaluation finishes. Page auto-polls every 3 seconds.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default SubmissionStatus;
