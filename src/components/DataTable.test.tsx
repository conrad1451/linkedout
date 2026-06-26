import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DataTable } from './DataTable';
import type { DatasetRow } from '../lib/store';

const rows: DatasetRow[] = [
  { __row: 0, Name: 'Zoe', Company: 'Northwind' },
  { __row: 1, Name: 'Alex', Company: 'Contoso' },
  { __row: 2, Name: 'Sam', Company: 'Fabrikam' },
];

describe('DataTable', () => {
  it('does not render a search box', () => {
    render(<DataTable rows={rows} />);

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('sorts by column', async () => {
    const user = userEvent.setup();
    render(<DataTable rows={rows} />);

    await user.click(screen.getByRole('button', { name: /Name/i }));

    const cells = screen.getAllByRole('cell').map((cell) => cell.textContent);
    expect(cells.slice(0, 3)).toEqual(['Alex', 'Contoso', 'Sam']);
  });

  it('renders the empty state without search controls', () => {
    render(<DataTable rows={[]} />);

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByText('No rows.')).toBeInTheDocument();
  });
});
