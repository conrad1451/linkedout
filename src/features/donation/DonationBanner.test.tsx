import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DonationBanner } from './DonationBanner';
import { DonationCtx, type DonationState } from './donation-context';

function wrap(overrides: Partial<DonationState> = {}) {
  const state: DonationState = {
    showBanner: true,
    forceShow: vi.fn(),
    dismissTemporarily: vi.fn(),
    ...overrides,
  };

  return render(
    <DonationCtx.Provider value={state}>
      <DonationBanner />
    </DonationCtx.Provider>,
  );
}

describe('DonationBanner', () => {
  it('renders when showBanner is true', () => {
    wrap();
    expect(screen.getByText('announcement')).toBeInTheDocument();
    expect(screen.getByText('report an issue')).toBeInTheDocument();
  });

  it('renders nothing when showBanner is false', () => {
    const { container } = wrap({ showBanner: false });
    expect(container.innerHTML).toBe('');
  });

  it('calls dismissTemporarily when the X button is clicked', () => {
    const dismissTemporarily = vi.fn();
    wrap({ dismissTemporarily });
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(dismissTemporarily).toHaveBeenCalledOnce();
  });

  it('links to the announcement with correct href and target', () => {
    wrap();
    const link = screen.getByRole('link', { name: 'announcement' });
    expect(link).toHaveAttribute('href', 'https://blog.alexewerlof.com/linkedout');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
