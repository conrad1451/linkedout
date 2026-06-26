import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatTemporal, parseTemporalValue } from '../../lib/datetime';
import { NetworkPage } from './NetworkPage';

const mockUseActiveImport = vi.fn();
const mockUseDataset = vi.fn();

vi.mock('../../app/useImports', () => ({
  useActiveImport: () => mockUseActiveImport(),
}));

vi.mock('../../hooks/useDataset', () => ({
  useDataset: (...args: unknown[]) => mockUseDataset(...args),
}));

describe('NetworkPage', () => {
  beforeEach(() => {
    mockUseActiveImport.mockReset();
    mockUseDataset.mockReset();
    mockUseDataset.mockReturnValue({ rows: [], total: 0, loading: false, error: null });
    vi.useRealTimers();
  });

  it('shows the import empty state when there is no active import', () => {
    mockUseActiveImport.mockReturnValue(null);

    render(
      <MemoryRouter>
        <NetworkPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No active import')).toBeInTheDocument();
    expect(mockUseDataset).toHaveBeenCalledWith(null, null, {
      offset: 0,
      limit: 25,
      search: '',
      dateRange: undefined,
      dateField: undefined,
      sort: 'date-desc',
    });
  });

  it('shows connections content by default on the network landing page', () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 5,
      totalRows: 3882,
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
          datasetId: 'invitations-1',
          schemaId: 'invitations',
          filename: 'Invitations.csv',
          title: 'Invitations',
          category: 'network',
          rowCount: 42,
          dateField: 'Sent At',
        },
        {
          datasetId: 'member-follows-1',
          schemaId: 'member-follows',
          filename: 'Member_Follows.csv',
          title: 'People Followed',
          category: 'follows',
          rowCount: 55,
          dateField: 'Date',
        },
        {
          datasetId: 'company-follows-1',
          schemaId: 'company-follows',
          filename: 'Company Follows.csv',
          title: 'Companies Followed',
          category: 'follows',
          rowCount: 12,
          dateField: 'Followed On',
        },
        {
          datasetId: 'events-1',
          schemaId: 'events',
          filename: 'Events.csv',
          title: 'Events',
          category: 'follows',
          rowCount: 6,
          dateField: 'Event Time',
        },
      ],
    });
    mockUseDataset.mockImplementation((_importId, datasetId, _options) => {
      if (datasetId === 'connections-1') {
        return {
          rows: [
            {
              __row: 0,
              __date: new Date('2026-05-24T12:00:00Z').getTime(),
              'First Name': 'Ada',
              'Last Name': 'Lovelace',
              URL: 'https://www.linkedin.com/in/ada-lovelace/',
              Position: 'Staff Engineer',
              Company: 'Analytical Engines',
              'Email Address': 'ada@example.com',
              'Connected On': '2026-05-24',
            },
          ],
          total: 1,
          loading: false,
          error: null,
        };
      }

      return { rows: [], total: 0, loading: false, error: null };
    });

    render(
      <MemoryRouter initialEntries={['/category/network']}>
        <NetworkPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Manage my network')).toBeInTheDocument();
    const rail = screen.getByRole('navigation', { name: 'My Network sections' });
    expect(within(rail).getByText('Follows')).toBeInTheDocument();
    expect(within(rail).getByText('Recommendations')).toBeInTheDocument();
    expect(within(rail).getByText('Endorsements')).toBeInTheDocument();
    expect(within(rail).getByText('Pending Invitation')).toBeInTheDocument();
    expect(within(rail).queryByText('Other')).not.toBeInTheDocument();
    const railButtons = within(rail).getAllByRole('button');
    expect(railButtons[0]).toHaveAccessibleName(/Connections/);
    expect(railButtons[1]).toHaveAccessibleName(/Following/);
    expect(railButtons[2]).toHaveAccessibleName(/Followers/);
    expect(railButtons[3]).toHaveAccessibleName(/Groups/);
    expect(railButtons[4]).toHaveAccessibleName(/Pages/);
    expect(railButtons[5]).toHaveAccessibleName(/Hashtag/);
    expect(railButtons[6]).toHaveAccessibleName(/Newsletters/);
    expect(railButtons[7]).toHaveAccessibleName(/Recommendations given/);
    expect(railButtons[8]).toHaveAccessibleName(/Recommendations received/);
    expect(railButtons[9]).toHaveAccessibleName(/Endorsements given/);
    expect(railButtons[10]).toHaveAccessibleName(/Endorsements received/);
    expect(railButtons[11]).toHaveAccessibleName(/Invitations sent/);
    expect(railButtons[12]).toHaveAccessibleName(/Invitations received/);
    expect(railButtons[13]).toHaveAccessibleName(/Events/);
    expect(screen.getByRole('button', { name: /Connections/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Following/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Followers/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Groups/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recommendations given/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recommendations received/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Endorsements given/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Endorsements received/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Events/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pages/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Newsletters/ })).toBeInTheDocument();
    expect(within(rail).queryAllByRole('link')).toHaveLength(0);
    expect(within(rail).getByText('3,720')).toHaveClass('badge', 'badge-ghost', 'badge-sm');
    expect(screen.getByRole('heading', { name: 'Connections' })).toBeInTheDocument();
    expect(screen.getByTitle('Open Connections on LinkedIn')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/mynetwork/invite-connect/connections/',
    );
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
    expect(screen.getByText('Analytical Engines')).toBeInTheDocument();
    expect(screen.queryByText('Invitations (42)')).not.toBeInTheDocument();
  });

  it('renders the connections detail view when selected from the rail', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));

    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 2,
      totalRows: 3762,
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
          datasetId: 'invitations-1',
          schemaId: 'invitations',
          filename: 'Invitations.csv',
          title: 'Invitations',
          category: 'network',
          rowCount: 42,
          dateField: 'Sent At',
        },
      ],
    });
    mockUseDataset.mockImplementation((_importId, datasetId) => {
      if (datasetId === 'connections-1') {
        return {
          rows: [
            {
              __row: 0,
              __date: new Date('2026-05-24T12:00:00Z').getTime(),
              'First Name': 'Ada',
              'Last Name': 'Lovelace',
              URL: 'https://www.linkedin.com/in/ada-lovelace/',
              Position: 'Staff Engineer',
              Company: 'Analytical Engines',
              'Email Address': 'ada@example.com',
              'Connected On': '2026-05-24',
            },
          ],
          total: 1,
          loading: false,
          error: null,
        };
      }

      return { rows: [], total: 0, loading: false, error: null };
    });

    render(
      <MemoryRouter initialEntries={['/category/network?view=connections']}>
        <NetworkPage />
      </MemoryRouter>,
    );

    expect(mockUseDataset).toHaveBeenCalledWith('import-1', 'connections-1', {
      offset: 0,
      limit: 25,
      search: '',
      dateRange: undefined,
      dateField: 'Connected On',
      sort: 'date-desc',
    });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('From Connected On')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('To Connected On')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: "Open Ada Lovelace's LinkedIn profile" }),
    ).toHaveAttribute('href', 'https://www.linkedin.com/in/ada-lovelace/');
    expect(screen.getByTitle('Open Connections on LinkedIn')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/mynetwork/invite-connect/connections/',
    );
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
    expect(screen.getByText('Analytical Engines')).toBeInTheDocument();
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('Connection')).not.toBeInTheDocument();
    expect(screen.getByText('Connected 6 months ago')).toHaveAttribute('title', 'May 24, 2026');
  });

  it('renders the following detail view with the same simplified person layout', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-28T12:00:00Z'));

    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 2,
      totalRows: 3775,
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
          datasetId: 'member-follows-1',
          schemaId: 'member-follows',
          filename: 'Member_Follows.csv',
          title: 'People Followed',
          category: 'follows',
          rowCount: 55,
          dateField: 'Date',
        },
      ],
    });

    mockUseDataset.mockImplementation((_importId, datasetId) => {
      if (datasetId === 'member-follows-1') {
        return {
          rows: [
            {
              __row: 0,
              __date: new Date('2025-12-11T07:17:37Z').getTime(),
              FullName: 'Norman Paulsen',
              Status: 'Active',
              Date: '2025-12-11 07:17:37',
            },
          ],
          total: 1,
          loading: false,
          error: null,
        };
      }

      return { rows: [], total: 0, loading: false, error: null };
    });

    render(
      <MemoryRouter initialEntries={['/category/network?view=following']}>
        <NetworkPage />
      </MemoryRouter>,
    );

    expect(mockUseDataset).toHaveBeenCalledWith('import-1', 'member-follows-1', {
      offset: 0,
      limit: 25,
      search: '',
      dateRange: undefined,
      dateField: 'Date',
      sort: 'date-desc',
    });
    expect(screen.getByTitle('Open Following on LinkedIn')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/mynetwork/network-manager/people-follow/following/',
    );
    expect(screen.getByText('Norman Paulsen')).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.getByText('Followed 5 months ago')).toHaveAttribute(
      'title',
      'Dec 11, 2025, 7:17:37 AM',
    );
  });

  it('renders the events detail view with a simplified layout and LinkedIn action', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-28T12:00:00Z'));

    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 2,
      totalRows: 3726,
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
          datasetId: 'events-1',
          schemaId: 'events',
          filename: 'Events.csv',
          title: 'Events',
          category: 'follows',
          rowCount: 6,
          dateField: 'Event Time',
        },
      ],
    });

    mockUseDataset.mockImplementation((_importId, datasetId) => {
      if (datasetId === 'events-1') {
        return {
          rows: [
            {
              __row: 0,
              __date: new Date('2025-11-05T11:15:00Z').getTime(),
              'Event Name':
                'Det mänskliga mötet i en digital tid – AI och framtidens rekrytering ✨',
              'Event Time': 'Nov 05, 2025 11:15 AM - Nov 05, 2025 12:00 PM',
              Status: 'APPROVED',
              'External Url': 'https://us06web.zoom.us/webinar/register/WN_idvvkB-3QqiS9xXgOgvNpg',
            },
          ],
          total: 1,
          loading: false,
          error: null,
        };
      }

      return { rows: [], total: 0, loading: false, error: null };
    });

    render(
      <MemoryRouter initialEntries={['/category/network?view=events']}>
        <NetworkPage />
      </MemoryRouter>,
    );

    expect(mockUseDataset).toHaveBeenCalledWith('import-1', 'events-1', {
      offset: 0,
      limit: 25,
      search: '',
      dateRange: undefined,
      dateField: 'Event Time',
      sort: 'date-desc',
    });
    expect(screen.getByTitle('Open Events on LinkedIn')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/mynetwork/network-manager/events/',
    );
    expect(
      screen.queryByRole('link', {
        name: 'Open Det mänskliga mötet i en digital tid – AI och framtidens rekrytering ✨',
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('✓ Approved')).toBeInTheDocument();
    expect(screen.getByText('Started 6 months ago')).toHaveAttribute(
      'title',
      formatTemporal(
        parseTemporalValue('Nov 05, 2025 11:15 AM - Nov 05, 2025 12:00 PM'),
        'Nov 05, 2025 11:15 AM - Nov 05, 2025 12:00 PM',
      ),
    );
  });

  it('renders split invitation views with LinkedIn shortcuts', async () => {
    const user = userEvent.setup();

    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 2,
      totalRows: 618,
      datasets: [
        {
          datasetId: 'connections-1',
          schemaId: 'connections',
          filename: 'Connections.csv',
          title: 'Connections',
          category: 'network',
          rowCount: 2,
          dateField: 'Connected On',
        },
        {
          datasetId: 'invitations-1',
          schemaId: 'invitations',
          filename: 'Invitations.csv',
          title: 'Invitations',
          category: 'network',
          rowCount: 616,
          dateField: 'Sent At',
        },
      ],
    });

    mockUseDataset.mockImplementation((_importId, datasetId, options) => {
      if (datasetId === 'invitations-1' && options.limit === 0 && options.search === 'incoming') {
        return { rows: [], total: 200, loading: false, error: null };
      }

      if (datasetId === 'invitations-1' && options.limit === 0 && options.search === 'outgoing') {
        return { rows: [], total: 416, loading: false, error: null };
      }

      if (datasetId === 'invitations-1' && options.search === 'incoming') {
        return {
          rows: [
            {
              __row: 0,
              __date: new Date('2026-05-20T12:00:00Z').getTime(),
              From: 'Linus Torvalds',
              To: 'Grace Hopper',
              'Sent At': '2026-05-20 12:00:00',
              Direction: 'INCOMING',
              inviterProfileUrl: 'https://www.linkedin.com/in/linus-torvalds/',
            },
          ],
          total: 200,
          loading: false,
          error: null,
        };
      }

      if (datasetId === 'invitations-1' && options.search === 'outgoing') {
        return {
          rows: [
            {
              __row: 1,
              __date: new Date('2026-05-24T12:00:00Z').getTime(),
              From: 'Grace Hopper',
              To: 'Ada Lovelace',
              'Sent At': '2026-05-24 12:00:00',
              Direction: 'OUTGOING',
              inviteeProfileUrl: 'https://www.linkedin.com/in/ada-lovelace/',
            },
          ],
          total: 416,
          loading: false,
          error: null,
        };
      }

      if (datasetId === 'invitations-1' && options.limit === 3) {
        return {
          rows: [
            {
              __row: 0,
              __date: new Date('2026-05-24T12:00:00Z').getTime(),
              From: 'Grace Hopper',
              To: 'Ada Lovelace',
              'Sent At': '2026-05-24 12:00:00',
              Direction: 'OUTGOING',
              inviteeProfileUrl: 'https://www.linkedin.com/in/ada-lovelace/',
            },
          ],
          total: 616,
          loading: false,
          error: null,
        };
      }

      return { rows: [], total: 0, loading: false, error: null };
    });

    render(
      <MemoryRouter initialEntries={['/category/network']}>
        <NetworkPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Invitations received/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Invitations sent/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Invitations received/ }));

    expect(screen.getByRole('heading', { name: 'Invitations received' })).toBeInTheDocument();
    expect(screen.getByTitle('Open Invitations received on LinkedIn')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/mynetwork/invitation-manager/received/',
    );
    expect(
      screen.getByRole('link', { name: "Open Linus Torvalds's LinkedIn profile" }),
    ).toHaveAttribute('href', 'https://www.linkedin.com/in/linus-torvalds/');
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Invitations sent/ }));

    expect(screen.getByRole('heading', { name: 'Invitations sent' })).toBeInTheDocument();
    expect(screen.getByTitle('Open Invitations sent on LinkedIn')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/mynetwork/invitation-manager/sent/',
    );
    expect(
      screen.getByRole('link', { name: "Open Ada Lovelace's LinkedIn profile" }),
    ).toHaveAttribute('href', 'https://www.linkedin.com/in/ada-lovelace/');
  });

  it('renders split recommendation views from the rail', async () => {
    const user = userEvent.setup();

    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 3,
      totalRows: 3723,
      linkedInProfile: {
        username: 'ada-lovelace',
        url: 'https://www.linkedin.com/in/ada-lovelace',
      },
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
          datasetId: 'recommendations-given-1',
          schemaId: 'recommendations-given',
          filename: 'Recommendations_Given.csv',
          title: 'Recommendations Given',
          category: 'profile',
          rowCount: 1,
          dateField: 'Creation Date',
        },
        {
          datasetId: 'recommendations-received-1',
          schemaId: 'recommendations-received',
          filename: 'Recommendations_Received.csv',
          title: 'Recommendations Received',
          category: 'profile',
          rowCount: 2,
          dateField: 'Creation Date',
        },
      ],
    });

    mockUseDataset.mockImplementation((_importId, datasetId) => {
      if (datasetId === 'recommendations-received-1') {
        return {
          rows: [
            {
              __row: 0,
              __date: new Date('2025-10-22T17:22:00Z').getTime(),
              'First Name': 'Emma',
              'Last Name': 'Taylor',
              Company: 'Volvo Cars',
              'Job Title': 'Senior Engineering Manager',
              Text: 'Working with this person was a genuine pleasure.',
              'Creation Date': '10/22/25, 05:22 PM',
              Status: 'PENDING',
            },
          ],
          total: 1,
          loading: false,
          error: null,
        };
      }

      if (datasetId === 'recommendations-given-1') {
        return {
          rows: [
            {
              __row: 0,
              __date: new Date('2025-09-25T17:48:00Z').getTime(),
              'First Name': 'Hui',
              'Last Name': 'Brown',
              Company: 'Sitoo',
              'Job Title': 'Staff Engineer',
              Text: 'They consistently raise the bar of every team they join.',
              'Creation Date': '09/25/25, 05:48 PM',
            },
          ],
          total: 1,
          loading: false,
          error: null,
        };
      }

      return { rows: [], total: 0, loading: false, error: null };
    });

    render(
      <MemoryRouter initialEntries={['/category/network']}>
        <NetworkPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Recommendations received/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recommendations given/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Recommendations received/ }));

    expect(screen.getByRole('heading', { name: 'Recommendations received' })).toBeInTheDocument();
    expect(screen.getByTitle('Open Recommendations received on LinkedIn')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/ada-lovelace/details/recommendations/',
    );
    expect(screen.getByText('Emma Taylor')).toBeInTheDocument();
    expect(screen.getByText('Senior Engineering Manager · Volvo Cars')).toBeInTheDocument();
    expect(
      screen.getByText('Working with this person was a genuine pleasure.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.queryByText('Hui Brown')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Recommendations given/ }));

    expect(screen.getByRole('heading', { name: 'Recommendations given' })).toBeInTheDocument();
    expect(screen.getByTitle('Open Recommendations given on LinkedIn')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/ada-lovelace/details/recommendations/',
    );
    expect(screen.getByText('Hui Brown')).toBeInTheDocument();
    expect(screen.getByText('Staff Engineer · Sitoo')).toBeInTheDocument();
    expect(
      screen.getByText('They consistently raise the bar of every team they join.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Emma Taylor')).not.toBeInTheDocument();
  });

  it('renders the followers placeholder with the LinkedIn shortcut in the content area', () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 1,
      totalRows: 3720,
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
      ],
    });

    render(
      <MemoryRouter initialEntries={['/category/network?view=followers']}>
        <NetworkPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Followers' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'This LinkedIn export does not include a dedicated followers dataset, so there is nothing reliable to render here yet.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTitle('Open Followers on LinkedIn')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/mynetwork/network-manager/people-follow/followers/',
    );
  });

  it('renders the groups placeholder with the LinkedIn shortcut in the content area', () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 1,
      totalRows: 3720,
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
      ],
    });

    render(
      <MemoryRouter initialEntries={['/category/network?view=groups']}>
        <NetworkPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Groups' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'LinkedIn does not include group membership in the export. You can view your groups on LinkedIn.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTitle('Open Groups on LinkedIn')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/groups/',
    );
  });
});
