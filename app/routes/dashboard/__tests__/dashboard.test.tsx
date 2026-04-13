import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const fetchData = vi.fn();
const postData = vi.fn();
const putData = vi.fn();
const postMultipart = vi.fn();
const deleteData = vi.fn();

vi.mock('@/lib/fetch-util', () => ({
  fetchData: (...args: any[]) => fetchData(...args),
  postData: (...args: any[]) => postData(...args),
  putData: (...args: any[]) => putData(...args),
  postMultipart: (...args: any[]) => postMultipart(...args),
  deleteData: (...args: any[]) => deleteData(...args),
}));

const useAuthMock = vi.fn();
vi.mock('@/provider/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-router', () => ({
  Navigate: ({ to }: any) => <div data-testid="navigate">{to}</div>,
  useNavigate: () => vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/components/ui/status-badge', () => ({
  StatusBadge: () => <span data-testid="status-badge" />,
}));

import Dashboard from '../dashboard';

describe('Dashboard route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to sign-in when unauthenticated', async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isLoading: false, user: null });
    render(<Dashboard />);
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it('renders loading when auth is loading', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isLoading: true, user: null });
    render(<Dashboard />);
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it('loads data when authenticated', async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { id: 'u1', role: 'member', workspaces: [] } });

    fetchData.mockImplementation((url: string) => {
      if (url === '/workspace') {
        return Promise.resolve({
          workspaces: [{ workspaceId: { _id: 'w1', name: 'WS1' } }],
          currentWorkspace: { _id: 'w1', name: 'WS1' },
        });
      }
      if (url.startsWith('/project')) return Promise.resolve({ projects: [] });
      if (url.startsWith('/task')) return Promise.resolve({ tasks: [] });
      if (url.startsWith('/analytics')) return Promise.resolve({});
      return Promise.resolve({});
    });

    render(<Dashboard />);

    await screen.findByText(/all projects/i);
    expect(fetchData).toHaveBeenCalledWith('/workspace');
    expect(localStorage.getItem('currentWorkspaceId')).toBe('w1');
  });
});
