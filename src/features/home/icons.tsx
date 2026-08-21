/** Home-screen stroke icons, paths verbatim from the kit (24×24 viewBox). */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size?: number; strokeWidth?: number };

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

export function CloseIcon({ color, size = 15, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}
