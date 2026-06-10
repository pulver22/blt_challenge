import { useMemo, useState } from 'react';
import { CheckCircle2, FileText, LoaderCircle, UploadCloud } from 'lucide-react';
import { challenge } from '../data/challengeData';
import { submitTrajectory } from '../lib/api';
import { evaluationSteps, validateTrajectoryUpload } from '../lib/submission';

const initialForm = {
  inviteCode: '',
  team: '',
  contactEmail: '',
  method: '',
  category: 'lidar',
  trainingRuns: '',
  link: '',
  notes: '',
};

export default function SubmissionPanel() {
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validation = useMemo(
    () => validateTrajectoryUpload({ name: file?.name ?? '' }),
    [file],
  );

  function updateField(field, value) {
    setSubmission(null);
    setError('');
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || !validation.valid || !form.team || !form.method || !form.inviteCode || !form.contactEmail) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      setSubmission(await submitTrajectory(form, file));
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="submit-grid" id="submit">
      <div className="section-heading">
        <p className="eyebrow">Submit odometry</p>
        <h2>Upload a text trajectory for the official summer run</h2>
        <p>
          This prototype models the future evaluator: participants run SLAM locally, upload TUM or KITTI
          text odometry, and the hidden ground truth stays server-side.
        </p>
      </div>

      <form className="submission-card" onSubmit={handleSubmit}>
        <div className="official-run">
          <span>{challenge.officialRun.season}</span>
          <strong>{challenge.officialRun.name}</strong>
          <p>{challenge.officialRun.description}</p>
        </div>

        <div className="form-row two">
          <label>
            Invite code
            <input
              value={form.inviteCode}
              onChange={(event) => updateField('inviteCode', event.target.value)}
              placeholder="BLT-ABCD-EF12-3456"
              required
            />
          </label>
          <label>
            Contact email
            <input
              type="email"
              value={form.contactEmail}
              onChange={(event) => updateField('contactEmail', event.target.value)}
              placeholder="team@example.org"
              required
            />
          </label>
        </div>

        <div className="form-row two">
          <label>
            Team name
            <input
              value={form.team}
              onChange={(event) => updateField('team', event.target.value)}
              placeholder="Lincoln Robotics"
              required
            />
          </label>
          <label>
            Method name
            <input
              value={form.method}
              onChange={(event) => updateField('method', event.target.value)}
              placeholder="SummerGraph SLAM"
              required
            />
          </label>
        </div>

        <div className="form-row two">
          <label>
            Category
            <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
              <option value="lidar">LiDAR SLAM</option>
              <option value="vision">Vision SLAM</option>
            </select>
          </label>
          <label>
            Trajectory format
            <select value="tum" disabled>
              <option value="tum">TUM trajectory text</option>
            </select>
          </label>
        </div>

        <label className="file-control">
          <FileText size={18} />
          Trajectory text file
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={(event) => {
              setSubmission(null);
              setError('');
              setFile(event.target.files?.[0] ?? null);
            }}
            required
          />
        </label>
        <p className={validation.valid ? 'validation valid' : 'validation'}>{validation.message}</p>

        <label>
          Training runs used
          <input
            value={form.trainingRuns}
            onChange={(event) => updateField('trainingRuns', event.target.value)}
            placeholder="Spring and autumn public BLT traverses"
          />
        </label>

        <label>
          Paper or repository link
          <input
            value={form.link}
            onChange={(event) => updateField('link', event.target.value)}
            placeholder="https://github.com/team/method"
          />
        </label>

        <label>
          Method notes
          <textarea
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            placeholder="Short public description for the method card."
          />
        </label>

        <button className="primary-action" type="submit">
          <UploadCloud size={18} />
          {submitting ? 'Uploading...' : 'Submit for live evaluation'}
        </button>
        {error && <p className="validation">{error}</p>}
        {submission && (
          <div className="success-box">
            <strong>Submission queued</strong>
            <span>Attempt #{submission.attempt_number}. Keep this private status link.</span>
            <a href={submission.status_url}>View submission status</a>
          </div>
        )}
      </form>

      <aside className="evaluation-card">
        <h3>Live evo pipeline</h3>
        <ol>
          {evaluationSteps.map((step, index) => (
            <li key={step.id} className={submission || index < 2 ? 'complete' : ''}>
              {submission || index < 2 ? <CheckCircle2 size={18} /> : <LoaderCircle size={18} />}
              <span>{step.label}</span>
            </li>
          ))}
        </ol>
        {submission && (
          <div className="demo-result">
            <p className="eyebrow">Queued on Pi</p>
            <strong>Private status page created</strong>
            <span>{submission.remaining_attempts} attempts remain in this category.</span>
            <p>Results stay private until admin review publishes the leaderboard row.</p>
          </div>
        )}
      </aside>
    </section>
  );
}
