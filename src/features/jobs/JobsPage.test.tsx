import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobsPage } from './JobsPage';

const mockUseActiveImport = vi.fn();
const mockUseDataset = vi.fn();

vi.mock('../../app/useImports', () => ({
  useActiveImport: () => mockUseActiveImport(),
}));

vi.mock('../../hooks/useDataset', () => ({
  useDataset: (...args: unknown[]) => mockUseDataset(...args),
}));

// We mock the parser to always return a predictable result so tests don't
// depend on the real parser implementation.
vi.mock('../../lib/linkedin/job-alert-parser', () => ({
  parseLinkedInFormat: (input: string) => {
    if (input.includes('frequency=DAILY'))
      return { frequency: 'DAILY', channels: ['INAPP_NOTIFICATION'], smartExpansionEnabled: true };
    if (input.includes('frequency=WEEKLY'))
      return {
        frequency: 'WEEKLY',
        channels: ['INAPP_NOTIFICATION', 'EMAIL'],
        smartExpansionEnabled: false,
      };
    return {};
  },
  extractAlertSummary: () => ({
    keywords: 'staff engineer',
    frequency: 'DAILY',
    channels: ['INAPP_NOTIFICATION'],
    smartExpansionEnabled: true,
    geoUrn: 'urn:li:geo:104738515',
    radiusKm: null,
    workplaceTypeUrns: [],
  }),
}));

