/**
 * Active-theme resolution: the OS setting, overridable in-app.
 *
 * Menu → Appearance offers System, Charcoal and Paper. This device preference
 * is shared by every screen and survives an app restart.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { type ThemeColors, type ThemeName, themes } from '@/lib/theme';

export type ThemePreference = ThemeName | 'system';
const PREFERENCE_KEY = 'quotemax.appearance';

const ThemeControlContext = createContext<{
  name: ThemeName;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}>({
  name: 'dark',
  preference: 'system',
  setPreference: () => {},
  toggle: () => {},
});

export function ThemeControlProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [savedPreference, setPreference] = useState<ThemePreference | null>(null);
  const preference = savedPreference ?? 'system';
  const name: ThemeName =
    preference === 'system' ? (scheme === 'light' ? 'light' : 'dark') : preference;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(PREFERENCE_KEY)
      .then(saved => {
        if (!active) return;
        const restored = saved === 'dark' || saved === 'light' ? saved : 'system';
        // A selection made while storage was loading takes precedence.
        setPreference(current => current ?? restored);
      })
      .catch(() => {
        if (active) setPreference(current => current ?? 'system');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (savedPreference !== null) {
      AsyncStorage.setItem(PREFERENCE_KEY, savedPreference).catch(() => {});
    }
  }, [savedPreference]);

  const value = useMemo(
    () => ({
      name,
      preference,
      setPreference,
      toggle: () => setPreference(name === 'dark' ? 'light' : 'dark'),
    }),
    [name, preference],
  );
  return <ThemeControlContext.Provider value={value}>{children}</ThemeControlContext.Provider>;
}

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const { name } = useContext(ThemeControlContext);
  return { colors: themes[name], isDark: name === 'dark' };
}

/** The overview's shortcut uses the same preference as Menu → Appearance. */
export function useThemeToggle(): () => void {
  return useContext(ThemeControlContext).toggle;
}

export function useThemePreference() {
  const { preference, setPreference } = useContext(ThemeControlContext);
  return { preference, setPreference };
}
