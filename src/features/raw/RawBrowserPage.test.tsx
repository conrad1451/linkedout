import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RawBrowserPage } from './RawBrowserPage';

const mockUseActiveImport = vi.fn();
const mockUseDataset = vi.fn();

vi.mock('../../app/useImports', () => ({
  useActiveImport: () => mockUseActiveImport(),
}));

vi.mock('../../hooks/useDataset', () => ({
  useDataset: (...args: unknown[]) => mockUseDataset(...args),
}));

describe('RawBrowserPage', () => {
  beforeEach(() => {
    mockUseActiveImport.mockReset();
    mockUseDataset.mockReset();
    localStorage.clear();
    mockUseDataset.mockReturnValue({ rows: [], total: 0, loading: false, error: null });
  });

  it('renders the zip-style file tree and preselects a dataset from search params', () => {
    mockUseActiveImport.mockReturnValue(createImport());

    renderRawBrowser(['/raw?dataset=connections']);

    expect(screen.getByRole('heading', { name: 'Raw Data' })).toBeInTheDocument();
    expect(screen.getByText('Jobs/')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connections.csv/ })).toHaveClass('menu-active');
    expect(mockUseDataset).toHaveBeenLastCalledWith('import-1', 'connections', {
      offset: 0,
      limit: 50,
    });
  });

  it('changes the selected dataset when a file is clicked', async () => {
    const user = userEvent.setup();
    mockUseActiveImport.mockReturnValue(createImport());

    renderRawBrowser(['/raw?dataset=connections']);
    await user.click(screen.getByRole('button', { name: /Saved Jobs.csv/ }));

    await waitFor(() => {
      expect(mockUseDataset).toHaveBeenLastCalledWith('import-1', 'jobs-saved', {
        offset: 0,
        limit: 50,
      });
    });
  });

  it('updates the dataset query when the page size changes', async () => {
    const user = userEvent.setup();
    mockUseActiveImport.mockReturnValue(createImport());

    renderRawBrowser(['/raw?dataset=jobs-applications']);
    expect(screen.getByLabelText('Items per page')).toHaveValue('50');
    await user.selectOptions(screen.getByLabelText('Items per page'), '100');

    await waitFor(() => {
      expect(mockUseDataset).toHaveBeenLastCalledWith('import-1', 'jobs-applications', {
        offset: 0,
        limit: 100,
      });
    });
  });

  it('supports the legacy /raw/:datasetId route', async () => {
    mockUseActiveImport.mockReturnValue(createImport());

    renderRawBrowser(['/raw/jobs-saved']);

    await waitFor(() => {
      expect(mockUseDataset).toHaveBeenLastCalledWith('import-1', 'jobs-saved', {
        offset: 0,
        limit: 50,
      });
    });
    expect(screen.getByRole('heading', { name: 'Saved Jobs' })).toBeInTheDocument();
  });

  it('shows the import CTA when there is no active import', () => {
    mockUseActiveImport.mockReturnValue(null);

    renderRawBrowser(['/raw']);

    expect(screen.getByRole('heading', { name: 'No active import' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import data' })).toHaveAttribute('href', '/imports');
  });

  it('filters the sidebar files with the search box', async () => {
    const user = userEvent.setup();
    mockUseActiveImport.mockReturnValue(createImport());

    renderRawBrowser(['/raw?dataset=connections']);
    await user.type(screen.getByLabelText('Search raw files'), 'saved');

    expect(screen.getByText('1 matching file')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Saved Jobs.csv/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Connections.csv/ })).not.toBeInTheDocument();
  });

  it('persists closed folders between visits', async () => {
    const user = userEvent.setup();
    mockUseActiveImport.mockReturnValue(createImport());

    const view = renderRawBrowser(['/raw?dataset=connections']);
    await user.click(screen.getByText('Jobs/'));

    const jobsDetails = screen.getByText('Jobs/').closest('details');

    await waitFor(() => {
      expect(jobsDetails).not.toHaveAttribute('open');
    });
    expect(localStorage.getItem('linkedout:raw-tree:import-1')).toContain('"Jobs":false');

    view.unmount();
    renderRawBrowser(['/raw?dataset=connections']);

    expect(screen.getByText('Jobs/').closest('details')).not.toHaveAttribute('open');
  });
});

function renderRawBrowser(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/raw" element={<RawBrowserPage />} />
        <Route path="/raw/:datasetId" element={<RawBrowserPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function createImport() {
  return {
    id: 'import-1',
    label: 'May 2026 Export',
    createdAt: 0,
    fileCount: 3,
    totalRows: 5,
    datasets: [
      {
        datasetId: 'connections',
        schemaId: 'connections',
        filename: 'Connections.csv',
        title: 'Connections',
        category: 'network',
        rowCount: 2,
      },
      {
        datasetId: 'jobs-applications',
        schemaId: 'jobs-applications',
        filename: 'Jobs/Job Applications.csv',
        title: 'Job Applications',
        category: 'jobs',
        rowCount: 2,
      },
      {
        datasetId: 'jobs-saved',
        schemaId: 'jobs-saved',
        filename: 'Jobs/Saved Jobs.csv',
        title: 'Saved Jobs',
        category: 'jobs',
        rowCount: 1,
      },
    ],
  };
}
