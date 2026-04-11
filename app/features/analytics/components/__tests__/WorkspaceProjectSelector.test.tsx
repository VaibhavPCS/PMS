import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const authUser = { _id: 'u1', role: 'admin' }

vi.mock('@/provider/auth-context', () => ({
  useAuth: () => ({ user: authUser, isAuthenticated: true, isLoading: false })
}))

const fetchMock = vi.fn()
const postMock = vi.fn().mockResolvedValue({})
vi.mock('@/lib/fetch-util', () => ({
  fetchData: (url: string) => fetchMock(url),
  postData: (...args: any[]) => postMock(...args),
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

    const [wsTrigger] = await screen.findAllByRole('combobox')
    await waitFor(() => expect(wsTrigger).not.toBeDisabled())
    await user.click(wsTrigger)
    expect(await screen.findByRole('option', { name: 'Workspace A' })).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Workspace B' })).toBeInTheDocument()
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

    const [wsTrigger, projTrigger] = await screen.findAllByRole('combobox')
    await waitFor(() => expect(wsTrigger).not.toBeDisabled())
    await user.click(wsTrigger)
    const wsItem = await screen.findByRole('option', { name: 'Workspace A' })
    await user.click(wsItem)

    await waitFor(() => expect(projTrigger).not.toBeDisabled())
    await user.click(projTrigger)
    expect(await screen.findByRole('option', { name: 'Project X' })).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'All Projects' })).toBeInTheDocument()
  })
})
