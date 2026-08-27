/**
 * Link-out to the web dashboard — the mobile stand-in for web-only tooling and
 * for the detail pane's pinned link bar. Paths are site-relative and resolved
 * against `EXPO_PUBLIC_API_URL` (the web app and the API share one base), so
 * dev builds open the LAN dev server and store builds open quotemax.com.au.
 * The web dashboard deep-links tabs via /dashboard?tab=… (page.tsx
 * DEEP_LINK_TABS), which is what most of these buttons target.
 */
import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import { apiUrl } from '@/lib/env';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export function openWebPath(path: string): void {
  void Linking.openURL(apiUrl(path));
}

/**
 * A bordered link button ("LABEL →"). `tone: 'accent'` for a section's one
 * primary jump-off; 'quiet' for the stacked secondary links in the detail bar.
 */
export function LinkOutButton({
  label,
  path,
  tone = 'quiet',
  onPress,
}: {
  label: string;
  /** Site-relative path; ignored when `onPress` is given. */
  path?: string;
  tone?: 'accent' | 'quiet';
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const accent = tone === 'accent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (onPress) onPress();
        else if (path) openWebPath(path);
      }}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor: accent ? colors.accent : colors.ctlLine,
          backgroundColor: accent
            ? pressed
              ? colors.accentPress
              : colors.accent
            : pressed
              ? colors.ink
              : 'transparent',
        },
      ]}
    >
      <Text
        style={[styles.label, { color: accent ? colors.accentInk : colors.textPri }]}
        numberOfLines={1}
      >
        {label.toUpperCase()} →
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: touch.minimum,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  label: {
    fontFamily: fonts.mono.bold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
  },
});
