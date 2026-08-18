import React from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Database,
  ExternalLink,
  FileCheck2,
  FileText,
  GitCompareArrows,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Leaderboard from '../components/Leaderboard';
import MetricCard from '../components/MetricCard';
import SubmissionPanel from '../components/SubmissionPanel';
import { challenge } from '../data/challengeData';

import figure7 from '../assets/figure_7-min.png';
import figure8 from '../assets/figure_8-min.webp';
import figure9 from '../assets/figure_9-min.png';
import figure10 from '../assets/figure_10-min.webp';

const vineyardSeasons = [
  { month: 'March', src: figure7 },
  { month: 'April', src: figure8 },
  { month: 'May', src: figure9 },
  { month: 'June', src: figure10 },
];

export const HomePage: React.FC = () => {
  return (
    <>
      <section className="hero" id="home">
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkles size={16} /> Agricultural Robotics Benchmark
          </p>
          <h1 className="gradient-title">SLAM on Long-Term Vineyard Traverses</h1>
          <p>
            Benchmark your LiDAR and vision SLAM algorithms on the official <strong>BACCHUS Long-Term (BLT)</strong> dataset. Train on multi-season public traverses, run odometry locally, and upload TUM text trajectories for automated server-side evaluation.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href={challenge.datasetUrl} target="_blank" rel="noreferrer">
              Get Dataset Access
              <ArrowRight size={18} />
            </a>
            <a className="secondary-action" href="#submit">
              Submit Odometry
            </a>
            <a className="secondary-action" href={challenge.publicationUrl} target="_blank" rel="noreferrer">
              <FileText size={18} />
              Read Journal Paper (PDF)
            </a>
          </div>
        </div>

        <div className="hero-panel" aria-label="Challenge summary">
          <div className="seasonal-card" role="group" aria-label="Vineyard seasonal progression">
            <div className="seasonal-mosaic">
              {vineyardSeasons.map(({ month, src }) => (
                <figure className="seasonal-frame" key={month}>
                  <img src={src} alt={`Vineyard in ${month}`} />
                  <figcaption>
                    <span>{month}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="seasonal-caption">
              <strong>One Vineyard, Four Growth Seasons</strong>
            </div>
          </div>
          <div className="hero-metrics">
            <MetricCard label="Categories" value="2 + Combined" detail="LiDAR, Vision, Joined Exploratory View" />
            <MetricCard label="Format" value="TUM .txt" detail="Timestamped 3D Poses Only" />
          </div>
        </div>
      </section>

      {/* BACCHUS DATASET & PUBLICATION INFORMATION */}
      <section className="page-panel" style={{ marginTop: '2rem' }} id="bacchus-dataset">
        <div className="submission-card" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
            <BookOpen size={22} style={{ color: 'var(--accent-emerald)' }} />
            <p className="eyebrow" style={{ margin: 0 }}>Dataset & Publication</p>
          </div>
          <h2 className="gradient-title" style={{ fontSize: '1.6rem', margin: '0 0 0.8rem' }}>
            BACCHUS Long-Term (BLT) Vineyard Dataset
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1rem', margin: '0 0 1.2rem' }}>
            The BLT dataset captures long-term agricultural robotics operations in complex vineyard environments across varying seasonal foliage growth, illumination, and weather conditions.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="official-run" style={{ background: 'var(--bg-surface)' }}>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Official Publication</strong>
              <p style={{ margin: '0.4rem 0 0.8rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <em>{challenge.publicationTitle}</em>
              </p>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.8rem' }}>
                {challenge.paperCitation}
              </span>
              <a
                className="secondary-action compact-action"
                href={challenge.publicationUrl}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <FileText size={15} /> Download Wiley PDF
                <ExternalLink size={14} />
              </a>
            </div>

            <div className="official-run" style={{ background: 'var(--bg-surface)' }}>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>LCAS Dataset Host Page</strong>
              <p style={{ margin: '0.4rem 0 0.8rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Access full multi-modal sensor sequences (LiDAR point clouds, stereo vision, wheel odometry, GPS ground truth).
              </p>
              <a
                className="primary-action compact-action"
                href={challenge.datasetUrl}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Database size={15} /> Visit LCAS Dataset Portal
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <article>
          <Database size={28} />
          <h2>1. Train on BLT</h2>
          <p>Utilize public spring and autumn BLT traverses to build and tune robust agricultural SLAM pipelines.</p>
        </article>
        <article>
          <GitCompareArrows size={28} />
          <h2>2. Run Locally</h2>
          <p>Generate timestamped odometry trajectories for the official summer test run using your local compute.</p>
        </article>
        <article>
          <FileCheck2 size={28} />
          <h2>3. Upload & Benchmark</h2>
          <p>Submit TUM trajectory text. The server-side evaluator runs evo against unreleased ground truth.</p>
        </article>
      </section>

      <Leaderboard compact />

      <section className="rules" id="dataset">
        <div className="section-heading">
          <p className="eyebrow">Dataset & Rules</p>
          <h2 className="gradient-title">Official Summer Run & Private Ground Truth</h2>
          <p>
            The challenge preserves fairness by keeping evaluation ground truth server-side, enabling participants to benchmark odometry algorithms without exposing raw trajectory references.
          </p>
        </div>
        <div className="rules-grid">
          <article>
            <ShieldCheck size={28} />
            <h3>Ground Truth Withheld</h3>
            <p>
              Upload trajectory text files only. The automated backend evaluates poses against withheld ground truth using evo.
            </p>
          </article>
          <article>
            <BarChart3 size={28} />
            <h3>ATE RMSE Ranking</h3>
            <p>
              Lower Absolute Trajectory Error (ATE RMSE) determines category rankings. Relative Pose Error (RPE) and alignment details remain transparent.
            </p>
          </article>
          <article>
            <FileCheck2 size={28} />
            <h3>Standard TUM Text</h3>
            <p>
              Uploads are strictly TUM format text files. Standardized timestamped poses ensure direct compatibility with evo benchmarking CLI.
            </p>
          </article>
        </div>
      </section>

      <SubmissionPanel />

      <Leaderboard />

      <footer>
        <p>
          BLT SLAM Benchmark Challenge. Official dataset hosted at{' '}
          <a href={challenge.datasetUrl} target="_blank" rel="noreferrer">
            LCAS BLT Portal
          </a>
          . Publication details in{' '}
          <a href={challenge.publicationUrl} target="_blank" rel="noreferrer">
            Journal of Field Robotics (Wiley)
          </a>
          . Evaluation standard powered by{' '}
          <a href={challenge.evoUrl} target="_blank" rel="noreferrer">
            evo Python Package
          </a>
          .
        </p>
      </footer>
    </>
  );
};

export default HomePage;
