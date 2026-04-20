import * as Linking from 'expo-linking';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : undefined;
    const type = typeof params.type === 'string' ? params.type : undefined;

    if (!tokenHash || type !== 'recovery' || recoveryChecked) {
      return;
    }

    setRecoveryChecked(true);

    async function verifyRecoveryLink() {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });

      if (error) {
        Alert.alert('Invalid reset link', error.message);
        return;
      }

      setRecoveryReady(true);
    }

    verifyRecoveryLink();
  }, [params.token_hash, params.type, recoveryChecked]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#80ba9d" />
      </View>
    );
  }

  if (session && !recoveryReady) {
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

  async function handleForgotPassword() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert('Add your email', 'Enter your email address first so we know where to send the reset link.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: Linking.createURL('/auth'),
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Check your email',
        'We sent a password reset link. Open it on this device to choose a new password.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Reset password failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdatePassword() {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Missing info', 'Enter your new password twice.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Make sure both password fields match.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        throw error;
      }

      Alert.alert('Password updated', 'Your password has been changed successfully.');
      setRecoveryReady(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Update failed', message);
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
              {recoveryReady ? (
                <>
                  <Text style={styles.recoveryTitle}>Choose a new password</Text>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>New password</Text>
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={setNewPassword}
                      placeholder=""
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      style={styles.input}
                      value={newPassword}
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Confirm new password</Text>
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={setConfirmPassword}
                      placeholder=""
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      style={styles.input}
                      value={confirmPassword}
                    />
                  </View>

                  <Pressable
                    disabled={submitting}
                    onPress={handleUpdatePassword}
                    style={styles.submitButton}>
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitButtonText}>Update password</Text>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Email address</Text>
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      placeholder=""
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                      value={email}
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Password</Text>
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={setPassword}
                      placeholder=""
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      style={styles.input}
                      value={password}
                    />
                  </View>

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
                      <Pressable onPress={handleForgotPassword}>
                        <Text style={styles.secondaryLink}>Forgot password?</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={styles.bottomSection}>
            <Pressable
              onPress={() => {
                setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                setRecoveryReady(false);
                setRecoveryChecked(false);
              }}
              style={styles.outlineButton}>
              <Text numberOfLines={1} style={styles.outlineButtonText}>
                {mode === 'sign-in' ? 'Create new account' : 'Have an account? Log in'}
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
    fontFamily: 'AtkinsonHyperlegibleMono_700Bold',
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
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: '#E5E7EB',
    fontFamily: 'AtkinsonHyperlegibleMono_400Regular',
    fontSize: 13,
    paddingLeft: 4,
  },
  recoveryTitle: {
    color: '#F8FAFC',
    fontFamily: 'AtkinsonHyperlegibleMono_700Bold',
    fontSize: 22,
    marginBottom: 4,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: '#D1D5DB',
    borderRadius: 16,
    borderWidth: 1,
    color: '#111827',
    fontFamily: 'AtkinsonHyperlegibleMono_400Regular',
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
    fontFamily: 'AtkinsonHyperlegibleMono_700Bold',
    fontSize: 17,
  },
  secondaryLink: {
    color: '#E5E7EB',
    fontFamily: 'AtkinsonHyperlegibleMono_400Regular',
    fontSize: 15,
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
    paddingHorizontal: 18,
    width: '100%',
  },
  outlineButtonText: {
    color: '#3B7C60',
    fontFamily: 'AtkinsonHyperlegibleMono_700Bold',
    fontSize: 13,
    letterSpacing: 0.2,
    textAlign: 'center',
    width: '100%',
  },
  loader: {
    alignItems: 'center',
    backgroundColor: '#3d403b',
    flex: 1,
    justifyContent: 'center',
  },
});
