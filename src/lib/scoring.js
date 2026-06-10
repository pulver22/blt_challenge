const categoryLabels = {
  lidar: 'LiDAR SLAM',
  vision: 'Vision SLAM',
};

function getAteRmse(entry) {
  return entry.ateRmse ?? entry.ate_rmse ?? Number.POSITIVE_INFINITY;
}

export function sortByAteRmse(submissions) {
  return [...submissions].sort((a, b) => getAteRmse(a) - getAteRmse(b));
}

export function withRanks(submissions) {
  return submissions.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    categoryLabel: categoryLabels[entry.category] ?? entry.category,
  }));
}

export function getLeaderboardByCategory(submissions, category) {
  return withRanks(sortByAteRmse(submissions.filter((entry) => entry.category === category)));
}

export function buildCombinedLeaderboard(submissions) {
  return withRanks(sortByAteRmse(submissions));
}
