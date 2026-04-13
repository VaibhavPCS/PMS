import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import UserManagement from '../user-management';

describe('UserManagement route', () => {
  it('renders coming soon content', () => {
    render(<UserManagement />);
    expect(screen.getByRole('heading', { name: /user management/i })).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.getByText(/invite new users/i)).toBeInTheDocument();
  });
});

