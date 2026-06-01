export const evaluationSteps = [
  { id: 'received', label: 'Upload received' },
  { id: 'validating', label: 'Validating text trajectory' },
  { id: 'running-evo', label: 'Running evo' },
  { id: 'scoring', label: 'Computing composite score' },
  { id: 'ready', label: 'Score ready' },
];

const formatMessages = {
  tum: 'TUM text trajectory ready for evo.',
  kitti: 'KITTI pose text ready for evo.',
};

export function validateTrajectoryUpload({ name, format }) {
  const hasTextExtension = typeof name === 'string' && name.toLowerCase().endsWith('.txt');
  const supportedFormat = format === 'tum' || format === 'kitti';

  if (!hasTextExtension || !supportedFormat) {
    return {
      valid: false,
      message: 'Upload a .txt trajectory in TUM or KITTI format.',
    };
  }

  return {
    valid: true,
    message: formatMessages[format],
  };
}

export function createDemoSubmissionResult({ team, method, category, format }) {
  return {
    id: `demo-${Date.now()}`,
    team,
    method,
    category,
    format,
    compositeScore: 78.6,
    ateRmse: 0.39,
    rpe: 0.074,
    completeness: 89.2,
    status: 'Demo score',
    demo: true,
    submissionDate: new Date().toISOString().slice(0, 10),
  };
}
