export const evaluationSteps = [
  { id: 'received', label: 'Upload received' },
  { id: 'validating', label: 'Validating text trajectory' },
  { id: 'running-evo', label: 'Running evo' },
  { id: 'pending-review', label: 'Awaiting admin review' },
  { id: 'published', label: 'Published to leaderboard' },
];

export function validateTrajectoryUpload({ name }) {
  const hasTextExtension = typeof name === 'string' && name.toLowerCase().endsWith('.txt');

  if (!hasTextExtension) {
    return {
      valid: false,
      message: 'Upload a TUM .txt trajectory file.',
    };
  }

  return {
    valid: true,
    message: 'TUM text trajectory ready for live evo evaluation.',
  };
}
