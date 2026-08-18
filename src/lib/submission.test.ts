import { describe, expect, it } from 'vitest';
import { evaluationSteps, validateTrajectoryUpload } from './submission';

describe('submission helpers', () => {
  it('accepts TUM text trajectory uploads', () => {
    expect(validateTrajectoryUpload({ name: 'summer_run_tum.txt' })).toEqual({
      valid: true,
      message: 'TUM text trajectory ready for live evo evaluation.',
    });
    expect(validateTrajectoryUpload({ name: 'LIO-SAM_ktima_april.tum.tum' }).valid).toBe(true);
  });

  it('rejects ROS bags, KITTI, and unsupported formats', () => {
    expect(validateTrajectoryUpload({ name: 'odometry.bag' })).toEqual({
      valid: false,
      message: 'Upload a TUM text trajectory file.',
    });

    expect(validateTrajectoryUpload({ name: 'poses.kitti' })).toEqual({
      valid: false,
      message: 'Upload a TUM text trajectory file.',
    });
  });

  it('describes the evo evaluation progression', () => {
    expect(evaluationSteps.map((step) => step.label)).toEqual([
      'Upload received',
      'Validating text trajectory',
      'Running evo',
      'Awaiting admin review',
      'Published to leaderboard',
    ]);
  });
});
