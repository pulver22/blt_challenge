import {
  ArrowRight,
  BarChart3,
  Database,
  FileCheck2,
  GitCompareArrows,
  ShieldCheck,
} from 'lucide-react';
import Leaderboard from './components/Leaderboard.jsx';
import MetricCard from './components/MetricCard.jsx';
import SubmissionPanel from './components/SubmissionPanel.jsx';
import { challenge } from './data/challengeData';

export default function App() {
  return (
    <main>
      <nav className="site-nav" aria-label="Main navigation">
        <a className="brand" href="#home">
          <span>BLT</span>
          SLAM Challenge
        </a>
        <div>
          <a href="#dataset">Dataset & Rules</a>
          <a href="#submit">Submit</a>
          <a href="#leaderboards">Leaderboards</a>
        </div>
      </nav>

      <section className="hero" id="home">
        <div className="hero-copy">
          <p className="eyebrow">Agricultural robotics benchmark</p>
          <h1>SLAM on long-term vineyard traverses</h1>
          <p>
            Train on public BLT runs, run your LiDAR or vision SLAM method locally, then upload a text
            trajectory for one difficult summer test run. The site scores against private ground truth and
            publishes a public leaderboard.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href={challenge.datasetUrl} target="_blank" rel="noreferrer">
              Get dataset access
              <ArrowRight size={18} />
            </a>
            <a className="secondary-action" href="#submit">
              Submit odometry
            </a>
          </div>
        </div>

        <div className="hero-panel" aria-label="Challenge summary">
          <div className="photo-card">
            <span>Summer test run</span>
            <strong>Hidden ground truth evaluation</strong>
          </div>
          <div className="hero-metrics">
            <MetricCard label="Categories" value="2 + Combined" detail="LiDAR, vision, joined ranking" />
            <MetricCard label="Upload" value="TUM / KITTI" detail="Text trajectory files only" />
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
          <p>Submit TUM or KITTI text output; the future backend runs evo against private ground truth.</p>
        </article>
      </section>

      <Leaderboard compact />

      <section className="rules" id="dataset">
        <div className="section-heading">
          <p className="eyebrow">Dataset & rules</p>
          <h2>One official summer run, private ground truth</h2>
          <p>
            The prototype keeps participation simple: public data for training and local SLAM runs, a single
            official summer evaluation target, and private ground truth used only by the evaluator.
          </p>
        </div>
        <div className="rules-grid">
          <article>
            <ShieldCheck />
            <h3>Ground truth is withheld</h3>
            <p>
              Participants upload odometry, not source code. The future service compares trajectory text with
              unreleased ground truth using evo.
            </p>
          </article>
          <article>
            <BarChart3 />
            <h3>Composite score is provisional</h3>
            <p>
              Rankings combine evo-style ATE/RPE metrics with coverage and failure penalties. Raw metrics remain
              visible for research interpretation.
            </p>
          </article>
          <article>
            <FileCheck2 />
            <h3>Text trajectories only</h3>
            <p>
              Uploads are limited to TUM trajectory text or KITTI pose text. This keeps the future evaluator close
              to direct evo command-line usage.
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
    </main>
  );
}
