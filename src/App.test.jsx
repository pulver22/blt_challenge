import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { fetchLeaderboards } from './lib/api';

vi.mock('./lib/api', () => ({ fetchLeaderboards: vi.fn() }));

describe('App', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchLeaderboards.mockReset();
    fetchLeaderboards.mockResolvedValue({ lidar: [], vision: [], combined: [] });
  });

  it('keeps navigation destinations and leaderboard anchors on their intended sections', async () => {
    render(<App />);

    const navigation = within(screen.getByRole('navigation', { name: 'Main navigation' }));
    expect(navigation.getByRole('link', { name: /blt slam challenge/i })).toHaveAttribute('href', '/#home');
    expect(navigation.getByRole('link', { name: 'Dataset & Rules' })).toHaveAttribute('href', '/#dataset');
    expect(navigation.getByRole('link', { name: 'Submit' })).toHaveAttribute('href', '/#submit');
    expect(navigation.getByRole('link', { name: 'Leaderboards' })).toHaveAttribute('href', '/#leaderboards');
    expect(screen.getByRole('link', { name: 'Submit odometry' })).toHaveAttribute('href', '/#submit');
    expect(document.querySelector('#dataset')).toBeInTheDocument();
    expect(document.querySelector('#submit')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Leaderboards' }).closest('section')).toHaveAttribute('id', 'leaderboards');
    expect(screen.getByRole('heading', { name: 'Current benchmark snapshot' }).closest('section')).toHaveAttribute(
      'id',
      'leaderboard-preview',
    );
    expect(await screen.findByRole('link', { name: /view full leaderboards/i })).toHaveAttribute(
      'href',
      '/#leaderboards',
    );
  });
});
