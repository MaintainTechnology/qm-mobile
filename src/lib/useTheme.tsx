/**
 * Active-theme resolution: the OS setting, overridable in-app.
 *
 * The kit's home header (and later the menu) carries a theme toggle; DESIGN.md
 * pins the override in Settings → Appearance. The override lives here so every
 * screen picks it up unchanged.
 * ponytail: override is session-only; persist it when the settings screen lands.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { type ThemeColors, type ThemeName, themes } from '@/lib/theme';

const ThemeControlContext = createContext<{ name: ThemeName; toggle: () => void }>({
  name: 'dark',
  toggle: () => {},
});

export function ThemeControlProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [override, setOverride] = useState<ThemeName | null>(null);
  const name: ThemeName = override ?? (scheme === 'light' ? 'light' : 'dark');
  const value = useMemo(
    () => ({ name, toggle: () => setOverride(name === 'dark' ? 'light' : 'dark') }),
    [name],
  );
  return <ThemeControlContext.Provider value={value}>{children}</ThemeControlContext.Provider>;
}

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const { name } = useContext(ThemeControlContext);
  return { colors: themes[name], isDark: name === 'dark' };
}

/** The kit's sun-button behaviour: flip dark ↔ light for this session. */
export function useThemeToggle(): () => void {
  return useContext(ThemeControlContext).toggle;
}
