import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/provider/auth-context', () => ({
  useAuth: () => ({ user: { _id: 'u1', role: 'admin' }, isAuthenticated: true, isLoading: false })
}))

const fetchMock = vi.fn()
vi.mock('@/lib/fetch-util', () => ({
  fetchData: (url: string) => fetchMock(url)
}))

import { FilterProvider } from '@/features/analytics/context/FilterContext'
import { WorkspaceProjectSelector } from '../WorkspaceProjectSelector'

describe('WorkspaceProjectSelector', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    sessionStorage.clear()
    localStorage.clear()
  })

  it('populates workspace dropdown with API names', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation((url: string) => {
      if (url === '/workspace') {
        return Promise.resolve({
          workspaces: [
            { workspaceId: { _id: 'w1', name: 'Workspace A', description: '' }, role: 'owner', joinedAt: '', _id: 'm1' },
            { workspaceId: { _id: 'w2', name: 'Workspace B', description: '' }, role: 'member', joinedAt: '', _id: 'm2' }
          ],
          currentWorkspace: { _id: 'w1', name: 'Workspace A' }
        })
      }
      if (url.startsWith('/project')) {
        return Promise.resolve({ projects: [] })
      }
      if (url === '/analytics/project/all') {
        return Promise.resolve({ analytics: null, project: { _id: 'all', title: 'All Projects' } })
      }
      return Promise.resolve({})
    })

    render(
      <FilterProvider>
        <WorkspaceProjectSelector />
      </FilterProvider>
    )

    const wsTrigger = await screen.findByText('Select Workspace')
    await user.click(wsTrigger)
    expect(await screen.findByText('Workspace A')).toBeInTheDocument()
    expect(await screen.findByText('Workspace B')).toBeInTheDocument()
  })

  it('updates projects when changing workspace and supports All Projects', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation((url: string) => {
      if (url === '/workspace') {
        return Promise.resolve({
          workspaces: [
            { workspaceId: { _id: 'w1', name: 'Workspace A', description: '' }, role: 'owner', joinedAt: '', _id: 'm1' }
          ],
          currentWorkspace: { _id: 'w1', name: 'Workspace A' }
        })
      }
      if (url.startsWith('/project?workspace=w1')) {
        return Promise.resolve({ projects: [ { _id: 'p1', title: 'Project X', workspace: 'w1' } ] })
      }
      if (url === '/analytics/project/all') {
        return Promise.resolve({ analytics: null, project: { _id: 'all', title: 'All Projects' } })
      }
      return Promise.resolve({})
    })

    render(
      <FilterProvider>
        <WorkspaceProjectSelector />
      </FilterProvider>
    )

    const wsTrigger = await screen.findByText('Select Workspace')
    await user.click(wsTrigger)
    const wsItem = await screen.findByText('Workspace A')
    await user.click(wsItem)

    const projTrigger = await screen.findByText('Select Project')
    await user.click(projTrigger)
    expect(await screen.findByText('Project X')).toBeInTheDocument()
    expect(await screen.findByText('All Projects')).toBeInTheDocument()
  })
})
