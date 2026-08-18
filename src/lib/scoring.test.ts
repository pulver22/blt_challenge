import { describe, expect, it } from 'vitest';
import {
  buildCombinedLeaderboard,
  getLeaderboardByCategory,
  sortByAteRmse,
} from './scoring';
import { LeaderboardEntry } from '../types';

const submissions: LeaderboardEntry[] = [
  {
    submission_id: 'vision-baseline',
    category: 'vision',
    team: 'CropLoop',
    method: 'RGB-D Vineyard Odometry',
    ate_rmse: 0.46,
    rpe_rmse: 0.09,
    alignment: 'sim3',
    rank: 1,
    attempt_number: 1,
  },
  {
    submission_id: 'lidar-best',
    category: 'lidar',
    team: 'RowMapper',
    method: 'ICP Rows',
    ate_rmse: 0.18,
    rpe_rmse: 0.04,
    alignment: 'se3',
    rank: 1,
    attempt_number: 1,
  },
  {
    submission_id: 'lidar-second',
    category: 'lidar',
    team: 'CanopyLab',
    method: 'NDT Summer',
    ate_rmse: 0.27,
    rpe_rmse: 0.05,
    alignment: 'se3',
    rank: 2,
    attempt_number: 1,
  },
];

describe('leaderboard scoring helpers', () => {
  it('sorts submissions by ATE RMSE in ascending order', () => {
    expect(sortByAteRmse(submissions).map((entry) => entry.submission_id)).toEqual([
      'lidar-best',
      'lidar-second',
      'vision-baseline',
    ]);
  });

  it('filters and ranks a category leaderboard', () => {
    expect(getLeaderboardByCategory(submissions, 'lidar')).toEqual([
      expect.objectContaining({ submission_id: 'lidar-best', rank: 1 }),
      expect.objectContaining({ submission_id: 'lidar-second', rank: 2 }),
    ]);
  });

  it('builds a combined leaderboard across LiDAR and vision submissions', () => {
    const combined = buildCombinedLeaderboard(submissions);

    expect(combined).toHaveLength(3);
    expect(combined[0]).toMatchObject({
      submission_id: 'lidar-best',
      rank: 1,
    });
    expect(combined[2]).toMatchObject({
      submission_id: 'vision-baseline',
      rank: 3,
    });
  });
});
