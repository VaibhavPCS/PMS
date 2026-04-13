import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const fetchData = vi.fn()
const postData = vi.fn()
const deleteData = vi.fn()
vi.mock('@/lib/fetch-util', () => ({
  fetchData: (...args: any[]) => fetchData(...args),
  postData: (...args: any[]) => postData(...args),
  deleteData: (...args: any[]) => deleteData(...args),
}))

vi.mock('@/lib/config', () => ({
  buildApiUrl: (path: string) => path,
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))
import { toast } from 'sonner'

const useAuthMock = vi.fn()
vi.mock('../../../provider/auth-context', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('../../../components/layout/Breadcrumb', () => ({
  default: () => <div data-testid="breadcrumb" />,
}))

vi.mock('../../../components/workspace/WorkspaceSelector', () => ({
  WorkspaceSelector: ({ onSwitchWorkspace, onCreateWorkspaceClick }: any) => (
    <div>
      <button type="button" onClick={() => onSwitchWorkspace('w2')}>
        switch-w2
      </button>
      <button type="button" onClick={() => onCreateWorkspaceClick()}>
        create-ws
      </button>
    </div>
  ),
}))

vi.mock('../../../components/project/ProjectTabs', () => ({
  ProjectTabs: ({ onTabChange }: any) => (
    <div>
      <button type="button" onClick={() => onTabChange('All')}>
        tab-all
      </button>
    </div>
  ),
}))

vi.mock('../../../components/project/ProjectCard', () => ({
  ProjectCard: ({ project, onDelete }: any) => (
    <div>
      <div>{project.title}</div>
      <button type="button" onClick={() => onDelete(project._id)}>
        delete
      </button>
    </div>
  ),
}))

vi.mock('../../../components/project/AddProjectModal', () => ({
  AddProjectModal: ({ open }: any) => (open ? <div data-testid="add-project-modal" /> : null),
}))
vi.mock('../../../components/layout/CreateWorkspaceModal', () => ({
  CreateWorkspaceModal: ({ open }: any) => (open ? <div data-testid="create-ws-modal" /> : null),
}))
vi.mock('../../../components/workspace/WorkspaceSettingsModal', () => ({
  WorkspaceSettingsModal: ({ open }: any) => (open ? <div data-testid="ws-settings-modal" /> : null),
}))

vi.mock('../../../components/project/project-card-skeleton', () => ({
  ProjectCardSkeleton: () => <div data-testid="skeleton" />,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}))
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}))

import WorkspacePage from '../workspace'

describe('Workspace route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ workspace: { isArchived: false } }),
      }))
    )
  })

  it('loads workspaces/projects and shows Add Project for admin', async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { _id: 'u1', role: 'admin' } })

    fetchData.mockImplementation((url: string) => {
      if (url === '/workspace') {
        return Promise.resolve({
          workspaces: [{ workspaceId: { _id: 'w1', name: 'WS1' } }],
          currentWorkspace: { _id: 'w1', name: 'WS1', members: [] },
        })
      }
      if (url === '/project') {
        return Promise.resolve({
          projects: [
            {
              _id: 'p1',
              title: 'Project 1',
              description: '',
              status: 'Planning',
              progress: 0,
              projectHead: { _id: 'u1', name: 'U', email: 'u@u.com' },
              members: [],
              startDate: new Date().toISOString(),
              endDate: new Date().toISOString(),
            },
          ],
        })
      }
      return Promise.resolve({})
    })

    render(<WorkspacePage />)

    expect(await screen.findByRole('button', { name: /add project/i })).toBeInTheDocument()
    expect(localStorage.getItem('currentWorkspaceId')).toBe('w1')
    expect(screen.getByText(/1 Projects/i)).toBeInTheDocument()
  })

  it('shows Add Project for workspace lead (non-admin)', async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { _id: 'u1', role: 'member' } })

    fetchData.mockImplementation((url: string) => {
      if (url === '/workspace') {
        return Promise.resolve({
          workspaces: [{ workspaceId: { _id: 'w1', name: 'WS1' } }],
          currentWorkspace: {
            _id: 'w1',
            name: 'WS1',
            members: [{ userId: { _id: 'u1', name: 'U', email: 'u@u.com' }, role: 'lead', joinedAt: new Date().toISOString() }],
          },
        })
      }
      if (url === '/project') return Promise.resolve({ projects: [] })
      return Promise.resolve({})
    })

    render(<WorkspacePage />)
    expect(await screen.findByRole('button', { name: /add project/i })).toBeInTheDocument()
  })

  it('handles delete errors and shows toast', async () => {
    const user = userEvent.setup()
    useAuthMock.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { _id: 'u1', role: 'admin' } })

    fetchData.mockImplementation((url: string) => {
      if (url === '/workspace') {
        return Promise.resolve({
          workspaces: [{ workspaceId: { _id: 'w1', name: 'WS1' } }],
          currentWorkspace: { _id: 'w1', name: 'WS1', members: [] },
        })
      }
      if (url === '/project') {
        return Promise.resolve({
          projects: [
            {
              _id: 'p1',
              title: 'Project 1',
              description: '',
              status: 'Planning',
              progress: 0,
              projectHead: { _id: 'u1', name: 'U', email: 'u@u.com' },
              members: [],
              startDate: new Date().toISOString(),
              endDate: new Date().toISOString(),
            },
          ],
        })
      }
      return Promise.resolve({})
    })

    deleteData.mockRejectedValueOnce(new Error('fail'))

    render(<WorkspacePage />)
    await screen.findByText('Project 1')

    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(toast.error).toHaveBeenCalledWith('Failed to delete project')
  })

  it('shows empty state when no projects match', async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { _id: 'u1', role: 'admin' } })
    fetchData.mockImplementation((url: string) => {
      if (url === '/workspace') {
        return Promise.resolve({
          workspaces: [{ workspaceId: { _id: 'w1', name: 'WS1' } }],
          currentWorkspace: { _id: 'w1', name: 'WS1', members: [] },
        })
      }
      if (url === '/project') return Promise.resolve({ projects: [] })
      return Promise.resolve({})
    })

    render(<WorkspacePage />)
    expect(await screen.findByText(/no projects found/i)).toBeInTheDocument()
  })
})
