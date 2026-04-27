import {
  AtkinsonHyperlegibleMono_400Regular,
  AtkinsonHyperlegibleMono_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible-mono';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import 'react-native-reanimated';

import { Fonts } from '@/constants/theme';
import { SessionProvider } from '@/components/session-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

Text.defaultProps = Text.defaultProps ?? {};
Text.defaultProps.style = [{ fontFamily: Fonts.sans }, Text.defaultProps.style];

TextInput.defaultProps = TextInput.defaultProps ?? {};
TextInput.defaultProps.style = [{ fontFamily: Fonts.sans }, TextInput.defaultProps.style];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    AtkinsonHyperlegibleMono_400Regular,
    AtkinsonHyperlegibleMono_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#80ba9d" />
      </View>
    );
  }

  return (
    <SessionProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="email-import" />
          <Stack.Screen name="email-import-callback" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SessionProvider>
  );
}
