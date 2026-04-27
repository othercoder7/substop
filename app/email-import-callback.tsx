import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';

export default function EmailImportCallbackScreen() {
  const params = useLocalSearchParams<{ status?: string; message?: string }>();

  if (params.status === 'success') {
    return <Redirect href="/email-import" />;
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Email import</Text>
      <Text selectable style={styles.copy}>
        {typeof params.message === 'string' && params.message.length > 0
          ? params.message
          : 'The Gmail connection did not finish correctly.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: '#F5F7F4',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 26,
  },
  copy: {
    color: '#4B5563',
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
