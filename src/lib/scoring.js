const categoryLabels = {
  lidar: 'LiDAR SLAM',
  vision: 'Vision SLAM',
};

export function sortByCompositeScore(submissions) {
  return [...submissions].sort((a, b) => b.compositeScore - a.compositeScore);
}

export function withRanks(submissions) {
  return submissions.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    categoryLabel: categoryLabels[entry.category] ?? entry.category,
  }));
}

export function getLeaderboardByCategory(submissions, category) {
  return withRanks(sortByCompositeScore(submissions.filter((entry) => entry.category === category)));
}

export function buildCombinedLeaderboard(submissions) {
  return withRanks(sortByCompositeScore(submissions));
}
