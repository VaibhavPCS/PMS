import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import RoleManagement from '../role-management';

describe('RoleManagement route', () => {
  it('renders coming soon content', () => {
    render(<RoleManagement />);
    expect(screen.getByRole('heading', { name: /role management/i })).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.getByText(/role-based access control/i)).toBeInTheDocument();
  });
});

