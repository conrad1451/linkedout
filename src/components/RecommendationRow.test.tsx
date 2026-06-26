import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecommendationRow } from './RecommendationRow';

afterEach(() => {
  vi.useRealTimers();
});

describe('RecommendationRow', () => {
  it('keeps the recommendation body readable in the network variant', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));

    render(
      <RecommendationRow
        variant="network"
        name="Bjorn Svedman"
        headline="Senior Engineering Manager · Volvo Cars"
        recommendationText="Working with this person was a genuine pleasure."
        statusLabel="Pending"
        createdAtValue={Date.parse('2025-10-22T17:22:00Z')}
        createdAtTitle="Oct 22, 2025, 5:22:00 PM"
      />,
    );

    const quote = screen.getByText('Working with this person was a genuine pleasure.').closest('p');
    if (!quote) throw new Error('Expected recommendation text paragraph');
    const date = screen.getByText((content) => content.startsWith('Created '));

    expect(quote).not.toHaveClass('text-base-content/80');
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Pending').closest('span')).toHaveClass('badge-warning');
    expect(date).toBeInTheDocument();
    expect(date).toHaveAttribute('title', 'Oct 22, 2025, 5:22:00 PM');

    // Date should appear before quote in the visual order
    expect(date.compareDocumentPosition(quote) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('renders the profile variant without network-only metadata', () => {
    render(
      <RecommendationRow
        name="Bjorn Svedman"
        headline="Senior Engineering Manager · Volvo Cars"
        recommendationText="Working with this person was a genuine pleasure."
      />,
    );

    expect(screen.getByText('Bjorn Svedman')).toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Created /)).not.toBeInTheDocument();
  });
});
