import { CategoryId, ChallengeMeta, LeaderboardEntry } from '../types';

export const challenge: ChallengeMeta = {
  name: 'BLT SLAM Challenge',
  datasetUrl: 'https://lcas.lincoln.ac.uk/wp/research/data-sets-software/blt/',
  publicationUrl: 'https://onlinelibrary.wiley.com/doi/pdf/10.1002/rob.22228',
  publicationTitle: 'BACCHUS long-term dataset: Agricultural mobile robotics in vineyard environments',
  paperCitation: 'Polvara et al., Journal of Field Robotics (JFR), Wiley, 2023',
  evoUrl: 'https://github.com/MichaelGrupp/evo',
  officialRun: {
    id: 'blt-summer-test',
    name: 'Official summer test run',
    season: 'Summer',
    description:
      'A difficult vineyard traversal used for leaderboard scoring. Participants run SLAM locally and upload odometry text; ground truth stays private.',
  },
  acceptedFormats: [
    { id: 'tum', label: 'TUM trajectory text', extension: '.txt' },
  ],
};

export const categories: Array<{ id: CategoryId; label: string }> = [
  { id: 'lidar', label: 'LiDAR SLAM' },
  { id: 'vision', label: 'Vision SLAM' },
  { id: 'combined', label: 'Combined' },
];

export const sampleSubmissions: LeaderboardEntry[] = [
  {
    submission_id: 'rowmapper-icp',
    rank: 1,
    team: 'RowMapper',
    method: 'ICP Rows',
    category: 'lidar',
    ate_rmse: 0.18,
    rpe_rmse: 0.041,
    alignment: 'se3',
    attempt_number: 1,
    training_runs: 'Spring and autumn public BLT traverses',
    link: 'https://example.org/rowmapper',
    notes: 'LiDAR odometry with row-structure priors and loop closure filtering.',
    published_at: '2026-05-18',
  },
  {
    submission_id: 'canopy-ndt',
    rank: 2,
    team: 'CanopyLab',
    method: 'NDT Summer',
    category: 'lidar',
    ate_rmse: 0.27,
    rpe_rmse: 0.058,
    alignment: 'se3',
    attempt_number: 1,
    training_runs: 'All public LiDAR runs',
    link: 'https://example.org/canopy-ndt',
    notes: 'NDT mapping tuned for repetitive vineyard rows.',
    published_at: '2026-05-22',
  },
  {
    submission_id: 'rgbd-vineyard',
    rank: 1,
    team: 'CropLoop',
    method: 'RGB-D Vineyard Odometry',
    category: 'vision',
    ate_rmse: 0.46,
    rpe_rmse: 0.092,
    alignment: 'sim3',
    attempt_number: 1,
    training_runs: 'Public RGB-D BLT runs',
    link: 'https://example.org/rgbd-vineyard',
    notes: 'Visual odometry with depth consistency checks for canopy texture.',
    published_at: '2026-05-20',
  },
  {
    submission_id: 'seasonal-orb',
    rank: 2,
    team: 'SeasonalSLAM',
    method: 'ORB-SLAM Vineyard Baseline',
    category: 'vision',
    ate_rmse: 0.61,
    rpe_rmse: 0.127,
    alignment: 'sim3',
    attempt_number: 2,
    training_runs: 'No training; public calibration only',
    link: 'https://example.org/seasonal-orb',
    notes: 'Classical visual SLAM baseline with relocalization disabled.',
    published_at: '2026-05-14',
  },
];
