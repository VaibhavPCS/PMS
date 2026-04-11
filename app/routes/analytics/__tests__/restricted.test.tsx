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
  useAuth: () => ({ user: { _id: 'u1' } }),
}));

vi.mock('@/features/analytics/components/ProductivityReportView', () => ({
  ProductivityReportView: () => <div data-testid="report-view" />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar" />,
}));

import TeamReportPage from '../restricted';

describe('analytics/restricted route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading UI when user is missing (hierarchy fetch is skipped)', async () => {
    vi.doMock('@/provider/auth-context', () => ({
      useAuth: () => ({ user: null }),
    }));
    const { default: TeamReportPageReloaded } = await import('../restricted');
    render(<TeamReportPageReloaded />);
    expect(screen.getByText(/loading team structure/i)).toBeInTheDocument();
  });

  it('renders error UI when hierarchy request fails', async () => {
    axiosGet.mockRejectedValueOnce({ response: { data: { message: 'No access' } } });
    render(<TeamReportPage />);
    expect(await screen.findByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/no access/i)).toBeInTheDocument();
  });

  it('renders controls and prompt when hierarchy loads', async () => {
    axiosGet.mockResolvedValueOnce({ data: [] });
    render(<TeamReportPage />);
    expect(await screen.findByText(/select member & date range/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /generate report/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

