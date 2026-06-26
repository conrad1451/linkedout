import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EndorsementRow } from './EndorsementRow';

afterEach(() => {
  vi.useRealTimers();
});

describe('EndorsementRow', () => {
  it('keeps the skill name readable in the network variant', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));

    render(
      <EndorsementRow
        variant="network"
        name="Joe Johnson"
        href="https://www.linkedin.com/in/joe-johnson-0100"
        skillName="Python (Programming Language)"
        statusLabel="Accepted"
        createdAtValue={Date.parse('2023-02-16T19:13:15Z')}
        createdAtTitle="Feb 16, 2023, 7:13:15 PM"
      />,
    );

    const skill = screen.getByText('Python (Programming Language)').closest('p');
    if (!skill) throw new Error('Expected skill name paragraph');
    const date = screen.getByText((content) => content.startsWith('Endorsed '));

    const link = screen.getByRole('link', { name: "Open Joe Johnson's LinkedIn profile" });
    expect(link).toHaveAttribute('href', 'https://www.linkedin.com/in/joe-johnson-0100');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Accepted').closest('span')).toHaveClass('badge-success');
    expect(date).toBeInTheDocument();
    expect(date).toHaveAttribute('title', 'Feb 16, 2023, 7:13:15 PM');

    // Date should appear before skill in the visual order
    expect(date.compareDocumentPosition(skill) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    // Badge appears after date in the visual order
    const badge = screen.getByText('Accepted');
    expect(date.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('shows warning badge for Pending status', () => {
    render(
      <EndorsementRow
        variant="network"
        name="Ruby Johnson"
        skillName="Cloud Computing"
        statusLabel="Pending"
      />,
    );

    expect(screen.getByText('Pending').closest('span')).toHaveClass('badge-warning');
  });

  it('renders the profile variant without network-only metadata', () => {
    render(<EndorsementRow name="Joe Johnson" skillName="Elastic search" />);

    expect(screen.getByText('Joe Johnson')).toBeInTheDocument();
    expect(screen.getByText('Elastic search')).toBeInTheDocument();
    expect(screen.queryByText('Accepted')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Endorsed /)).not.toBeInTheDocument();
  });

  it('falls back to "LinkedIn member" when name is empty', () => {
    render(<EndorsementRow variant="network" name="" skillName="Linux" statusLabel="Accepted" />);

    expect(screen.getByText('LinkedIn member')).toBeInTheDocument();
    expect(screen.getByText('Linux')).toBeInTheDocument();
  });

  it('renders the name as a plain heading when no href is provided', () => {
    render(
      <EndorsementRow variant="network" name="Ava Johnson" skillName="Clear Communications" />,
    );

    expect(screen.getByText('Ava Johnson')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
