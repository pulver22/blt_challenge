import { describe, expect, it } from 'vitest';
import {
  buildCombinedLeaderboard,
  getLeaderboardByCategory,
  sortByAteRmse,
} from './scoring';

const submissions = [
  {
    id: 'vision-baseline',
    category: 'vision',
    team: 'CropLoop',
    method: 'RGB-D Vineyard Odometry',
    ateRmse: 0.46,
  },
  {
    id: 'lidar-best',
    category: 'lidar',
    team: 'RowMapper',
    method: 'ICP Rows',
    ateRmse: 0.18,
  },
  {
    id: 'lidar-second',
    category: 'lidar',
    team: 'CanopyLab',
    method: 'NDT Summer',
    ateRmse: 0.27,
  },
];

describe('leaderboard scoring helpers', () => {
  it('sorts submissions by ATE RMSE in ascending order', () => {
    expect(sortByAteRmse(submissions).map((entry) => entry.id)).toEqual([
      'lidar-best',
      'lidar-second',
      'vision-baseline',
    ]);
  });

  it('filters and ranks a category leaderboard', () => {
    expect(getLeaderboardByCategory(submissions, 'lidar')).toEqual([
      expect.objectContaining({ id: 'lidar-best', rank: 1 }),
      expect.objectContaining({ id: 'lidar-second', rank: 2 }),
    ]);
  });

  it('builds a combined leaderboard across LiDAR and vision submissions', () => {
    const combined = buildCombinedLeaderboard(submissions);

    expect(combined).toHaveLength(3);
    expect(combined[0]).toMatchObject({
      id: 'lidar-best',
      rank: 1,
      categoryLabel: 'LiDAR SLAM',
    });
    expect(combined[2]).toMatchObject({
      id: 'vision-baseline',
      rank: 3,
      categoryLabel: 'Vision SLAM',
    });
  });
});
