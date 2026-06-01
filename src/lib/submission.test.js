import { describe, expect, it } from 'vitest';
import {
  evaluationSteps,
  validateTrajectoryUpload,
  createDemoSubmissionResult,
} from './submission';

describe('submission helpers', () => {
  it('accepts TUM and KITTI text trajectory uploads', () => {
    expect(validateTrajectoryUpload({ name: 'summer_run_tum.txt', format: 'tum' })).toEqual({
      valid: true,
      message: 'TUM text trajectory ready for evo.',
    });

    expect(validateTrajectoryUpload({ name: 'summer_run_kitti.txt', format: 'kitti' })).toEqual({
      valid: true,
      message: 'KITTI pose text ready for evo.',
    });
  });

  it('rejects ROS bags and unsupported formats', () => {
    expect(validateTrajectoryUpload({ name: 'odometry.bag', format: 'rosbag' })).toEqual({
      valid: false,
      message: 'Upload a .txt trajectory in TUM or KITTI format.',
    });

    expect(validateTrajectoryUpload({ name: 'poses.csv', format: 'csv' })).toEqual({
      valid: false,
      message: 'Upload a .txt trajectory in TUM or KITTI format.',
    });
  });

  it('describes the mocked evo evaluation progression', () => {
    expect(evaluationSteps.map((step) => step.label)).toEqual([
      'Upload received',
      'Validating text trajectory',
      'Running evo',
      'Computing composite score',
      'Score ready',
    ]);
  });

  it('creates a demo result without pretending real hidden scoring happened', () => {
    expect(
      createDemoSubmissionResult({
        team: 'Lincoln Robotics',
        method: 'SummerGraph SLAM',
        category: 'lidar',
        format: 'tum',
      }),
    ).toMatchObject({
      team: 'Lincoln Robotics',
      method: 'SummerGraph SLAM',
      category: 'lidar',
      format: 'tum',
      status: 'Demo score',
      demo: true,
    });
  });
});
