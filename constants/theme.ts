/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#80ba9d';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'System',
    rounded: 'System',
    mono: 'System',
    monoBold: 'System',
  },
  default: {
    sans: 'AtkinsonHyperlegibleMono_400Regular',
    serif: 'AtkinsonHyperlegibleMono_400Regular',
    rounded: 'AtkinsonHyperlegibleMono_700Bold',
    mono: 'AtkinsonHyperlegibleMono_400Regular',
    monoBold: 'AtkinsonHyperlegibleMono_700Bold',
  },
  web: {
    sans: 'AtkinsonHyperlegibleMono_400Regular',
    serif: 'AtkinsonHyperlegibleMono_400Regular',
    rounded: 'AtkinsonHyperlegibleMono_700Bold',
    mono: 'AtkinsonHyperlegibleMono_400Regular',
    monoBold: 'AtkinsonHyperlegibleMono_700Bold',
  },
});
