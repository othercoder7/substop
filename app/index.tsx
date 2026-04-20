import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSession } from '@/components/session-provider';

export default function IndexScreen() {
  const { loading, session } = useSession();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#80ba9d" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/auth" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F5F7F4',
    flex: 1,
    justifyContent: 'center',
  },
});
