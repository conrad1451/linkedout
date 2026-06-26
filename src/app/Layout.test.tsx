import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

const mockUseImports = vi.fn();
const mockActivate = vi.fn().mockResolvedValue(undefined);

vi.mock('./useImports', () => ({
  useImports: () => mockUseImports(),
}));

vi.mock('../components/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock('../features/donation/DonationBanner', () => ({
  DonationBanner: () => null,
}));

describe('Layout', () => {
  beforeEach(() => {
    mockUseImports.mockReset();
    mockActivate.mockClear();
    mockUseImports.mockReturnValue({
      imports: [
        {
          id: 'import-1',
          label: 'May 2026 Export',
          createdAt: 0,
          fileCount: 3,
          totalRows: 3971,
          datasets: [
            {
              datasetId: 'connections-1',
              schemaId: 'connections',
              filename: 'Connections.csv',
              title: 'Connections',
              category: 'network',
              rowCount: 3720,
              dateField: 'Connected On',
            },
            {
              datasetId: 'messages-1',
              schemaId: 'messages',
              filename: 'messages.csv',
              title: 'Messages',
              category: 'messages',
              rowCount: 240,
              dateField: 'DATE',
            },
            {
              datasetId: 'jobs-saved-1',
              schemaId: 'jobs-saved',
              filename: 'Jobs/Saved Jobs.csv',
              title: 'Saved Jobs',
              category: 'jobs',
              rowCount: 11,
            },
          ],
        },
      ],
      activeId: 'import-1',
      loading: false,
      activate: mockActivate,
    });
  });

  it('renders the My Network label with a compact connections badge', () => {
    render(
      <MemoryRouter initialEntries={['/category/network']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Imports page</div>} />
            <Route path="category/network" element={<div>Network page</div>} />
            <Route path="category/jobs" element={<div>Jobs page</div>} />
            <Route path="category/messages" element={<div>Messages page</div>} />
            <Route path="category/privacy" element={<div>Privacy page</div>} />
            <Route path="profile" element={<div>Profile page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByText('My Network').length).toBeGreaterThan(0);
    expect(screen.getByTitle('My Network: 3,720 connections')).toBeInTheDocument();
    // Ensure the compact badge appears on the My Network link specifically
    expect(
      within(screen.getByTitle('My Network: 3,720 connections')).getByText('3.7K'),
    ).toBeInTheDocument();
  });

  it('navigates to imports when clicking Manage in the import dropdown', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Imports page</div>} />
            <Route path="imports" element={<div>Imports page</div>} />
            <Route path="category/network" element={<div>Network page</div>} />
            <Route path="category/jobs" element={<div>Jobs page</div>} />
            <Route path="category/messages" element={<div>Messages page</div>} />
            <Route path="category/privacy" element={<div>Privacy page</div>} />
            <Route path="profile" element={<div>Profile page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Click the dropdown trigger
    await user.click(screen.getByLabelText('Active import'));

    // Click the Manage option
    await user.click(screen.getByRole('button', { name: 'Manage' }));

    expect(await screen.findByText('Imports page')).toBeInTheDocument();
    expect(mockActivate).not.toHaveBeenCalled();
  });

  it('shows the full active import label as a tooltip on the dropdown trigger', () => {
    mockUseImports.mockReturnValue({
      imports: [
        {
          id: 'import-1',
          label: 'Complete_LinkedInDataExport_05-28-2026.zip',
          createdAt: 0,
          fileCount: 3,
          totalRows: 3971,
          datasets: [],
        },
      ],
      activeId: 'import-1',
      loading: false,
      activate: mockActivate,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Imports page</div>} />
            <Route path="imports" element={<div>Imports page</div>} />
            <Route path="category/network" element={<div>Network page</div>} />
            <Route path="category/jobs" element={<div>Jobs page</div>} />
            <Route path="category/messages" element={<div>Messages page</div>} />
            <Route path="category/privacy" element={<div>Privacy page</div>} />
            <Route path="profile" element={<div>Profile page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Active import')).toHaveAttribute(
      'title',
      'Complete_LinkedInDataExport_05-28-2026.zip',
    );
  });

  it('renders a Raw Data icon button next to the import selector', () => {
    render(
      <MemoryRouter initialEntries={['/category/network']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Imports page</div>} />
            <Route path="category/network" element={<div>Network page</div>} />
            <Route path="category/jobs" element={<div>Jobs page</div>} />
            <Route path="category/messages" element={<div>Messages page</div>} />
            <Route path="category/privacy" element={<div>Privacy page</div>} />
            <Route path="profile" element={<div>Profile page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const rawLinks = screen.getAllByRole('link', { name: 'Raw Data' });
    const iconButton = rawLinks.find((link) => link.classList.contains('join-item'));
    expect(iconButton).toBeDefined();
    expect(iconButton).toHaveAttribute('href', '/raw');
  });
});
