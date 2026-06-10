export function categoryLabel(category) {
  if (category === 'lidar') return 'LiDAR SLAM';
  if (category === 'vision') return 'Vision SLAM';
  return category;
}

export function statusLabel(status) {
  return status.replaceAll('_', ' ');
}

export function formatRmse(value) {
  return Number.isFinite(value) ? `${value.toFixed(3)} m` : 'Pending';
}

export function formatDate(value) {
  if (!value) return 'Pending';
  return new Date(value).toLocaleString();
}
