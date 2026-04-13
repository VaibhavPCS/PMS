import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const navigateMock = vi.fn()
const useParamsMock = vi.fn()

vi.mock('react-router', () => ({
  useParams: () => useParamsMock(),
  useNavigate: () => navigateMock,
  Navigate: ({ to }: any) => <div data-testid="navigate">{to}</div>,
}))

const useAuthMock = vi.fn()
vi.mock('../../../provider/auth-context', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/lib/config', () => ({
  buildApiUrl: (path: string) => path,
  buildBackendUrl: (path: string) => path,
}))

const fetchData = vi.fn()
const postData = vi.fn()
const putData = vi.fn()
vi.mock('@/lib/fetch-util', () => ({
  fetchData: (...args: any[]) => fetchData(...args),
  postData: (...args: any[]) => postData(...args),
  putData: (...args: any[]) => putData(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))
import { toast } from 'sonner'

const fakeSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
}
vi.mock('socket.io-client', () => ({
  io: () => fakeSocket,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}))
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children, ...rest }: any) => (
    <button type="button" {...rest}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar" />,
}))
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <button type="button">{children}</button>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...rest }: any) => (
    <button type="button" {...rest}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div data-slot="scroll-area-viewport">{children}</div>,
}))
vi.mock('@/components/layout/Breadcrumb', () => ({
  default: () => <div data-testid="breadcrumb" />,
}))
vi.mock('@/components/task/AttachmentsPanel', () => ({
  AttachmentsPanel: () => <div data-testid="attachments-panel" />,
}))
vi.mock('@/components/ui/image-preview-modal', () => ({
  ImagePreviewModal: () => null,
}))
vi.mock('@/components/ui/avatar-group', () => ({
  AvatarGroup: () => <div data-testid="avatar-group" />,
}))
vi.mock('@/components/ui/rich-text-editor', () => ({
  default: () => <div data-testid="rte" />,
}))

import TaskDetail from '../task-detail'

const okJson = (data: any) => ({
  ok: true,
  status: 200,
  json: async () => data,
})

describe('TaskDetail route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('currentWorkspaceId', 'w1')
  })

  it('renders task details when task loads', async () => {
    useParamsMock.mockReturnValue({ id: 't1' })
    useAuthMock.mockReturnValue({ user: { _id: 'u1', role: 'admin' }, isAuthenticated: true, isLoading: false })

    fetchData.mockResolvedValueOnce({ user: { _id: 'u1', role: 'admin' } })
    fetchData.mockResolvedValueOnce({ members: [] })

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: any) => {
        const u = String(url)
        if (u === '/task/t1') {
          return okJson({
            task: {
              _id: 't1',
              title: 'My Task',
              description: 'Desc',
              status: 'to-do',
              priority: 'medium',
              assignee: { _id: 'u1', name: 'Alice', email: 'a@a.com' },
              creator: { _id: 'u1', name: 'Alice', email: 'a@a.com' },
              project: { _id: 'p1', title: 'P' },
              category: 'C',
              startDate: '2026-01-01T00:00:00.000Z',
              dueDate: '2026-01-02T00:00:00.000Z',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          })
        }
        if (u === '/comments/task/t1') return okJson({ comments: [] })
        if (u === '/task/t1/subtasks') return okJson({ subtasks: [] })
        if (u.includes('/handover')) return okJson({ entries: [] })
        if (u.includes('/exists')) return okJson({})
        return okJson({})
      })
    )

    render(<TaskDetail />)

    expect(await screen.findByText('Task Title')).toBeInTheDocument()
    expect(screen.getAllByText('My Task').length).toBeGreaterThan(0)
  })

  it('shows Task Not Found UI and handles 404 existence checks', async () => {
    const user = userEvent.setup()
    useParamsMock.mockReturnValue({ id: 't1' })
    useAuthMock.mockReturnValue({ user: { _id: 'u1', role: 'admin' }, isAuthenticated: true, isLoading: false })

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: any) => {
        const u = String(url)
        if (u === '/task/t1') {
          return { ok: false, status: 404, json: async () => ({}) }
        }
        if (u === '/task/t1/exists') {
          return { ok: false, status: 404, json: async () => ({}) }
        }
        return okJson({})
      })
    )

    render(<TaskDetail />)

    expect(await screen.findByText(/task not found/i)).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('This task has been deleted or no longer exists')

    await user.click(screen.getByRole('button', { name: /back to tasks/i }))
    expect(navigateMock).toHaveBeenCalledWith('/tasks')
  })

  it('redirects to sign-in when not authenticated', async () => {
    useParamsMock.mockReturnValue({ id: 't1' })
    useAuthMock.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false })

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: any) => {
        const u = String(url)
        if (u === '/task/t1') return okJson({ task: null })
        if (u === '/comments/task/t1') return okJson({ comments: [] })
        if (u === '/task/t1/subtasks') return okJson({ subtasks: [] })
        return okJson({})
      })
    )

    render(<TaskDetail />)
    expect(await screen.findByTestId('navigate')).toHaveTextContent('/sign-in')
  })
})
