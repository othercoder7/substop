import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSession } from '@/components/session-provider';
import { supabase } from '@/lib/supabase';

export default function AuthScreen() {
  const { loading, session } = useSession();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#80ba9d" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  async function handleSubmit() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      Alert.alert('Missing info', 'Enter both an email and password.');
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          throw error;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });

        if (error) {
          throw error;
        }

        Alert.alert(
          data.session ? 'Account created' : 'Check your email',
          data.session
            ? 'Your account is ready and you are signed in.'
            : 'Open the confirmation link from Supabase, then sign in.'
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert(mode === 'sign-in' ? 'Sign in failed' : 'Sign up failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.flex}>
        <View style={styles.container}>
          <View style={styles.mainSection}>
            <View style={styles.topSection}>
              <Text style={styles.wordmark}>
                <Text style={styles.wordmarkSub}>Sub</Text>
                <Text style={styles.wordmarkStop}>Stop</Text>
              </Text>
            </View>

            <View style={styles.middleSection}>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={email}
              />
              <TextInput
                autoCapitalize="none"
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                style={styles.input}
                value={password}
              />

              <Pressable disabled={submitting} onPress={handleSubmit} style={styles.submitButton}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {mode === 'sign-in' ? 'Log in' : 'Sign up'}
                  </Text>
                )}
              </Pressable>

              <View style={styles.secondarySlot}>
                {mode === 'sign-in' ? (
                  <Pressable onPress={() => Alert.alert('Reset password', 'We can wire this next.')}>
                    <Text style={styles.secondaryLink}>Forgot password?</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.bottomSection}>
            <Pressable
              onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
              style={styles.outlineButton}>
              <Text style={styles.outlineButtonText}>
                {mode === 'sign-in' ? 'Create new account' : 'Already have an account? Log in'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#3d403b',
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  mainSection: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 88,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 44,
  },
  wordmark: {
    fontFamily: 'MartianMono_700Bold',
    fontSize: 26,
    letterSpacing: -1,
  },
  wordmarkSub: {
    color: '#F8FAFC',
  },
  wordmarkStop: {
    color: '#80ba9d',
  },
  middleSection: {
    gap: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: '#D1D5DB',
    borderRadius: 16,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#80ba9d',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 54,
    marginTop: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryLink: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
    paddingTop: 6,
    textAlign: 'center',
  },
  secondarySlot: {
    minHeight: 30,
  },
  bottomSection: {
    gap: 12,
    paddingBottom: 8,
  },
  outlineButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: '#80ba9d',
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 52,
  },
  outlineButtonText: {
    color: '#3B7C60',
    fontSize: 16,
    fontWeight: '700',
  },
  loader: {
    alignItems: 'center',
    backgroundColor: '#3d403b',
    flex: 1,
    justifyContent: 'center',
  },
});
