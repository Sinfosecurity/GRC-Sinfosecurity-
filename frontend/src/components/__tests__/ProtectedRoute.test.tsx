import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import ProtectedRoute from './ProtectedRoute';

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    // Mock authenticated state
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ 
      id: '1', 
      email: 'test@example.com', 
      name: 'Test User',
      role: 'USER',
      organizationId: 'org1'
    }));

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
