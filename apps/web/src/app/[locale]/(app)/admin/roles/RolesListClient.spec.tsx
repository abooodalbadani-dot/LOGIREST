import { render, screen } from '@testing-library/react';
import { RolesListClient } from './RolesListClient';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  redirect: vi.fn(),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

const mockUseAdminRoles = vi.fn();
vi.mock('@/features/admin/hooks/useAdminRoles', () => ({
  useAdminRoles: () => mockUseAdminRoles(),
}));

describe('RolesListClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when loading', () => {
    mockUseAdminRoles.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<RolesListClient locale="en" />);
    // Check if skeletons are rendered
    expect(screen.queryByText('role_name')).toBeInTheDocument();
  });

  it('renders roles list when loaded', () => {
    mockUseAdminRoles.mockReturnValue({
      data: [
        {
          id: 'ADMIN',
          name: 'Administrator',
          description: 'Full Access',
          users_count: 5,
        },
      ],
      isLoading: false,
    });

    render(<RolesListClient locale="en" />);
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });
});