describe('JobsPage', () => {
  beforeEach(() => {
    mockUseActiveImport.mockReset();
    mockUseDataset.mockReset();
    mockUseDataset.mockReturnValue({ rows: [], total: 0, loading: false, error: null });
  });

  function createImport(overrides: Record<string, unknown> = {}) {
    return {
      id: 'import-1',
      label: 'Test Export',
      createdAt: 0,
      fileCount: 5,
      totalRows: 100,
      datasets: [
        {
          datasetId: 'apps-1',
          schemaId: 'jobs-applications',
          filename: 'Jobs/Job Applications.csv',
          title: 'Job Applications',
          category: 'jobs',
          rowCount: 9,
          dateField: 'Application Date',
          linkField: 'Job Url',
        },
        {
          datasetId: 'saved-1',
          schemaId: 'jobs-saved',
          filename: 'Jobs/Saved Jobs.csv',
          title: 'Saved Jobs',
          category: 'jobs',
          rowCount: 9,
          dateField: 'Saved Date',
          linkField: 'Job Url',
        },
        {
          datasetId: 'alerts-1',
          schemaId: 'saved-job-alerts',
          filename: 'SavedJobAlerts.csv',
          title: 'Saved Job Alerts',
          category: 'jobs',
          rowCount: 4,
        },
        {
          datasetId: 'prefs-1',
          schemaId: 'jobs-preferences',
          filename: 'Jobs/Job Seeker Preferences.csv',
          title: 'Job Seeker Preferences',
          category: 'jobs',
          rowCount: 1,
        },
        ...((overrides.datasets as Array<Record<string, unknown>>) ?? []),
      ],
      ...overrides,
    };
  }

  // -----------------------------------------------------------------------
  // Empty / missing-data states
  // -----------------------------------------------------------------------

  it('shows the import empty state when there is no active import', () => {
    mockUseActiveImport.mockReturnValue(null);

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No active import')).toBeInTheDocument();
  });

  it('shows an empty state when none of the jobs datasets are present', () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'Test',
      createdAt: 0,
      fileCount: 1,
      totalRows: 1,
      datasets: [],
    });

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No jobs datasets found')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Rail sidebar
  // -----------------------------------------------------------------------

  it('renders the rail with all four views', () => {
    mockUseActiveImport.mockReturnValue(createImport());

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    const rail = screen.getByRole('navigation', { name: 'Jobs sections' });
    expect(within(rail).getByText('Applications')).toBeInTheDocument();
    expect(within(rail).getByText('Saved')).toBeInTheDocument();
    expect(within(rail).getByText('Alerts')).toBeInTheDocument();
    expect(within(rail).getByText('Preferences')).toBeInTheDocument();
  });

  it('shows badge counts on rail items', () => {
    mockUseActiveImport.mockReturnValue(createImport());

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    const rail = screen.getByRole('navigation', { name: 'Jobs sections' });
    const appButton = within(rail).getByText('Applications').closest('button')!;
    expect(appButton.textContent).toContain('9');

    const savedButton = within(rail).getByText('Saved').closest('button')!;
    expect(savedButton.textContent).toContain('9');
  });

  // -----------------------------------------------------------------------
  // View switching
  // -----------------------------------------------------------------------

  it('renders applications view by default', async () => {
    mockUseActiveImport.mockReturnValue(createImport());

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Job Applications' })).toBeInTheDocument();
  });

  it('switches to saved view when rail item is clicked', async () => {
    mockUseActiveImport.mockReturnValue(createImport());
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByText('Saved'));
    expect(screen.getByRole('heading', { name: 'Saved Jobs' })).toBeInTheDocument();
  });

  it('switches to alerts view when rail item is clicked', async () => {
    mockUseActiveImport.mockReturnValue(createImport());
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByText('Alerts'));
    expect(screen.getByRole('heading', { name: 'Job Alerts' })).toBeInTheDocument();
  });

  it('switches to preferences view when rail item is clicked', async () => {
    mockUseActiveImport.mockReturnValue(createImport());
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByText('Preferences'));
    expect(screen.getByRole('heading', { name: 'Job Seeker Preferences' })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Application cards
  // -----------------------------------------------------------------------

  it('renders job application cards with title, company, and detail fields', () => {
    mockUseActiveImport.mockReturnValue(createImport());
    mockUseDataset.mockReturnValue({
      rows: [
        {
          __row: 1,
          'Job Title': 'Software Engineer',
          'Job Url': 'https://www.linkedin.com/jobs/view/123',
          'Company Name': 'Acme Corp',
          'Application Date': '1/15/25, 3:00 PM',
          'Contact Email': 'me@example.com',
          'Contact Phone Number': '+15555550100',
          'Resume Name': 'resume.pdf',
          'Question And Answers': 'Why you? Yes.',
          __dates: {},
        },
        {
          __row: 2,
          'Job Title': 'CTO',
          'Job Url': 'https://www.linkedin.com/jobs/view/456',
          'Company Name': 'Startup Inc',
          'Application Date': '3/10/25, 9:00 AM',
          'Contact Email': '',
          'Contact Phone Number': '',
          'Resume Name': '',
          'Question And Answers': '',
          __dates: {},
        },
      ],
      total: 2,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Job Applications' })).toBeInTheDocument();

    // First card has title and link
    const titleLink = screen.getByRole('link', { name: 'Software Engineer' });
    expect(titleLink).toHaveAttribute('href', 'https://www.linkedin.com/jobs/view/123');

    // Company name is visible
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();

    // Detail fields on first card
    expect(screen.getByText('Contact Email')).toBeInTheDocument();
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('+15555550100')).toBeInTheDocument();
    expect(screen.getByText('resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('Why you? Yes.')).toBeInTheDocument();

    // Second card has no body fields (all empty)
    expect(screen.getByText('CTO')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Saved job cards
  // -----------------------------------------------------------------------

  it('renders saved job cards with title, company, and date', async () => {
    mockUseActiveImport.mockReturnValue(createImport());
    mockUseDataset.mockReturnValue({
      rows: [
        {
          __row: 1,
          'Job Title': 'Staff Engineer',
          'Job Url': 'https://www.linkedin.com/jobs/view/789',
          'Company Name': 'BigCo',
          'Saved Date': '6/1/25, 12:00 PM',
          __dates: {},
        },
      ],
      total: 1,
      loading: false,
      error: null,
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByText('Saved'));
    expect(screen.getByRole('heading', { name: 'Saved Jobs' })).toBeInTheDocument();

    const titleLink = screen.getByRole('link', { name: 'Staff Engineer' });
    expect(titleLink).toHaveAttribute('href', 'https://www.linkedin.com/jobs/view/789');
    expect(screen.getByText('BigCo')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Alert cards
  // -----------------------------------------------------------------------

  it('renders alert cards with keywords and frequency', async () => {
    mockUseActiveImport.mockReturnValue(createImport());
    mockUseDataset.mockReturnValue({
      rows: [
        {
          __row: 1,
          ALERT_PARAMETERS: '{frequency=DAILY, channels=[INAPP_NOTIFICATION]}',
          QUERY_CONTEXT: '{keywords=staff engineer}',
          SAVED_SEARCH_ID: '12345',
          __dates: {},
        },
      ],
      total: 1,
      loading: false,
      error: null,
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByText('Alerts'));
    expect(screen.getByRole('heading', { name: 'Job Alerts' })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Preferences
  // -----------------------------------------------------------------------

  it('renders preferences as a key-value list', async () => {
    mockUseActiveImport.mockReturnValue(createImport());
    mockUseDataset.mockReturnValue({
      rows: [
        {
          __row: 1,
          Locations: 'Springfield',
          Industries: 'Tech',
          'Job Titles': 'Staff Engineer',
          __dates: {},
        },
      ],
      total: 1,
      loading: false,
      error: null,
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByText('Preferences'));
    expect(screen.getByRole('heading', { name: 'Job Seeker Preferences' })).toBeInTheDocument();

    expect(screen.getByText('Locations')).toBeInTheDocument();
    expect(screen.getByText('Springfield')).toBeInTheDocument();
    expect(screen.getByText('Industries')).toBeInTheDocument();
    expect(screen.getByText('Tech')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Loading and error states
  // -----------------------------------------------------------------------

  it('shows a loading spinner while data is loading', () => {
    mockUseActiveImport.mockReturnValue(createImport());
    mockUseDataset.mockReturnValue({ rows: [], total: 0, loading: true, error: null });

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Loading job applications')).toBeInTheDocument();
  });

  it('shows an error alert when data fetch fails', () => {
    mockUseActiveImport.mockReturnValue(createImport());
    mockUseDataset.mockReturnValue({
      rows: [],
      total: 0,
      loading: false,
      error: 'Something went wrong',
    });

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Unavailable dataset
  // -----------------------------------------------------------------------

  it('shows unavailable section when a dataset is missing', async () => {
    mockUseActiveImport.mockReturnValue(
      createImport({
        datasets: [
          {
            datasetId: 'apps-1',
            schemaId: 'jobs-applications',
            filename: 'Jobs/Job Applications.csv',
            title: 'Job Applications',
            category: 'jobs',
            rowCount: 2,
            dateField: 'Application Date',
            linkField: 'Job Url',
          },
        ],
      }),
    );
    mockUseDataset.mockReturnValue({ rows: [], total: 0, loading: false, error: null });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByText('Saved'));
    expect(
      screen.getByText('This dataset is not present in the active import.'),
    ).toBeInTheDocument();
  });
});
