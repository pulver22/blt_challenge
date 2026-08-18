export function categoryLabel(category: string): string {
  if (category === 'lidar') return 'LiDAR SLAM';
  if (category === 'vision') return 'Vision SLAM';
  return category;
}

export function statusLabel(status: string): string {
  if (!status) return 'Unknown';
  return status.replaceAll('_', ' ');
}

export function formatRmse(value: number | undefined | null): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(3)} m` : 'Pending';
}

export function formatDate(value: string | undefined | null): string {
  if (!value) return 'Pending';
  return new Date(value).toLocaleString();
}
