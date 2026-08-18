import { TrajectoryValidation } from '../types';

export const evaluationSteps = [
  { id: 'received', label: 'Upload received' },
  { id: 'validating', label: 'Validating text trajectory' },
  { id: 'running-evo', label: 'Running evo' },
  { id: 'pending-review', label: 'Awaiting admin review' },
  { id: 'published', label: 'Published to leaderboard' },
];

export function validateTrajectoryUpload({ name }: { name?: string }): TrajectoryValidation {
  const normalizedName = typeof name === 'string' ? name.toLowerCase() : '';
  const hasTumTextExtension = ['.txt', '.tum', '.tum.tum'].some((suffix) => normalizedName.endsWith(suffix));

  if (!hasTumTextExtension) {
    return {
      valid: false,
      message: 'Upload a TUM text trajectory file.',
    };
  }

  return {
    valid: true,
    message: 'TUM text trajectory ready for live evo evaluation.',
  };
}
