import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const fetchData = vi.fn()
vi.mock('@/lib/fetch-util', () => ({
  fetchData: (...args: any[]) => fetchData(...args),
}))

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div>{children}</div>,
  AvatarFallback: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon" />,
}))

import Profile from '../profile'

describe('Profile route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading then renders user info', async () => {
    fetchData.mockResolvedValueOnce({
      user: {
        _id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'super_admin',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    })

    render(<Profile />)
    expect(screen.getByText(/loading profile/i)).toBeInTheDocument()

    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('SUPER ADMIN')).toBeInTheDocument()
    expect(screen.getByText('02/01/2026')).toBeInTheDocument()
  })

  it('handles fetch errors and renders fallback values', async () => {
    fetchData.mockRejectedValueOnce(new Error('boom'))

    render(<Profile />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0)
  })
})
