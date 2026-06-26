import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportsPage } from './ImportsPage';

const mockUseImports = vi.fn();
const mockActivate = vi.fn().mockResolvedValue(undefined);
const mockRemove = vi.fn().mockResolvedValue(undefined);

vi.mock('../../app/useImports', () => ({
  useImports: () => mockUseImports(),
}));

vi.mock('./ImportDropzone', () => ({
  ImportDropzone: () => <div data-testid="import-dropzone" />,
}));

vi.mock('../../components/StorageMeter', () => ({
  StorageMeter: () => <div data-testid="storage-meter" />,
}));

vi.mock('../../components/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, title }: { open: boolean; title: string }) =>
    open ? <div>{title}</div> : null,
}));

describe('ImportsPage', () => {
  beforeEach(() => {
    mockActivate.mockClear();
    mockRemove.mockClear();
    mockUseImports.mockReset();
    mockUseImports.mockReturnValue({
      imports: [
        {
          id: 'import-1',
          label: 'Complete_LinkedInDataExport_05-28-2026.zip',
          createdAt: 0,
          fileCount: 49,
          totalRows: 65949,
          datasets: [],
        },
        {
          id: 'import-2',
          label: 'Older_LinkedInDataExport_04-01-2026.zip',
          createdAt: 0,
          fileCount: 12,
          totalRows: 1200,
          datasets: [],
        },
      ],
      activeId: 'import-1',
      loading: false,
      activate: mockActivate,
      remove: mockRemove,
      refresh: vi.fn(),
    });
  });

  it('activates an import and navigates to the raw view when the row is clicked', async () => {
    const user = userEvent.setup();

    renderImportsPage();

    await user.click(
      screen.getByRole('button', {
        name: 'Open raw data for Older_LinkedInDataExport_04-01-2026.zip',
      }),
    );

    expect(mockActivate).toHaveBeenCalledWith('import-2');
    expect(await screen.findByText('Raw page')).toBeInTheDocument();
  });

  it('renders a Raw Data button and uses it without re-activating the active import', async () => {
    const user = userEvent.setup();

    renderImportsPage();

    const activeRow = screen
      .getByText('Complete_LinkedInDataExport_05-28-2026.zip')
      .closest('li') as HTMLElement;

    await user.click(within(activeRow).getByRole('button', { name: 'Raw Data' }));

    expect(mockActivate).not.toHaveBeenCalled();
    expect(await screen.findByText('Raw page')).toBeInTheDocument();
  });
});

function renderImportsPage() {
  return render(
    <MemoryRouter initialEntries={['/imports']}>
      <Routes>
        <Route path="/imports" element={<ImportsPage />} />
        <Route path="/raw" element={<div>Raw page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}
