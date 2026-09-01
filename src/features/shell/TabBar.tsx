/**
 * Five stable destinations, with a quiet surface and the kit's active marker.
 * Each target can grow with system text; the home indicator has its own inset.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { fonts, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

/** Kit icon paths (24×24 viewBox, stroke 1.75, round caps and joins). */
const TAB_META: Record<string, { label: string; d: string }> = {
  index: { label: 'Home', d: 'm3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  tools: {
    label: 'Tools',
    d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0L21.5 5.5a6 6 0 0 1-7.9 7.9l-7.2 7.2a2.1 2.1 0 0 1-3-3l7.2-7.2a6 6 0 0 1 7.9-7.9z',
  },
  quotes: {
    label: 'Quotes',
    d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h4',
  },
  chats: { label: 'Chats', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  menu: { label: 'Menu', d: 'M4 7h16M4 12h16M4 17h16' },
};

// Structural slice of the navigator's tab-bar props — expo-router (SDK 54)
// vendors its own @react-navigation/bottom-tabs types, so naming the packaged
// type would pin us to whichever copy wins the resolution race.
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
};

export function TabBar({ state, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          borderTopColor: colors.inkLine,
          backgroundColor: colors.inkCard,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const active = state.index === index;
        const color = active ? colors.accentText : colors.textDim;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={meta.label}
            accessibilityState={{ selected: active }}
            aria-selected={active}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!active && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={({ pressed }) => [
              styles.tab,
              { backgroundColor: pressed ? colors.ink : 'transparent' },
            ]}
          >
            <View
              style={[
                styles.activeBar,
                { backgroundColor: active ? colors.accent : 'transparent' },
              ]}
            />
            <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
              <Path
                d={meta.d}
                stroke={color}
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={[styles.label, { color }]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    minHeight: 62,
    minWidth: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    left: '22%',
    right: '22%',
    height: 2,
  },
  label: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
