import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Leaderboard from './Leaderboard';
import { fetchLeaderboards } from '../lib/api';
import { ThemeProvider } from '../context/ThemeContext';
import React from 'react';

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

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe('Leaderboard', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(fetchLeaderboards).mockReset();
    vi.mocked(fetchLeaderboards).mockResolvedValue(leaderboards as any);
  });

  it('selects a category with an accessible tab and updates its panel', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Leaderboard />);

    await screen.findAllByText('RowMapper');
    await user.click(screen.getByRole('tab', { name: 'Vision SLAM' }));

    expect(screen.getByRole('tab', { name: 'Vision SLAM' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Vision SLAM' })).toHaveTextContent('CropLoop');
  });

  it('activates and focuses the next tab with ArrowRight, wrapping at the end', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Leaderboard />);

    const lidarTab = screen.getByRole('tab', { name: 'LiDAR SLAM' });
    const visionTab = screen.getByRole('tab', { name: 'Vision SLAM' });
    const combinedTab = screen.getByRole('tab', { name: 'Combined' });

    lidarTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(visionTab).toHaveFocus();
    expect(visionTab).toHaveAttribute('aria-selected', 'true');
    expect(visionTab).toHaveAttribute('tabindex', '0');
    expect(lidarTab).toHaveAttribute('tabindex', '-1');

    await user.keyboard('{End}{ArrowRight}');

    expect(lidarTab).toHaveFocus();
    expect(lidarTab).toHaveAttribute('aria-selected', 'true');
    expect(combinedTab).toHaveAttribute('tabindex', '-1');
  });

  it('activates and focuses the first or previous tab with Home and ArrowLeft', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Leaderboard />);

    const lidarTab = screen.getByRole('tab', { name: 'LiDAR SLAM' });
    const combinedTab = screen.getByRole('tab', { name: 'Combined' });

    lidarTab.focus();
    await user.keyboard('{End}');
    await user.keyboard('{Home}');

    expect(lidarTab).toHaveFocus();
    expect(lidarTab).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowLeft}');

    expect(combinedTab).toHaveFocus();
    expect(combinedTab).toHaveAttribute('aria-selected', 'true');
    expect(combinedTab).toHaveAttribute('tabindex', '0');
  });

  it('offers a full-dashboard action from the compact preview', async () => {
    renderWithTheme(<Leaderboard compact />);

    expect(await screen.findByRole('link', { name: /view full leaderboards/i })).toHaveAttribute('href', '/#leaderboards');
  });

  it('shows a readable unavailable state when the leaderboard cannot load', async () => {
    vi.mocked(fetchLeaderboards).mockRejectedValue(new Error('offline'));
    renderWithTheme(<Leaderboard />);

    expect(await screen.findByText(/leaderboard is currently unavailable/i)).toHaveAttribute('role', 'status');
  });

  it('announces loading while leaderboard results are pending', () => {
    vi.mocked(fetchLeaderboards).mockReturnValue(new Promise(() => {}));
    renderWithTheme(<Leaderboard />);

    expect(screen.getByText(/loading live leaderboard/i)).toHaveAttribute('role', 'status');
  });

  it('renders mobile cards with the key fields from the visible rows', async () => {
    renderWithTheme(<Leaderboard />);

    const card = await screen.findByTestId('leaderboard-card-lidar-1');
    expect(card).toHaveTextContent('#1');
    expect(card).toHaveTextContent('RowMapper');
    expect(card).toHaveTextContent('ICP Rows');
    expect(card).toHaveTextContent('0.180 m');
    expect(card).toHaveTextContent('LiDAR SLAM');
  });
});

function leaderboardEntry(entry: any) {
  return {
    rank: 1,
    ate_rmse: 0.18,
    rpe_rmse: 0.041,
    alignment: 'se3',
    attempt_number: 1,
    ...entry,
  };
}
