import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { fetchLeaderboards } from './lib/api';

vi.mock('./lib/api', () => ({ fetchLeaderboards: vi.fn() }));

describe('App', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(fetchLeaderboards).mockReset();
    vi.mocked(fetchLeaderboards).mockResolvedValue({ lidar: [], vision: [], combined: [] });
  });

  it('renders site navigation links correctly', async () => {
    render(<App />);

    const navigation = within(screen.getByRole('navigation', { name: 'Main navigation' }));
    expect(navigation.getByRole('link', { name: /blt slam challenge/i })).toHaveAttribute('href', '/');
    expect(navigation.getByRole('link', { name: 'Dataset & Rules' })).toHaveAttribute('href', '#dataset');
    expect(navigation.getByRole('link', { name: 'Submit' })).toHaveAttribute('href', '#submit');
    expect(navigation.getByRole('link', { name: 'Leaderboards' })).toHaveAttribute('href', '#leaderboards');
    expect(screen.getByRole('link', { name: 'Submit Odometry' })).toHaveAttribute('href', '#submit');
    expect(document.querySelector('#dataset')).toBeInTheDocument();
    expect(document.querySelector('#submit')).toBeInTheDocument();
  });

  it('shows the vineyard season mosaic in chronological order', () => {
    render(<App />);

    const mosaic = screen.getByRole('group', { name: /vineyard seasonal progression/i });
    expect(within(mosaic).getAllByRole('img').map((image) => image.getAttribute('alt'))).toEqual([
      'Vineyard in March',
      'Vineyard in April',
      'Vineyard in May',
      'Vineyard in June',
    ]);
    expect(within(mosaic).queryByText(/Figure \d+/)).not.toBeInTheDocument();
    expect(within(mosaic).getByText('One Vineyard, Four Growth Seasons')).toBeInTheDocument();
  });
});
