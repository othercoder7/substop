import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useSession } from '@/components/session-provider';

const subscriptions = [
  { name: 'Spotify', amount: '$10.99', due: 'Apr 24', tint: '#DBEAFE' },
  { name: 'Notion AI', amount: '$10.00', due: 'Apr 27', tint: '#FDE68A' },
  { name: 'Netflix', amount: '$15.49', due: 'May 02', tint: '#FECACA' },
];

const stats = [
  { label: 'Monthly spend', value: '$36.48' },
  { label: 'Renewing soon', value: '2' },
  { label: 'Tracked plans', value: '3' },
];

export default function OverviewScreen() {
  const { session } = useSession();

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>SubStop overview</Text>
        <Text style={styles.title}>Your subscriptions, before they surprise you.</Text>
        <Text style={styles.subtitle}>
          Signed in as {session?.user.email ?? 'unknown'}.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>This month</Text>
        <Text style={styles.summaryValue}>$36.48</Text>
        <Text style={styles.summaryHint}>Two renewals are coming up in the next 7 days.</Text>
      </View>

      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming renewals</Text>
        {subscriptions.map((subscription) => (
          <View key={subscription.name} style={styles.subscriptionRow}>
            <View style={[styles.subscriptionBadge, { backgroundColor: subscription.tint }]} />
            <View style={styles.subscriptionCopy}>
              <Text style={styles.subscriptionName}>{subscription.name}</Text>
              <Text style={styles.subscriptionMeta}>Renews {subscription.due}</Text>
            </View>
            <Text style={styles.subscriptionAmount}>{subscription.amount}</Text>
          </View>
        ))}
      </View>
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
  hero: {
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
  summaryCard: {
    backgroundColor: '#F1E8D8',
    borderRadius: 24,
    gap: 8,
    padding: 20,
  },
  summaryLabel: {
    color: '#7C2D12',
    fontFamily: Fonts.monoBold,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 36,
  },
  summaryHint: {
    color: '#57534E',
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 21,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flex: 1,
    gap: 6,
    padding: 16,
  },
  statValue: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 22,
  },
  statLabel: {
    color: '#6B7280',
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 14,
    padding: 18,
  },
  sectionTitle: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 18,
  },
  subscriptionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  subscriptionBadge: {
    borderRadius: 9,
    height: 18,
    width: 18,
  },
  subscriptionCopy: {
    flex: 1,
    gap: 2,
  },
  subscriptionName: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 16,
  },
  subscriptionMeta: {
    color: '#6B7280',
    fontFamily: Fonts.sans,
    fontSize: 13,
  },
  subscriptionAmount: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 15,
  },
});
