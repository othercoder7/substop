import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useSession } from '@/components/session-provider';
import { Fonts } from '@/constants/theme';
import {
  createSubscriptionFromImportCandidate,
  fetchImportCandidates,
  fetchImportConnections,
  rejectImportCandidate,
  syncImportConnection,
  type ImportCandidate,
  type ImportConnection,
} from '@/lib/email-import';
import { formatCurrency } from '@/lib/subscriptions';

export default function EmailImportScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(null);
  const [actingCandidateId, setActingCandidateId] = useState<string | null>(null);
  const [connections, setConnections] = useState<ImportConnection[]>([]);
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const topSpacerHeight = Math.max(12, Math.min(Math.round(height * 0.08), 72));

  const loadImportState = useCallback(async () => {
    if (!session?.user.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [nextConnections, nextCandidates] = await Promise.all([
        fetchImportConnections(session.user.id),
        fetchImportCandidates(session.user.id),
      ]);

      setConnections(nextConnections);
      setCandidates(nextCandidates);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadImportState();
    }, [loadImportState])
  );

  async function handleConnectGmail() {
    if (!session?.user.id || connecting) {
      return;
    }

    setConnecting(true);

    try {
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
      const appRedirectUri = Linking.createURL('/email-import-callback');
      const response = await fetch(
        `${apiBaseUrl}/api/email-import/google/start?app_redirect_uri=${encodeURIComponent(appRedirectUri)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const responseText = await response.text();

        try {
          const payload = JSON.parse(responseText) as { error?: string };
          throw new Error(payload.error ?? `Could not start Gmail connection. (${response.status})`);
        } catch {
          const snippet = responseText.trim().slice(0, 180);
          throw new Error(
            snippet.length > 0
              ? `Could not start Gmail connection. (${response.status}) ${snippet}`
              : `Could not start Gmail connection. (${response.status})`
          );
        }
      }

      const data = (await response.json()) as { authUrl?: string; error?: string };

      if (!data.authUrl) {
        throw new Error(data.error ?? 'Missing Gmail authorization URL.');
      }

      await WebBrowser.openAuthSessionAsync(data.authUrl, appRedirectUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Could not connect Gmail', message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleSyncConnection(connectionId: string) {
    if (!session?.access_token || syncingConnectionId) {
      return;
    }

    setSyncingConnectionId(connectionId);

    try {
      const result = await syncImportConnection(connectionId, session.access_token);
      await loadImportState();
      Alert.alert(
        'Inbox scanned',
        `Scanned ${result.scannedCount} email${result.scannedCount === 1 ? '' : 's'} and found ${result.candidateCount} likely subscription${result.candidateCount === 1 ? '' : 's'}.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Could not scan Gmail', message);
    } finally {
      setSyncingConnectionId(null);
    }
  }

  async function handleApproveCandidate(candidate: ImportCandidate) {
    if (actingCandidateId) {
      return;
    }

    if (candidate.amount == null || !candidate.renewal_date) {
      router.push({
        pathname: '/add-subscription',
        params: {
          name: candidate.merchant_name,
          amount: candidate.amount != null ? String(candidate.amount) : '',
          renewalDate: candidate.renewal_date ?? '',
          billingCycle: candidate.billing_cycle ?? 'monthly',
          notes: candidate.raw_subject ?? candidate.raw_snippet ?? '',
          sourceCandidateId: candidate.id,
        },
      });
      return;
    }

    setActingCandidateId(candidate.id);

    try {
      await createSubscriptionFromImportCandidate(candidate, {
        amount: Number(candidate.amount),
        renewalDate: candidate.renewal_date,
        billingCycle: candidate.billing_cycle,
      });
      await loadImportState();
      Alert.alert('Subscription added', `${candidate.merchant_name} was added to your subscriptions.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Could not add subscription', message);
    } finally {
      setActingCandidateId(null);
    }
  }

  async function handleRejectCandidate(candidateId: string) {
    if (actingCandidateId) {
      return;
    }

    setActingCandidateId(candidateId);

    try {
      await rejectImportCandidate(candidateId);
      await loadImportState();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Could not reject suggestion', message);
    } finally {
      setActingCandidateId(null);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}>
      <View style={{ height: topSpacerHeight }} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Email import</Text>
        <Text style={styles.title}>Connect Gmail</Text>
        <Text style={styles.copy}>
          Start with Gmail so SubStop can detect receipts and renewal emails after the user gives permission.
        </Text>
      </View>

      <Pressable disabled={connecting} onPress={handleConnectGmail} style={styles.connectButton}>
        {connecting ? (
          <ActivityIndicator color="#10231A" />
        ) : (
          <Text style={styles.connectButtonText}>Connect Gmail</Text>
        )}
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inbox connections</Text>
        {loading ? (
          <View style={styles.stateRow}>
            <ActivityIndicator color="#80ba9d" />
          </View>
        ) : errorMessage ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>Could not load import state.</Text>
            <Text selectable style={styles.stateSubtext}>
              {errorMessage}
            </Text>
          </View>
        ) : connections.length === 0 ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>No inbox connected yet.</Text>
            <Text style={styles.stateSubtext}>
              Once Gmail is connected, it will appear here and start surfacing subscription candidates.
            </Text>
          </View>
        ) : (
          connections.map((connection) => (
            <View key={connection.id} style={styles.row}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>
                  {connection.connected_email ?? 'Gmail inbox'}
                </Text>
                <Text style={styles.rowMeta}>
                  {connection.provider.toUpperCase()} • {connection.status}
                </Text>
                {connection.last_synced_at ? (
                  <Text style={styles.rowMeta}>Last scan: {connection.last_synced_at.slice(0, 10)}</Text>
                ) : null}
                {connection.error_message ? (
                  <Text selectable style={styles.errorText}>
                    {connection.error_message}
                  </Text>
                ) : null}
              </View>
              {connection.status === 'connected' ? (
                <Pressable
                  disabled={syncingConnectionId === connection.id}
                  onPress={() => handleSyncConnection(connection.id)}
                  style={styles.inlineButton}>
                  {syncingConnectionId === connection.id ? (
                    <ActivityIndicator color="#10231A" />
                  ) : (
                    <Text style={styles.inlineButtonText}>Scan inbox</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detected subscriptions</Text>
        {loading ? (
          <View style={styles.stateRow}>
            <ActivityIndicator color="#80ba9d" />
          </View>
        ) : candidates.length === 0 ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>No candidates yet.</Text>
            <Text style={styles.stateSubtext}>
              When import runs, likely subscriptions will land here for the user to review before saving.
            </Text>
          </View>
        ) : (
          candidates.map((candidate) => (
            <View key={candidate.id} style={styles.candidateCard}>
              <Text style={styles.rowTitle}>{candidate.merchant_name}</Text>
              <Text style={styles.rowMeta}>
                {candidate.amount != null && candidate.currency_code
                  ? formatCurrency(Number(candidate.amount), candidate.currency_code)
                  : 'Amount unknown'}
                {candidate.renewal_date ? ` • ${candidate.renewal_date}` : ''}
              </Text>
              {candidate.raw_subject ? (
                <Text numberOfLines={2} style={styles.stateSubtext}>
                  {candidate.raw_subject}
                </Text>
              ) : null}
              <Text style={styles.statusBadge}>{candidate.status.toUpperCase()}</Text>
              {candidate.status === 'pending' ? (
                <View style={styles.candidateActions}>
                  <Pressable
                    disabled={actingCandidateId === candidate.id}
                    onPress={() => handleApproveCandidate(candidate)}
                    style={styles.inlineButton}>
                    {actingCandidateId === candidate.id ? (
                      <ActivityIndicator color="#10231A" />
                    ) : (
                      <Text style={styles.inlineButtonText}>
                        {candidate.amount != null && candidate.renewal_date ? 'Add subscription' : 'Review details'}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    disabled={actingCandidateId === candidate.id}
                    onPress={() => handleRejectCandidate(candidate.id)}
                    style={styles.rejectButton}>
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))
        )}
      </View>

      <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F7F4',
    flex: 1,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: '#7C2D12',
    fontFamily: Fonts.monoBold,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 34,
    lineHeight: 38,
  },
  copy: {
    color: '#4B5563',
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 21,
  },
  connectButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#80ba9d',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  connectButtonText: {
    color: '#10231A',
    fontFamily: Fonts.monoBold,
    fontSize: 14,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 12,
    padding: 18,
  },
  sectionTitle: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 18,
  },
  stateRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  stateBlock: {
    gap: 8,
  },
  stateText: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 15,
  },
  stateSubtext: {
    color: '#6B7280',
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    gap: 12,
    padding: 14,
  },
  rowCopy: {
    gap: 4,
  },
  rowTitle: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 15,
  },
  rowMeta: {
    color: '#6B7280',
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: '#B91C1C',
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  candidateCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    gap: 4,
    padding: 14,
  },
  candidateActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    color: '#374151',
    fontFamily: Fonts.monoBold,
    fontSize: 11,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 13,
  },
  inlineButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#80ba9d',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
  },
  inlineButtonText: {
    color: '#10231A',
    fontFamily: Fonts.monoBold,
    fontSize: 12,
  },
  rejectButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
  },
  rejectButtonText: {
    color: '#991B1B',
    fontFamily: Fonts.monoBold,
    fontSize: 12,
  },
});
