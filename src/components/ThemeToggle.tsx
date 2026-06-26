import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KEY = 'linkedout:theme';
const LIGHT = 'linkedin-light';
const DARK = 'linkedin-dark';

function currentTheme(): string {
  if (typeof document === 'undefined') return LIGHT;
  return document.documentElement.dataset.theme === DARK ? DARK : LIGHT;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // ignore (private mode, etc.)
    }
  }, [theme]);

  const isDark = theme === DARK;
  return (
    <label className="swap swap-rotate btn btn-ghost btn-square" aria-label="Toggle theme">
      <input
        type="checkbox"
        checked={isDark}
        onChange={(e) => setTheme(e.target.checked ? DARK : LIGHT)}
      />
      <Sun className="swap-off h-5 w-5" />
      <Moon className="swap-on h-5 w-5" />
    </label>
  );
}
