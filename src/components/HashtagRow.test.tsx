import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HashtagRow } from './HashtagRow';

describe('HashtagRow', () => {
  it('renders link, label, and relative time when href is provided', () => {
    const epoch = Date.now() - 24 * 60 * 60 * 1000; // 1 day ago
    render(
      <HashtagRow
        tag="ai"
        href="https://example.com/search?q=%23ai"
        dateTemporal={{ epochMs: epoch, precision: 'date', raw: String(epoch) }}
        date={new Date(epoch).toISOString()}
      />,
    );

    // If an alternate href is provided, it's used as the search URL
    const searchBtn = screen.getByRole('link', { name: 'Find on LinkedIn' });
    expect(searchBtn).toHaveAttribute('href', 'https://example.com/search?q=%23ai');

    // Name should be rendered
    expect(screen.getByText('#ai')).toBeDefined();

    // relative text should start with 'Followed '
    expect(screen.getByText((content) => content.startsWith('Followed'))).toBeDefined();
  });

  it('builds a LinkedIn search URL when no href is provided', () => {
    const epoch = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
    render(
      <HashtagRow
        tag="#machinelearning"
        dateTemporal={{ epochMs: epoch, precision: 'date', raw: String(epoch) }}
      />,
    );

    const searchBtn = screen.getByRole('link', { name: 'Find on LinkedIn' });
    expect(searchBtn).toHaveAttribute(
      'href',
      'https://www.linkedin.com/search/results/all/?keywords=%23machinelearning&origin=HASH_TAG_FROM_FEED',
    );
    expect(screen.getByText('#machinelearning')).toBeDefined();
  });
});
