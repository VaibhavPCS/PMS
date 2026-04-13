import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const fetchData = vi.fn()
const postData = vi.fn()
const postMultipart = vi.fn()
vi.mock('@/lib/fetch-util', () => ({
  fetchData: (...args: any[]) => fetchData(...args),
  postData: (...args: any[]) => postData(...args),
  postMultipart: (...args: any[]) => postMultipart(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))
import { toast } from 'sonner'

const socketHandlers: Record<string, any> = {}
const fakeSocket = {
  id: 's1',
  connected: true,
  on: (evt: string, cb: any) => {
    socketHandlers[evt] = cb
  },
  onAny: () => {},
  emit: vi.fn(),
  disconnect: vi.fn(),
  off: vi.fn(),
}
vi.mock('socket.io-client', () => ({
  io: () => fakeSocket,
}))

const useAuthMock = vi.fn()
vi.mock('../../../provider/auth-context', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('../../../components/chat/chat-sidebar-new', () => ({
  default: ({ chats, onChatSelect, onRefresh }: any) => (
    <div>
      <div data-testid="chat-count">{chats.length}</div>
      <button type="button" onClick={() => onRefresh()}>
        refresh
      </button>
      {chats[0] ? (
        <button type="button" onClick={() => onChatSelect(chats[0])}>
          open-first
        </button>
      ) : null}
    </div>
  ),
}))

vi.mock('../../../components/chat/chat-window', () => ({
  default: ({ chat, onSendMessage }: any) => (
    <div>
      <div data-testid="active-chat">{chat._id}</div>
      <button type="button" onClick={() => onSendMessage('hello')}>
        send
      </button>
    </div>
  ),
}))

import ChatRoute from '../chat'

describe('Chat route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(socketHandlers).forEach((k) => delete socketHandlers[k])
  })

  it('loads chats and renders sidebar', async () => {
    useAuthMock.mockReturnValue({ user: { _id: 'u1', name: 'User' } })
    fetchData.mockImplementation((url: string) => {
      if (url === '/chats/organization') {
        return Promise.resolve({
          chats: [
            {
              _id: 'c1',
              type: 'direct',
              participants: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })
      }
      if (url === '/messages/chat/c1') {
        return Promise.resolve({ messages: [] })
      }
      return Promise.resolve({})
    })

    render(<ChatRoute />)
    expect(screen.getByText(/loading chats/i)).toBeInTheDocument()

    expect(await screen.findByTestId('chat-count')).toHaveTextContent('1')
  })

  it('shows toast error when chat loading fails', async () => {
    useAuthMock.mockReturnValue({ user: { _id: 'u1', name: 'User' } })
    fetchData.mockRejectedValueOnce(new Error('fail'))

    render(<ChatRoute />)

    await screen.findByText(/select a chat to start messaging/i)
    expect(toast.error).toHaveBeenCalledWith('Failed to load chats')
  })

  it('handles send message errors and shows backend message', async () => {
    const user = userEvent.setup()
    useAuthMock.mockReturnValue({ user: { _id: 'u1', name: 'User' } })
    fetchData.mockImplementation((url: string) => {
      if (url === '/chats/organization') {
        return Promise.resolve({
          chats: [
            {
              _id: 'c1',
              type: 'direct',
              participants: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })
      }
      if (url === '/messages/chat/c1') {
        return Promise.resolve({ messages: [] })
      }
      return Promise.resolve({})
    })

    postData.mockRejectedValueOnce({ response: { data: { message: 'Bad request' } } })

    render(<ChatRoute />)
    await screen.findByTestId('chat-count')

    await user.click(screen.getByRole('button', { name: /open-first/i }))
    expect(await screen.findByTestId('active-chat')).toHaveTextContent('c1')

    await user.click(screen.getByRole('button', { name: /send/i }))
    expect(toast.error).toHaveBeenCalledWith('Bad request')
  })
})
