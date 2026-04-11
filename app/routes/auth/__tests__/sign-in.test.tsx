import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const navigateMock = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
  Link: ({ to, children, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const mutateMock = vi.fn();
const forceAuthCheckMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/use-auth', () => ({
  useSignInMutation: () => ({ mutate: mutateMock, isPending: false }),
  useAuth: () => ({ forceAuthCheck: forceAuthCheckMock }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import SignIn from '../sign-in';
import { toast } from 'sonner';

describe('SignIn route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login form', () => {
    render(<SignIn />);
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<SignIn />);

    const password = screen.getByPlaceholderText(/enter password/i) as HTMLInputElement;
    expect(password.type).toBe('password');

    const toggle = screen.getAllByRole('button').find((b) => (b as HTMLButtonElement).type === 'button');
    expect(toggle).toBeTruthy();
    await user.click(toggle!);
    expect(password.type).toBe('text');
  });

  it('submits credentials and navigates on success', async () => {
    const user = userEvent.setup();
    render(<SignIn />);

    await user.type(screen.getByPlaceholderText(/enter email/i), 'a@a.com');
    await user.type(screen.getByPlaceholderText(/enter password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      { email: 'a@a.com', password: 'Password123!' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );

    const opts = mutateMock.mock.calls[0][1];
    await opts.onSuccess({});

    expect(toast.success).toHaveBeenCalledWith('Login successful!');
    expect(forceAuthCheckMock).toHaveBeenCalled();
    await Promise.resolve();
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('shows toast error on failure', async () => {
    const user = userEvent.setup();
    render(<SignIn />);

    await user.type(screen.getByPlaceholderText(/enter email/i), 'a@a.com');
    await user.type(screen.getByPlaceholderText(/enter password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    const opts = mutateMock.mock.calls[0][1];
    await opts.onError({ response: { data: { message: 'Bad creds' } } });
    expect(toast.error).toHaveBeenCalledWith('Bad creds');
  });
});
