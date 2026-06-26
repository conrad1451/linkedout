import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = 'linkedin-light';
    localStorage.clear();
  });

  it('toggles data-theme between light and dark and persists', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe('linkedin-light');

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(document.documentElement.dataset.theme).toBe('linkedin-dark');
    expect(localStorage.getItem('linkedout:theme')).toBe('linkedin-dark');

    await user.click(checkbox);
    expect(document.documentElement.dataset.theme).toBe('linkedin-light');
    expect(localStorage.getItem('linkedout:theme')).toBe('linkedin-light');
  });
});
