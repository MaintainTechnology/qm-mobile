/**
 * React Native ships this helper without type declarations. It is the supported way to install a
 * global polyfill, and the AI SDK's Expo guide depends on it, so we declare the narrow slice used.
 */
declare module 'react-native/Libraries/Utilities/PolyfillFunctions' {
  export function polyfillGlobal(name: string, getValue: () => unknown): void;
}
