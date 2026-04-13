import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const axiosGet = vi.fn();

vi.mock('@/lib/axios', () => ({
  default: {
    get: (...args: any[]) => axiosGet(...args),
  },
}));

vi.mock('@/provider/auth-context', () => ({
  useAuth: () => ({ user: { role: 'member' }, isAuthenticated: true }),
}));

import Calendar from '../calendar';

describe('administration/calendar route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches workspaces and then calendar tasks', async () => {
    axiosGet
      .mockResolvedValueOnce({
        data: {
          workspaces: [
            {
              _id: 'm1',
              workspaceId: { _id: 'w1', name: 'WS1', description: '' },
              role: 'member',
              joinedAt: new Date().toISOString(),
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { tasks: [] } });

    render(<Calendar />);
    expect(await screen.findByRole('heading', { name: /task calendar/i })).toBeInTheDocument();

    expect(axiosGet).toHaveBeenCalledWith('/workspace');
    expect(axiosGet.mock.calls.some((c: any[]) => String(c[0]).includes('/task/calendar/w1'))).toBe(true);
  });
});

