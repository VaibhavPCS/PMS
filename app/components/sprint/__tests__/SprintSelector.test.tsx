import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SprintSelector } from '../SprintSelector';
import { fetchData } from '@/lib/fetch-util';

vi.mock('@/lib/fetch-util', () => ({
  fetchData: vi.fn(),
}));

describe('SprintSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an optional sprint label and allows creating task without a sprint when no sprints exist', async () => {
    (fetchData as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

    render(
      <SprintSelector
        projectId="p1"
        selectedSprintId={null}
        onSelectSprint={() => {}}
      />
    );

    expect(screen.getByText(/Sprint/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchData).toHaveBeenCalledWith('/sprint/project/p1?status=Active,Planning');
    });

    expect(screen.getByText('No active sprints available')).toBeInTheDocument();
    expect(screen.getByText(/You can still create the task without a sprint/i)).toBeInTheDocument();
  });

  it('renders backlog option and calls onSelectSprint(null) when cleared', async () => {
    (fetchData as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          _id: 's1',
          name: 'Sprint 1',
          goal: 'Goal',
          startDate: new Date('2026-01-01').toISOString(),
          endDate: new Date('2026-01-10').toISOString(),
          status: 'Active',
          totalTasks: 1,
          completedTasks: 0,
        },
      ],
    });

    const onSelectSprint = vi.fn();
    const user = userEvent.setup();

    render(
      <SprintSelector
        projectId="p1"
        selectedSprintId={'s1'}
        onSelectSprint={onSelectSprint}
      />
    );

    const select = await screen.findByLabelText(/Sprint/i);
    expect(screen.getByText('No sprint (backlog)')).toBeInTheDocument();

    await user.selectOptions(select, '');
    expect(onSelectSprint).toHaveBeenCalledWith(null);
  });
});

