import { LeaderboardEntry } from '../types';

const categoryLabels: Record<string, string> = {
  lidar: 'LiDAR SLAM',
  vision: 'Vision SLAM',
};

function getAteRmse(entry: any): number {
  return entry.ateRmse ?? entry.ate_rmse ?? Number.POSITIVE_INFINITY;
}

export function sortByAteRmse<T>(submissions: T[]): T[] {
  return [...submissions].sort((a, b) => getAteRmse(a) - getAteRmse(b));
}

export function withRanks<T extends Record<string, any>>(submissions: T[]): (T & { rank: number; categoryLabel: string })[] {
  return submissions.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    categoryLabel: categoryLabels[entry.category] ?? entry.category,
  }));
}

export function getLeaderboardByCategory<T extends Record<string, any>>(submissions: T[], category: string) {
  return withRanks(sortByAteRmse(submissions.filter((entry) => entry.category === category)));
}

export function buildCombinedLeaderboard<T extends Record<string, any>>(submissions: T[]) {
  return withRanks(sortByAteRmse(submissions));
}
