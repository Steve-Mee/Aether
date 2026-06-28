import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { LOGIN_PATH } from '../adapters/stubAuthAdapter';

const useAuthMock = vi.fn();

vi.mock('../AuthProvider', () => ({
  useAuth: () => useAuthMock(),
}));

function renderProtectedAt(path: string) {
  return renderToString(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(
        Routes,
        null,
        createElement(
          Route,
          { element: createElement(ProtectedRoute) },
          createElement(Route, {
            path: 'command-center',
            element: createElement('div', { 'data-testid': 'protected-child' }, 'Secret'),
          }),
        ),
      ),
    ),
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it('shows loading screen while auth hydrates', () => {
    useAuthMock.mockReturnValue({
      loading: true,
      isAuthenticated: false,
    });
    const html = renderProtectedAt('/command-center');
    expect(html).toContain('auth-loading');
  });

  it('does not render child when unauthenticated', () => {
    useAuthMock.mockReturnValue({
      loading: false,
      isAuthenticated: false,
    });
    const html = renderProtectedAt('/command-center');
    expect(html).not.toContain('protected-child');
  });

  it('renders outlet child when authenticated', () => {
    useAuthMock.mockReturnValue({
      loading: false,
      isAuthenticated: true,
    });
    const html = renderProtectedAt('/command-center');
    expect(html).toContain('protected-child');
  });

  it('uses login path constant for redirect target', () => {
    expect(LOGIN_PATH).toBe('/login');
  });
});
