import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileWarning } from 'lucide-react';
import { fetchSubmission } from '../lib/api';
import { categoryLabel, formatDate, formatRmse, statusLabel } from '../lib/format';

export default function SubmissionStatus({ id, token }) {
  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !token) {
      setError('Missing private submission token.');
      return;
    }
    fetchSubmission(id, token)
      .then(setSubmission)
      .catch((statusError) => setError(statusError.message));
  }, [id, token]);

  const icon = useMemo(() => {
    if (submission?.status === 'failed_evo') return <FileWarning size={22} />;
    if (submission?.status === 'published' || submission?.publication_state === 'published') {
      return <CheckCircle2 size={22} />;
    }
    return <Clock3 size={22} />;
  }, [submission]);

  return (
    <section className="page-panel status-page">
      <div className="section-heading">
        <p className="eyebrow">Private result</p>
        <h2>Submission status</h2>
        <p>This private page shows evaluator progress and metrics before admin publication.</p>
      </div>

      {error && <p className="validation">{error}</p>}
      {!submission && !error && <p className="panel-note">Loading submission...</p>}
      {submission && (
        <div className="status-card">
          <div className="status-heading">
            {icon}
            <div>
              <strong>{statusLabel(submission.status)}</strong>
              <span>{submission.publication_state}</span>
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
            <div className="result-grid">
              <Metric label="ATE RMSE" value={formatRmse(submission.result.ate_rmse)} />
              <Metric label="RPE RMSE" value={formatRmse(submission.result.rpe_rmse)} />
              <Metric label="Alignment" value={submission.result.alignment.toUpperCase()} />
            </div>
          ) : (
            <p className="panel-note">Metrics will appear after evo finishes.</p>
          )}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
