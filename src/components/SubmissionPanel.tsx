import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileText, LoaderCircle, UploadCloud } from 'lucide-react';
import { challenge } from '../data/challengeData';
import { submitTrajectory } from '../lib/api';
import { evaluationSteps, validateTrajectoryUpload } from '../lib/submission';
import { CategoryId, SubmissionForm, SubmissionResponse } from '../types';

const initialForm: SubmissionForm = {
  team: '',
  contactEmail: '',
  method: '',
  category: 'lidar',
  trainingRuns: '',
  link: '',
  notes: '',
};

export const SubmissionPanel: React.FC = () => {
  const [form, setForm] = useState<SubmissionForm>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validation = useMemo(
    () => validateTrajectoryUpload({ name: file?.name ?? '' }),
    [file]
  );

  const hasRequiredDetails = Boolean(form.team && form.method && form.contactEmail);
  const canSubmit = Boolean(file && validation.valid && hasRequiredDetails && !submitting);
  const validationMessage = file
    ? validation.message
    : 'Drag and drop or browse to select a TUM text trajectory file for live evaluation.';

  function updateField<K extends keyof SubmissionForm>(field: K, value: SubmissionForm[K]) {
    setSubmission(null);
    setError('');
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleFileSelect(selectedFile: File | null) {
    setSubmission(null);
    setError('');
    setFile(selectedFile);
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || !file) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await submitTrajectory(form, file);
      setSubmission(res);
    } catch (submissionError: any) {
      setError(submissionError.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="submit-grid" id="submit">
      <div className="section-heading">
        <p className="eyebrow">Submit Trajectory</p>
        <h2 className="gradient-title">Upload Odometry for Summer Evaluation</h2>
        <p>
          Run SLAM locally, generate TUM or KITTI trajectory text, and upload your odometry. Ground truth
          remains server-side on the Pi evaluator for strict benchmark integrity.
        </p>
      </div>

      <form className="submission-card" onSubmit={handleSubmit}>
        <div className="official-run">
          <span>{challenge.officialRun.season} Target</span>
          <strong>{challenge.officialRun.name}</strong>
          <p style={{ margin: '0.4rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {challenge.officialRun.description}
          </p>
        </div>

        <div className="form-row two">
          <label>
            Contact Email
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              placeholder="team@example.org"
              required
            />
          </label>
          <label>
            Team Name
            <input
              value={form.team}
              onChange={(e) => updateField('team', e.target.value)}
              placeholder="Lincoln Robotics"
              required
            />
          </label>
        </div>

        <div className="form-row two">
          <label>
            Method Name
            <input
              value={form.method}
              onChange={(e) => updateField('method', e.target.value)}
              placeholder="SummerGraph SLAM"
              required
            />
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => updateField('category', e.target.value as CategoryId)}
            >
              <option value="lidar">LiDAR SLAM</option>
              <option value="vision">Vision SLAM</option>
            </select>
          </label>
        </div>

        <div
          className={`dropzone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".txt,.tum,.tum.tum,text/plain"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            required
          />
          <div className="dropzone-icon">
            <UploadCloud size={28} />
          </div>
          <div>
            <strong>{file ? file.name : 'Choose a file or drag & drop here'}</strong>
            <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Accepted format: TUM trajectory text (.txt, .tum)
            </p>
          </div>
        </div>

        <p
          className={file && validation.valid ? 'validation valid' : 'validation'}
          role={file && !validation.valid ? 'alert' : 'status'}
        >
          {validationMessage}
        </p>

        <label>
          Training Runs Used
          <input
            value={form.trainingRuns}
            onChange={(e) => updateField('trainingRuns', e.target.value)}
            placeholder="Spring and autumn public BLT traverses"
          />
        </label>

        <label>
          Paper or Repository Link
          <input
            value={form.link}
            onChange={(e) => updateField('link', e.target.value)}
            placeholder="https://github.com/team/method"
          />
        </label>

        <label>
          Method Notes
          <textarea
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Short public description for the method card."
          />
        </label>

        <button
          className="primary-action"
          type="submit"
          disabled={!canSubmit}
          aria-busy={submitting}
          style={{ width: '100%', marginTop: '1.5rem' }}
        >
          <UploadCloud size={18} />
          {submitting ? 'Uploading Trajectory…' : 'Submit for Live Evaluation'}
        </button>

        {error && (
          <p className="validation" role="alert">
            {error}
          </p>
        )}

        {submission && (
          <div className="success-box" role="status" aria-label="Submission queued">
            <strong style={{ color: 'var(--accent-emerald)', fontSize: '1.1rem' }}>
              Submission Successfully Queued
            </strong>
            <span>
              Attempt #{submission.attempt_number}. Keep your private link saved to check evaluation status.
            </span>
            <a href={submission.status_url}>View Private Submission Status Page →</a>
          </div>
        )}
      </form>

      <aside className="evaluation-card">
        <h3 style={{ margin: '0 0 1.2rem', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
          Live Evaluation Pipeline
        </h3>
        <ol>
          {evaluationSteps.map((step, index) => (
            <li key={step.id} className={submission || index < 2 ? 'complete' : ''}>
              {submission || index < 2 ? <CheckCircle2 size={20} /> : <LoaderCircle size={20} />}
              <span>{step.label}</span>
            </li>
          ))}
        </ol>

        {submission && (
          <div className="demo-result">
            <p className="eyebrow">Queued on Pi Evaluator</p>
            <strong style={{ display: 'block', margin: '0.4rem 0' }}>Private Status Link Created</strong>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {submission.remaining_attempts} evaluation attempts remaining in this category.
            </span>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Evaluated results are automatically published to the leaderboard once evo completes.
            </p>
          </div>
        )}
      </aside>
    </section>
  );
};

export default SubmissionPanel;
