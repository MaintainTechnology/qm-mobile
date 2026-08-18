/** Home-screen stroke icons, paths verbatim from the kit (24×24 viewBox). */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size?: number; strokeWidth?: number };

export function BellIcon({ color, size = 16, strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function SunIcon({ color, size = 16, strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

export function PhoneIcon({ color, size = 14, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

export function SendIcon({ color, size = 14, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11 21 3l-8 18-2-7z" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function CopyIcon({ color, size = 16, strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={9} width={12} height={12} rx={2} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M5 15V5a2 2 0 0 1 2-2h10" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function ClockIcon({ color, size = 13, strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12a9 9 0 0 1-9 9M3 12a9 9 0 0 1 9-9M12 8v4l3 2"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

export function CloseIcon({ color, size = 15, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}
