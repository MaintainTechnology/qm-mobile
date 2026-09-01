import { Platform, Switch, type SwitchProps } from 'react-native';

import { useTheme } from '@/lib/useTheme';

/** Keep native switch behaviour and use the brand palette on every platform. */
export function ThemedSwitch(props: SwitchProps) {
  const { colors } = useTheme();
  // RN Web 0.21 reads activeThumbColor separately from the native thumbColor.
  const webColors = Platform.OS === 'web' ? { activeThumbColor: colors.accentInk } : {};
  return (
    <Switch
      {...props}
      {...webColors}
      hitSlop={props.hitSlop ?? 10}
      trackColor={{ false: colors.ctlLine, true: colors.accent }}
      thumbColor={props.value ? colors.accentInk : colors.textSec}
      ios_backgroundColor={colors.ctlLine}
    />
  );
}
