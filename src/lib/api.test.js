import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchLeaderboards } from './api';

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a successful non-json response instead of returning null payloads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<!doctype html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    );

    await expect(fetchLeaderboards()).rejects.toThrow('Expected JSON response');
  });
});
