# BLT SLAM Challenge Prototype

Interactive prototype website for a BLT dataset SLAM challenge.

The site presents a participant-first challenge flow:

- train SLAM methods on public BLT runs;
- run LiDAR or vision SLAM locally on a single official summer test run;
- upload generated odometry as TUM or KITTI `.txt` trajectory files;
- view LiDAR, Vision, and Combined leaderboards with provisional composite scores and raw evo-style metrics.

This is a frontend prototype. It does not run real hidden-ground-truth evaluation yet; submission progress and scores are demo data shaped around a future `evo` backend.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test -- --run
npm run build
```
