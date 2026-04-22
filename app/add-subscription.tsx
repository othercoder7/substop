import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Fonts } from '@/constants/theme';
import {
  billingCycleLabels,
  billingCycleOptions,
  categoryLabels,
  categoryOptions,
  type BillingCycle,
  type SubscriptionCategory,
} from '@/lib/subscriptions';
import { supabase } from '@/lib/supabase';

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error ? error.message : undefined;
    const maybeDetails = 'details' in error ? error.details : undefined;
    const maybeHint = 'hint' in error ? error.hint : undefined;

    const parts = [maybeMessage, maybeDetails, maybeHint].filter(
      (part): part is string => typeof part === 'string' && part.trim().length > 0
    );

    if (parts.length > 0) {
      return parts.join('\n');
    }
  }

  return 'Something went wrong.';
}

export default function AddSubscriptionScreen() {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [renewalDate, setRenewalDate] = useState(todayString());
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [category, setCategory] = useState<SubscriptionCategory>('other');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmedName = name.trim();
    const parsedAmount = Number(amount);

    if (!trimmedName) {
      Alert.alert('Missing name', 'Give this subscription a name.');
      return;
    }

    if (!amount || Number.isNaN(parsedAmount) || parsedAmount < 0) {
      Alert.alert('Invalid amount', 'Enter a valid subscription amount.');
      return;
    }

    if (!renewalDate) {
      Alert.alert('Missing renewal date', 'Add the next renewal date.');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user?.id) {
        throw new Error('You need to be signed in to add subscriptions.');
      }

      const { error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        name: trimmedName,
        amount: parsedAmount,
        renewal_date: renewalDate,
        billing_cycle: billingCycle,
        category,
        notes: notes.trim() || null,
      });

      if (error) {
        throw error;
      }

      router.replace('/(tabs)');
    } catch (error) {
      const message = getErrorMessage(error);
      Alert.alert('Could not save subscription', message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
          <View style={styles.header}>
            <Text style={styles.kicker}>New subscription</Text>
            <Text style={styles.title}>Add a subscription to track.</Text>
            <Text style={styles.subtitle}>
              Keep this first version simple. You can always edit details later.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput onChangeText={setName} style={styles.input} value={name} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setAmount}
                style={styles.input}
                value={amount}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Renewal date</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={setRenewalDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={renewalDate}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Billing cycle</Text>
              <View style={styles.optionGrid}>
                {billingCycleOptions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setBillingCycle(option)}
                    style={[
                      styles.optionChip,
                      billingCycle === option && styles.optionChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.optionChipText,
                        billingCycle === option && styles.optionChipTextActive,
                      ]}>
                      {billingCycleLabels[option]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.optionGrid}>
                {categoryOptions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setCategory(option)}
                    style={[styles.optionChip, category === option && styles.optionChipActive]}>
                    <Text
                      style={[
                        styles.optionChipText,
                        category === option && styles.optionChipTextActive,
                      ]}>
                      {categoryLabels[option]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                multiline
                onChangeText={setNotes}
                style={[styles.input, styles.notesInput]}
                textAlignVertical="top"
                value={notes}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
          <Pressable disabled={saving} onPress={handleSave} style={styles.primaryButton}>
            {saving ? (
              <ActivityIndicator color="#10231A" />
            ) : (
              <Text style={styles.primaryButtonText}>Save subscription</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F5F7F4',
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  screen: {
    backgroundColor: '#F5F7F4',
    flex: 1,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    backgroundColor: '#10231A',
    borderRadius: 28,
    gap: 10,
    padding: 22,
  },
  kicker: {
    color: '#80ba9d',
    fontFamily: Fonts.monoBold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#F8FAFC',
    fontFamily: Fonts.monoBold,
    fontSize: 30,
    lineHeight: 34,
  },
  subtitle: {
    color: '#D7E9DE',
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 18,
    padding: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    color: '#111827',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  notesInput: {
    minHeight: 110,
    paddingTop: 14,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionChipActive: {
    backgroundColor: '#80ba9d',
  },
  optionChipText: {
    color: '#374151',
    fontFamily: Fonts.sans,
    fontSize: 13,
  },
  optionChipTextActive: {
    color: '#10231A',
    fontFamily: Fonts.monoBold,
  },
  footer: {
    backgroundColor: '#F5F7F4',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#D1D5DB',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButtonText: {
    color: '#374151',
    fontFamily: Fonts.monoBold,
    fontSize: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#80ba9d',
    borderRadius: 999,
    flex: 1.3,
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonText: {
    color: '#10231A',
    fontFamily: Fonts.monoBold,
    fontSize: 14,
  },
});
