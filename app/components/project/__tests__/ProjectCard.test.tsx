import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock modules used inside ProjectCard
vi.mock('@/lib/fetch-util', () => ({
  putData: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

import { putData } from '@/lib/fetch-util';
import { toast } from 'sonner';
import { ProjectCard } from '../ProjectCard';

const baseProject = {
  _id: 'p1234567890',
  title: 'Alpha',
  description: 'Test project',
  status: 'Planning' as const,
  progress: 10,
  projectHead: { _id: 'u1', name: 'Head', email: 'head@example.com' },
  members: [],
  startDate: new Date().toISOString(),
  endDate: new Date().toISOString(),
};

describe('ProjectCard status transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates status and calls onStatusChange on success', async () => {
    const user = userEvent.setup();
    (putData as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ project: { progress: 50 } });

    const onStatusChange = vi.fn().mockResolvedValue(undefined);

    render(
      <ProjectCard project={baseProject} onStatusChange={onStatusChange} />
    );

    // Open the dropdown
    const trigger = screen.getByRole('button');
    await user.click(trigger);

    // Click "Mark as Ongoing" to set status to In Progress
    const ongoingItem = await screen.findByText(/Mark as Ongoing/i);
    await user.click(ongoingItem);

    // Assert API call and callback
    expect(putData).toHaveBeenCalledWith(`/project/${baseProject._id}`, { status: 'In Progress' });
    // onStatusChange receives id, newStatus, inferred progress
    expect(onStatusChange).toHaveBeenCalledWith(baseProject._id, 'In Progress', 50);
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Project status updated/));
  });

  it('shows permission error when server returns 403', async () => {
    const user = userEvent.setup();
    // Simulate axios-ish error shape
    const axiosLikeError = {
      isAxiosError: true,
      response: { status: 403, data: { message: "You don't have permission to update this project" } },
    } as any;
    (putData as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(axiosLikeError);

    const onStatusChange = vi.fn();

    render(
      <ProjectCard project={baseProject} onStatusChange={onStatusChange} />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);
    const ongoingItem = await screen.findByText(/Mark as Ongoing/i);
    await user.click(ongoingItem);

    expect(onStatusChange).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("You don't have permission to update this project");
  });
});

describe('ProjectCard delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onDelete on success and shows toast', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    // Stub confirm to always true
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <ProjectCard project={baseProject} onDelete={onDelete} />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);
    const deleteItem = await screen.findByText(/Delete Project/i);
    await user.click(deleteItem);

    expect(onDelete).toHaveBeenCalledWith(baseProject._id);
    expect(toast.success).toHaveBeenCalledWith('Project deleted successfully');
  });
});