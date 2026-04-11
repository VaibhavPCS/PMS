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
  useSignUpMutation: () => ({ mutate: mutateMock, isPending: false }),
  useAuth: () => ({ forceAuthCheck: forceAuthCheckMock }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import SignUp from '../sign-up';
import { toast } from 'sonner';

describe('SignUp route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).requestAnimationFrame = (cb: any) => {
      cb(performance.now());
      return 0;
    };
  });

  it('renders the sign up form', () => {
    render(<SignUp />);
    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter name/i)).toBeInTheDocument();
  });

  it('toggles password and confirm password visibility', async () => {
    const user = userEvent.setup();
    render(<SignUp />);

    const passwordInputs = screen.getAllByPlaceholderText(/enter password/i) as HTMLInputElement[];
    expect(passwordInputs.length).toBeGreaterThanOrEqual(2);
    expect(passwordInputs[0].type).toBe('password');
    expect(passwordInputs[1].type).toBe('password');

    const toggleButtons = screen.getAllByRole('button').filter((b) => (b as HTMLButtonElement).type === 'button');
    expect(toggleButtons.length).toBeGreaterThanOrEqual(2);
    await user.click(toggleButtons[0]);
    await user.click(toggleButtons[1]);

    expect(passwordInputs[0].type).toBe('text');
    expect(passwordInputs[1].type).toBe('text');
  });

  it('submits registration and navigates on success', async () => {
    const user = userEvent.setup();
    render(<SignUp />);

    await user.type(screen.getByPlaceholderText(/enter email/i), 'a@a.com');
    await user.type(screen.getByPlaceholderText(/enter name/i), 'Alice');
    const pw = screen.getAllByPlaceholderText(/enter password/i);
    await user.type(pw[0], 'Password123!');
    await user.type(pw[1], 'Password123!');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@a.com', name: 'Alice' }),
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );

    const opts = mutateMock.mock.calls[0][1];
    await opts.onSuccess({});

    expect(toast.success).toHaveBeenCalledWith(
      'Registration successful!',
      expect.objectContaining({ description: expect.any(String) })
    );
    expect(forceAuthCheckMock).toHaveBeenCalled();
    await Promise.resolve();
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('shows toast error on failure', async () => {
    const user = userEvent.setup();
    render(<SignUp />);

    await user.type(screen.getByPlaceholderText(/enter email/i), 'a@a.com');
    await user.type(screen.getByPlaceholderText(/enter name/i), 'Alice');
    const pw = screen.getAllByPlaceholderText(/enter password/i);
    await user.type(pw[0], 'Password123!');
    await user.type(pw[1], 'Password123!');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    const opts = mutateMock.mock.calls[0][1];
    await opts.onError({ response: { data: { message: 'Email exists' } } });
    expect(toast.error).toHaveBeenCalledWith('Email exists');
  });
})