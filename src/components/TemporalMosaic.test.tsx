import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TemporalMosaic } from './TemporalMosaic';

describe('TemporalMosaic', () => {
  it('renders accessible day tiles and calls onDaySelect', async () => {
    const user = userEvent.setup();
    const onDaySelect = vi.fn();

    render(
      <TemporalMosaic
        year={2024}
        countsByDay={{ '2024-01-01': 1, '2024-01-02': 3 }}
        itemLabel="activity"
        onDaySelect={onDaySelect}
      />,
    );

    const day = screen.getByRole('button', { name: /January 1, 2024, 1 activity/ });
    await user.click(day);

    expect(onDaySelect).toHaveBeenCalledWith('2024-01-01');
  });

  it('renders clickable month labels with month counts', async () => {
    const user = userEvent.setup();
    const onMonthSelect = vi.fn();

    render(
      <TemporalMosaic
        year={2024}
        countsByDay={{ '2024-02-01': 2, '2024-02-29': 1 }}
        itemLabel="activity"
        onMonthSelect={onMonthSelect}
      />,
    );

    const month = screen.getByRole('button', { name: /February 2024, 3 activities/ });
    await user.click(month);

    expect(onMonthSelect).toHaveBeenCalledWith('2024-02');
  });

  it('keeps month labels in one non-overlapping row', () => {
    render(<TemporalMosaic year={2025} countsByDay={{}} itemLabel="activity" />);

    const monthButtons = within(screen.getByLabelText('2025 months')).getAllByRole('button');

    expect(monthButtons).toHaveLength(12);

    let previousEndLine = 0;
    for (const button of monthButtons) {
      const [startLine, endLine] = parseGridColumn(button.style.gridColumn);

      expect(button.style.gridRow).toBe('1');
      expect(startLine).toBeGreaterThanOrEqual(previousEndLine);
      expect(endLine).toBeGreaterThan(startLine);
      previousEndLine = endLine;
    }
  });

  it('marks selected day without changing the accessible count', () => {
    render(
      <TemporalMosaic
        year={2024}
        countsByDay={{ '2024-01-01': 1 }}
        selected={{ kind: 'day', key: '2024-01-01' }}
        itemLabel="activity"
      />,
    );

    const selectedDay = screen.getByRole('button', { name: /January 1, 2024, 1 activity/ });
    expect(selectedDay).toHaveAttribute('data-selected', 'true');
    expect(selectedDay).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks selected month labels and the month day tiles', () => {
    render(
      <TemporalMosaic
        year={2024}
        countsByDay={{ '2024-02-01': 2, '2024-03-01': 1 }}
        selected={{ kind: 'month', key: '2024-02' }}
        itemLabel="activity"
      />,
    );

    expect(screen.getByRole('button', { name: /February 2024, 2 activities/ })).toHaveAttribute(
      'data-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: /February 1, 2024, 2 activities/ })).toHaveAttribute(
      'data-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: /March 1, 2024, 1 activity/ })).not.toHaveAttribute(
      'data-selected',
    );
  });
});

function parseGridColumn(value: string): [number, number] {
  const match = value.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) throw new Error(`Unexpected grid column: ${value}`);
  return [Number(match[1]), Number(match[2])];
}
