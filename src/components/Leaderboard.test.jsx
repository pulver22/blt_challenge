import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Leaderboard from './Leaderboard';
import { fetchLeaderboards } from '../lib/api';

vi.mock('../lib/api', () => ({ fetchLeaderboards: vi.fn() }));

const leaderboards = {
  lidar: [
    leaderboardEntry({ submission_id: 'lidar-1', team: 'RowMapper', method: 'ICP Rows', category: 'lidar' }),
  ],
  vision: [
    leaderboardEntry({ submission_id: 'vision-1', team: 'CropLoop', method: 'RGB-D Vineyard', category: 'vision' }),
  ],
  combined: [],
};

describe('Leaderboard', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchLeaderboards.mockReset();
    fetchLeaderboards.mockResolvedValue(leaderboards);
  });

  it('selects a category with an accessible tab and updates its panel', async () => {
    const user = userEvent.setup();
    render(<Leaderboard />);

    await screen.findAllByText('RowMapper');
    await user.click(screen.getByRole('tab', { name: 'Vision SLAM' }));

    expect(screen.getByRole('tab', { name: 'Vision SLAM' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: /vision slam leaderboard/i })).toHaveTextContent('CropLoop');
  });

  it('offers a full-dashboard action from the compact preview', async () => {
    render(<Leaderboard compact />);

    expect(await screen.findByRole('link', { name: /view full leaderboards/i })).toHaveAttribute('href', '/#leaderboards');
    expect(screen.queryByText(/official category rankings use lower ate rmse/i)).not.toBeInTheDocument();
  });

  it('shows a readable unavailable state when the leaderboard cannot load', async () => {
    fetchLeaderboards.mockRejectedValue(new Error('offline'));
    render(<Leaderboard />);

    expect(await screen.findByText(/leaderboard is unavailable/i)).toHaveAttribute('role', 'status');
  });

  it('renders mobile cards with the key fields from the visible rows', async () => {
    render(<Leaderboard />);

    const card = await screen.findByTestId('leaderboard-card-lidar-1');
    expect(card).toHaveTextContent('#1');
    expect(card).toHaveTextContent('RowMapper');
    expect(card).toHaveTextContent('ICP Rows');
    expect(card).toHaveTextContent('0.180 m');
    expect(card).toHaveTextContent('LiDAR SLAM');
  });
});

function leaderboardEntry(entry) {
  return {
    rank: 1,
    ate_rmse: 0.18,
    rpe_rmse: 0.041,
    alignment: 'se3',
    attempt_number: 1,
    ...entry,
  };
}
