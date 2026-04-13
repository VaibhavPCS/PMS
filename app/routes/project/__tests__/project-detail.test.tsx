import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const navigateMock = vi.fn()
const useParamsMock = vi.fn()

vi.mock('react-router', () => ({
  useParams: () => useParamsMock(),
  useNavigate: () => navigateMock,
}))

const useAuthMock = vi.fn()
vi.mock('../../../provider/auth-context', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ isAdmin: true }),
}))

vi.mock('@/lib/config', () => ({
  buildApiUrl: (path: string) => path,
}))

const fetchData = vi.fn()
const postData = vi.fn()
const putData = vi.fn()
const deleteData = vi.fn()
const postMultipart = vi.fn()
vi.mock('@/lib/fetch-util', () => ({
  fetchData: (...args: any[]) => fetchData(...args),
  postData: (...args: any[]) => postData(...args),
  putData: (...args: any[]) => putData(...args),
  deleteData: (...args: any[]) => deleteData(...args),
  postMultipart: (...args: any[]) => postMultipart(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))
import { toast } from 'sonner'

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  DragOverlay: ({ children }: any) => <div>{children}</div>,
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: () => ({}),
  useSensors: () => ([]),
  useDroppable: () => ({ isOver: false, setNodeRef: () => {} }),
}))
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: () => ({}),
  useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: () => {}, transform: null, transition: null, isDragging: false }),
}))
vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}))

vi.mock('@/components/layout/Breadcrumb', () => ({
  default: () => <div data-testid="breadcrumb" />,
}))
vi.mock('@/components/project/TeamAvatars', () => ({
  TeamAvatars: () => <div data-testid="team-avatars" />,
}))
vi.mock('@/components/project/InviteMembersButton', () => ({
  InviteMembersButton: () => <button type="button">Invite</button>,
}))
vi.mock('@/components/project/ProjectOverviewPanel', () => ({
  ProjectOverviewPanel: () => <div data-testid="overview" />,
}))
vi.mock('@/components/project/AttachmentsSidebar', () => ({
  AttachmentsSidebar: () => <div data-testid="attachments" />,
}))
vi.mock('@/components/project/FilePreviewModal', () => ({
  FilePreviewModal: () => null,
}))
vi.mock('@/components/sprint/SprintList', () => ({
  SprintList: () => <div data-testid="sprint-list" />,
}))
vi.mock('@/components/sprint/SprintModal', () => ({
  SprintModal: () => null,
}))
vi.mock('@/components/sprint/SprintDetails', () => ({
  SprintDetails: () => <div data-testid="sprint-details" />,
}))
vi.mock('@/components/sprint/SprintSelector', () => ({
  SprintSelector: () => <div data-testid="sprint-selector" />,
}))
vi.mock('@/components/sprint/BacklogView', () => ({
  default: () => <div data-testid="backlog" />,
}))
vi.mock('@/components/project/SprintSetupWarning', () => ({
  SprintSetupWarning: () => <div data-testid="sprint-warning" />,
}))
vi.mock('@/components/project/AttachmentUpload', () => ({
  AttachmentUpload: () => <div data-testid="attachment-upload" />,
}))
vi.mock('@/components/project/RemoveProjectMembersModal', () => ({
  default: () => null,
}))
vi.mock('@/features/analytics/components/ProjectApprovalMetrics', () => ({
  default: () => <div data-testid="approval-metrics" />,
}))
vi.mock('@/components/ui/truncated-text-modal', () => ({
  TruncatedTextModal: () => null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}))
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
}))
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button type="button">{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetTrigger: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
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
  DropdownMenuSeparator: () => <hr />,
}))
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: any) => <button type="button">{children}</button>,
  AlertDialogAction: ({ children }: any) => <button type="button">{children}</button>,
}))
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button type="button">{children}</button>,
  SelectValue: () => <span />,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/components/ui/progress', () => ({
  Progress: () => <div data-testid="progress" />,
}))
vi.mock('@/components/ui/status-badge', () => ({
  StatusBadge: () => <span data-testid="status-badge" />,
}))
vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))
vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}))
vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}))
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar" />,
}))

import ProjectDetail from '../project-detail'

describe('ProjectDetail route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('currentWorkspaceId', 'w1')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }))
    )
  })

  it('renders project title when project loads', async () => {
    useParamsMock.mockReturnValue({ id: 'p1' })
    useAuthMock.mockReturnValue({ isAuthenticated: true })

    fetchData.mockImplementation((url: string) => {
      if (url === '/auth/me') return Promise.resolve({ user: { id: 'u1', name: 'U', email: 'u@u.com', role: 'admin' } })
      if (url === '/project/p1') {
        return Promise.resolve({
          project: {
            _id: 'p1',
            title: 'My Project',
            description: 'D',
            status: 'Planning',
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-02-01T00:00:00.000Z',
            progress: 10,
            creator: { _id: 'u1', name: 'U', email: 'u@u.com' },
            members: [],
          },
        })
      }
      if (url.startsWith('/task/project/p1')) return Promise.resolve({ tasks: [] })
      if (url === '/task/project/p1/members') return Promise.resolve({ members: [] })
      if (url === '/sprint/project/p1/status') return Promise.resolve({ data: null })
      if (url === '/project/p1/role') return Promise.resolve({ projectRole: 'lead' })
      return Promise.resolve({})
    })

    render(<ProjectDetail />)

    expect((await screen.findAllByRole('heading', { name: /my project/i })).length).toBeGreaterThan(0)
  })

  it('shows Project Not Found UI and toast on fetch failure', async () => {
    const user = userEvent.setup()
    useParamsMock.mockReturnValue({ id: 'p1' })
    useAuthMock.mockReturnValue({ isAuthenticated: true })

    fetchData.mockImplementation((url: string) => {
      if (url === '/auth/me') return Promise.resolve({ user: { id: 'u1', name: 'U', email: 'u@u.com', role: 'admin' } })
      if (url === '/project/p1') return Promise.reject(new Error('404'))
      return Promise.resolve({})
    })

    render(<ProjectDetail />)
    expect(await screen.findByText(/project not found/i)).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('Project not found')

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(navigateMock).toHaveBeenCalledWith('/workspace')
  })
})
