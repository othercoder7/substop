import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Fonts } from '@/constants/theme';
import { formatCurrency, monthlyEquivalent, type Subscription } from '@/lib/subscriptions';
import { supabase } from '@/lib/supabase';

export default function MonthlySpendScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const topSpacerHeight = Math.max(12, Math.min(Math.round(height * 0.08), 72));

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .neq('status', 'canceled')
      .order('name', { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setSubscriptions((data ?? []) as Subscription[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSubscriptions();
    }, [loadSubscriptions])
  );

  const chartData = useMemo(() => {
    const rows = subscriptions
      .map((subscription) => ({
        id: subscription.id,
        name: subscription.name,
        monthlyAmount: monthlyEquivalent(subscription),
        currencyCode: subscription.currency_code,
      }))
      .filter((item) => item.monthlyAmount > 0)
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

    const maxValue = rows[0]?.monthlyAmount ?? 0;
    const total = rows.reduce((sum, row) => sum + row.monthlyAmount, 0);

    return { rows, maxValue, total };
  }, [subscriptions]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={{ height: topSpacerHeight }} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Monthly spend</Text>
        <Text style={styles.title}>{formatCurrency(chartData.total, 'USD')}</Text>
      </View>

      {loading ? (
        <View style={styles.stateRow}>
          <ActivityIndicator color="#80ba9d" />
        </View>
      ) : errorMessage ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateText}>Could not load monthly spend.</Text>
          <Text style={styles.stateSubtext}>{errorMessage}</Text>
          <Pressable
            onPress={() => {
              void loadSubscriptions();
            }}
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : chartData.rows.length === 0 ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateText}>No monthly spend yet.</Text>
          <Text style={styles.stateSubtext}>
            Add subscriptions to see your monthly spend chart here.
          </Text>
        </View>
      ) : (
        <View style={styles.chartCard}>
          {chartData.rows.map((row) => {
            const widthPercent =
              chartData.maxValue === 0 ? 0 : Math.max((row.monthlyAmount / chartData.maxValue) * 100, 8);

            return (
              <Pressable
                key={row.id}
                onPress={() => router.push(`/subscription/${row.id}`)}
                style={styles.chartRow}>
                <View style={styles.chartHeader}>
                  <Text numberOfLines={1} style={styles.chartName}>
                    {row.name}
                  </Text>
                  <Text style={styles.chartAmount}>
                    {formatCurrency(row.monthlyAmount, row.currencyCode)}
                  </Text>
                </View>

                <View style={styles.track}>
                  <View style={[styles.bar, { width: `${widthPercent}%` }]} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F7F4',
    flex: 1,
  },
  content: {
    gap: 20,
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
    fontSize: 42,
    lineHeight: 46,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 16,
    padding: 18,
  },
  chartRow: {
    gap: 8,
  },
  chartHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  chartName: {
    color: '#111827',
    flex: 1,
    fontFamily: Fonts.monoBold,
    fontSize: 15,
  },
  chartAmount: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 13,
  },
  track: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    height: 12,
    overflow: 'hidden',
  },
  bar: {
    backgroundColor: '#80ba9d',
    borderRadius: 999,
    height: '100%',
  },
  stateRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
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
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 12,
  },
});
