import {
  ArrowRight,
  BarChart3,
  Database,
  FileCheck2,
  GitCompareArrows,
  ShieldCheck,
} from 'lucide-react';
import AdminPanel from './components/AdminPanel.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import MetricCard from './components/MetricCard.jsx';
import SubmissionPanel from './components/SubmissionPanel.jsx';
import SubmissionStatus from './components/SubmissionStatus.jsx';
import { challenge } from './data/challengeData';

export default function App() {
  const route = getRoute();

  return (
    <>
      <SiteNav />
      <main>
        {route.type === 'admin' && <AdminPanel />}
        {route.type === 'submission' && <SubmissionStatus id={route.id} token={route.token} />}
        {route.type === 'home' && <HomePage />}
      </main>
    </>
  );
}

function HomePage() {
  return (
    <>
      <section className="hero" id="home">
        <div className="hero-copy">
          <p className="eyebrow">Agricultural robotics benchmark</p>
          <h1>SLAM on long-term vineyard traverses</h1>
          <p>
            Train on public BLT runs, run your LiDAR or vision SLAM method locally, then upload a TUM text
            trajectory for one difficult summer test run. A Raspberry Pi evaluator runs evo against private
            ground truth and publishes reviewed leaderboard entries.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href={challenge.datasetUrl} target="_blank" rel="noreferrer">
              Get dataset access
              <ArrowRight size={18} />
            </a>
            <a className="secondary-action" href="/#submit">
              Submit odometry
            </a>
          </div>
        </div>

        <div className="hero-panel" aria-label="Challenge summary">
          <div className="photo-card">
            <span>Summer test run</span>
            <strong>Live hidden-ground-truth evaluation</strong>
          </div>
          <div className="hero-metrics">
            <MetricCard label="Categories" value="2 + Combined" detail="LiDAR, vision, exploratory joined view" />
            <MetricCard label="Upload" value="TUM .txt" detail="Timestamped trajectory text only" />
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <article>
          <Database />
          <h2>1. Train on BLT</h2>
          <p>Use the public BLT runs to build and tune an agricultural SLAM pipeline.</p>
        </article>
        <article>
          <GitCompareArrows />
          <h2>2. Run locally</h2>
          <p>Generate odometry for the official summer test run using your own compute.</p>
        </article>
        <article>
          <FileCheck2 />
          <h2>3. Upload trajectory</h2>
          <p>Submit TUM text output; the Pi backend runs evo against private ground truth.</p>
        </article>
      </section>

      <Leaderboard compact />

      <section className="rules" id="dataset">
        <div className="section-heading">
          <p className="eyebrow">Dataset & rules</p>
          <h2>One official summer run, private ground truth</h2>
          <p>
            The beta keeps participation simple: public data for training and local SLAM runs, a single official
            summer evaluation target, and private ground truth used only by the evaluator.
          </p>
        </div>
        <div className="rules-grid">
          <article>
            <ShieldCheck />
            <h3>Ground truth is withheld</h3>
            <p>
              Participants upload odometry, not source code. The service compares trajectory text with unreleased
              ground truth using evo.
            </p>
          </article>
          <article>
            <BarChart3 />
            <h3>ATE RMSE ranks entries</h3>
            <p>
              Lower ATE RMSE ranks category leaderboards. RPE and alignment policy remain visible for research
              interpretation.
            </p>
          </article>
          <article>
            <FileCheck2 />
            <h3>Text trajectories only</h3>
            <p>
              Uploads are limited to TUM trajectory text. Timestamped poses keep the evaluator close to direct evo
              command-line usage.
            </p>
          </article>
        </div>
      </section>

      <SubmissionPanel />
      <Leaderboard />

      <footer>
        <p>
          Prototype for the BLT dataset challenge. Dataset link:{' '}
          <a href={challenge.datasetUrl} target="_blank" rel="noreferrer">
            LCAS BLT
          </a>
          . Evaluation concept based on{' '}
          <a href={challenge.evoUrl} target="_blank" rel="noreferrer">
            evo
          </a>
          .
        </p>
      </footer>
    </>
  );
}

function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Main navigation">
      <a className="brand" href="/#home">
        <span>BLT</span>
        SLAM Challenge
      </a>
      <div>
        <a href="/#dataset">Dataset & Rules</a>
        <a href="/#submit">Submit</a>
        <a href="/#leaderboards">Leaderboards</a>
        <a href="/admin">Admin</a>
      </div>
    </nav>
  );
}

function getRoute() {
  const { pathname, search } = window.location;
  if (pathname === '/admin') {
    return { type: 'admin' };
  }
  const submissionMatch = pathname.match(/^\/submissions\/([^/]+)$/);
  if (submissionMatch) {
    return {
      type: 'submission',
      id: submissionMatch[1],
      token: new URLSearchParams(search).get('token') ?? '',
    };
  }
  return { type: 'home' };
}
