import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SubmissionPanel from './SubmissionPanel';
import { submitTrajectory } from '../lib/api';
import React from 'react';

vi.mock('../lib/api', () => ({ submitTrajectory: vi.fn() }));

describe('SubmissionPanel', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(submitTrajectory).mockReset();
  });

  it('disables submission until all required fields and a valid trajectory are supplied', () => {
    render(<SubmissionPanel />);

    expect(screen.getByRole('button', { name: /submit for live evaluation/i })).toBeDisabled();
    expect(screen.getByText(/tum text trajectory file/i)).toBeInTheDocument();
  });

  it('disables submission while the upload is in progress', async () => {
    const user = userEvent.setup();
    let resolveSubmission: any;
    vi.mocked(submitTrajectory).mockReturnValue(
      new Promise((resolve) => {
        resolveSubmission = resolve;
      })
    );

    render(<SubmissionPanel />);
    await completeRequiredFields(user);

    const submitButton = screen.getByRole('button', { name: /submit for live evaluation/i });
    fireEvent.submit(submitButton.closest('form')!);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /uploading trajectory/i })).toBeInTheDocument();

    resolveSubmission({ attempt_number: 1, status_url: '/submissions/a?token=b', remaining_attempts: 2 });
  });

  it('announces the queued submission and exposes its private status link', async () => {
    const user = userEvent.setup();
    vi.mocked(submitTrajectory).mockResolvedValue({
      submission_id: 'a',
      attempt_number: 1,
      status_url: '/submissions/a?token=b',
      remaining_attempts: 2,
    });

    render(<SubmissionPanel />);
    await completeRequiredFields(user);
    fireEvent.submit(screen.getByRole('button', { name: /submit for live evaluation/i }).closest('form')!);

    expect(await screen.findByRole('status', { name: /submission queued/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view private submission status/i })).toHaveAttribute(
      'href',
      '/submissions/a?token=b'
    );
  });
});

async function completeRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/contact email/i), 'team@example.org');
  await user.type(screen.getByLabelText(/team name/i), 'Lincoln Robotics');
  await user.type(screen.getByLabelText(/method name/i), 'SummerGraph SLAM');
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(fileInput, new File(['trajectory'], 'run.tum', { type: 'text/plain' }));
}
