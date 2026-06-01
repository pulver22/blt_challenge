import { useMemo, useState } from 'react';
import { CheckCircle2, FileText, LoaderCircle, UploadCloud } from 'lucide-react';
import { challenge } from '../data/challengeData';
import { createDemoSubmissionResult, evaluationSteps, validateTrajectoryUpload } from '../lib/submission';

const initialForm = {
  team: '',
  method: '',
  category: 'lidar',
  format: 'tum',
  trainingRuns: '',
  link: '',
  notes: '',
  fileName: '',
};

export default function SubmissionPanel() {
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const validation = useMemo(
    () => validateTrajectoryUpload({ name: form.fileName, format: form.format }),
    [form.fileName, form.format],
  );

  const demoResult = useMemo(() => {
    if (!submitted) return null;
    return createDemoSubmissionResult(form);
  }, [form, submitted]);

  function updateField(field, value) {
    setSubmitted(false);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (validation.valid && form.team && form.method) {
      setSubmitted(true);
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
            <select value={form.format} onChange={(event) => updateField('format', event.target.value)}>
              <option value="tum">TUM trajectory text</option>
              <option value="kitti">KITTI pose text</option>
            </select>
          </label>
        </div>

        <label className="file-control">
          <FileText size={18} />
          Trajectory text file
          <input
            value={form.fileName}
            onChange={(event) => updateField('fileName', event.target.value)}
            placeholder="summer_run_odometry.txt"
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
          Run demo evaluation
        </button>
      </form>

      <aside className="evaluation-card">
        <h3>Mocked evo pipeline</h3>
        <ol>
          {evaluationSteps.map((step, index) => (
            <li key={step.id} className={submitted || index < 2 ? 'complete' : ''}>
              {submitted || index < 2 ? <CheckCircle2 size={18} /> : <LoaderCircle size={18} />}
              <span>{step.label}</span>
            </li>
          ))}
        </ol>
        {demoResult && (
          <div className="demo-result">
            <p className="eyebrow">Prototype output</p>
            <strong>{demoResult.compositeScore.toFixed(1)} composite score</strong>
            <span>
              ATE {demoResult.ateRmse.toFixed(2)} m · RPE {demoResult.rpe.toFixed(3)} · Coverage{' '}
              {demoResult.completeness.toFixed(1)}%
            </span>
            <p>This is demo data. No hidden-ground-truth scoring has been run.</p>
          </div>
        )}
      </aside>
    </section>
  );
}
