/**
 * QuoteMax Mobile design tokens — the app-side source of the design system.
 *
 * Authority: DESIGN.md at the repo root (tailored from the quotemax.com.au website system).
 * The brand kit at design-system/index.html renders these same values for humans;
 * design-system/tokens.json carries them platform-neutrally. Change DESIGN.md first,
 * then keep all three in step.
 *
 * Rules that live here so screens cannot break them:
 * - One accent. `accent` is the only signal colour; text on it is always `accentInk`.
 * - Borders, not shadows. Resting surfaces get `hairline` + the lit edge, elevation 0.
 * - Money renders in mono with tabular figures, from integer cents via formatAud.
 */
import type { TextStyle } from 'react-native';

export interface ThemeColors {
  /** Screen canvas. */
  inkDeep: string;
  /** Sunken surface: inputs, insets, grouped lists. */
  ink: string;
  /** Raised surface: cards, sheets, tab bar. */
  inkCard: string;
  /** The 1px warm hairline that draws every structural edge. */
  inkLine: string;
  /**
   * Input/control boundary. Stronger than inkLine so a field edge holds ~3:1
   * in full sun; a declared mobile deviation from the web's single hairline.
   */
  ctlLine: string;
  /** Caterpillar yellow. The one signal per screen. */
  accent: string;
  /** Pressed state of an accent fill. */
  accentPress: string;
  /** Focus rings and selection ticks only. Soft yellow on dark; ink on paper, where soft yellow is invisible. */
  accentSoft: string;
  /** Text and icons on an accent fill. Never white on yellow. */
  accentInk: string;
  /**
   * Accent-coloured TEXT and icons (the kit's --accTx). Yellow in dark; charcoal
   * on paper, where yellow text is ~1.3:1 and unreadable. Never collapse into accent.
   */
  accentText: string;
  /** Highlighter underline under accent display words (--accUnder): off in dark, yellow on paper. */
  accentUnder: string;
  textPri: string;
  textSec: string;
  /** Mono labels and captions; tuned to stay ≥4.5:1 on inkCard. */
  textDim: string;
  /** Topographic ridge texture only. A neutral, never an accent. */
  edgeGlow: string;
  edgeDeep: string;
  /** State fills: chips and rules only, never large fills. */
  success: string;
  successBright: string;
  warning: string;
  warningBright: string;
  danger: string;
  dangerBright: string;
  /** Brand mark body; flips white/charcoal with the theme. */
  logoBody: string;
  /** Mark gold #E3C13C, the literal source-art value. Never "correct" it to accent. */
  logoNotch: string;
}

/** Dark theme, the brand primary: warm near-black charcoal, never blue-black. */
export const darkColors: ThemeColors = {
  inkDeep: '#16120F',
  ink: '#1E1813',
  inkCard: '#2B2422',
  inkLine: '#3A322C',
  ctlLine: '#7A6E5E',
  accent: '#FFC400',
  accentPress: '#E6AC00',
  accentSoft: '#FFD23D',
  accentInk: '#1C1812',
  accentText: '#FFC400',
  accentUnder: 'transparent',
  textPri: '#F6F1EA',
  textSec: '#C3B8AC',
  textDim: '#A2968A',
  edgeGlow: '#6E6354',
  edgeDeep: '#4A4136',
  success: '#15803D',
  successBright: '#34D27B',
  warning: '#B45309',
  warningBright: '#F59E0B',
  danger: '#B91C1C',
  dangerBright: '#F0816B',
  logoBody: '#FFFFFF',
  logoNotch: '#E3C13C',
};

/** Light theme, "warm paper": the sunlight workhorse. Follows the device setting. */
export const lightColors: ThemeColors = {
  inkDeep: '#FAF8F4',
  ink: '#F3EEE7',
  inkCard: '#FFFFFF',
  inkLine: '#CFC2B0',
  ctlLine: '#8A7D6A',
  accent: '#FFC400',
  accentPress: '#E6AC00',
  accentSoft: '#2B2422',
  accentInk: '#2B2422',
  accentText: '#2B2422',
  accentUnder: '#FFC400',
  textPri: '#241E1B',
  textSec: '#5E544E',
  textDim: '#6E645C',
  edgeGlow: '#8A7D6A',
  edgeDeep: '#6E6354',
  success: '#15803D',
  successBright: '#15803D',
  warning: '#B45309',
  warningBright: '#B45309',
  danger: '#B91C1C',
  dangerBright: '#B91C1C',
  logoBody: '#16120F',
  logoNotch: '#E3C13C',
};

export const themes = { dark: darkColors, light: lightColors } as const;
export type ThemeName = keyof typeof themes;

/**
 * Font family names as @expo-google-fonts registers them.
 * Only these weights are sanctioned; anything else synthesises badly.
 */
export const fonts = {
  sans: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semiBold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    extraBold: 'Manrope_800ExtraBold',
  },
  mono: {
    regular: 'JetBrainsMono_400Regular',
    medium: 'JetBrainsMono_500Medium',
    semiBold: 'JetBrainsMono_600SemiBold',
    bold: 'JetBrainsMono_700Bold',
  },
} as const;

/**
 * The type scale, colourless. Compose with a theme colour at the call site.
 * Display and headline are ALL CAPS and left-aligned, never centered.
 */
export const type = {
  display: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1.36,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -1.04,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.sans.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.36,
  },
  body: {
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  /** Field labels, KPI labels, refs, timestamps. 12 is the floor, mono only. */
  label: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.16,
    textTransform: 'uppercase',
  },
  /** Money. Line items drop to 16/24 mono; totals get this. Always tabular. */
  price: {
    fontFamily: fonts.mono.bold,
    fontSize: 28,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TextStyle>;

/** 4dp base scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  gap: 32,
  section: 48,
  screen: 64,
} as const;

export const radius = {
  card: 14,
  control: 9,
  chip: 6,
  sheet: 16,
  /** Status dots and avatar discs only. Never buttons. */
  pill: 9999,
} as const;

/** Touch floors. Gloves are the baseline: 48 minimum, 56 for rows and the primary CTA. */
export const touch = {
  minimum: 48,
  listRow: 56,
  primaryCta: 56,
} as const;

/** Nothing in-app exceeds 300ms. Press feedback = colour step + scale, together. */
export const motion = {
  fast: 120,
  base: 180,
  slow: 240,
  pressScale: 0.97,
  /** Strong ease-out for entries; never ease-in. Easing.bezier(...) takes these. */
  easeOut: [0.23, 1, 0.32, 1],
  easeInOut: [0.77, 0, 0.175, 1],
} as const;

/** The 1px drawn edge. hairlineWidth is too thin on 3x devices; structure is 1. */
export const hairline = 1;
