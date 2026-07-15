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

  it('keeps main navigation destinations and one full leaderboard landmark', async () => {
    render(<App />);

    const navigation = within(screen.getByRole('navigation', { name: 'Main navigation' }));
    expect(navigation.getByRole('link', { name: 'Dataset & Rules' })).toHaveAttribute('href', '/#dataset');
    expect(navigation.getByRole('link', { name: 'Submit' })).toHaveAttribute('href', '/#submit');
    expect(navigation.getByRole('link', { name: 'Leaderboards' })).toHaveAttribute('href', '/#leaderboards');
    expect(document.querySelector('#dataset')).toBeInTheDocument();
    expect(document.querySelector('#submit')).toBeInTheDocument();
    expect(document.querySelectorAll('#leaderboards')).toHaveLength(1);
    expect(document.querySelector('#leaderboard-preview')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /view full leaderboards/i })).toHaveAttribute(
      'href',
      '/#leaderboards',
    );
  });
});
