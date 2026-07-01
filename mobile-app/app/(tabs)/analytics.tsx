/**
 * Analytics / Usage & Credits Screen
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

// ─── SERVICES ──────────────────────────────────────────────────────────────
import { getMe } from '../../services/auth';
import { User } from '../../services/authStore';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const { colors } = useTheme();
  const c = color || colors.primary;
  const pct = Math.min(value / max, 1);
  return (
    <View style={[pb.track, { backgroundColor: colors.border }]}>
      <View style={[pb.fill, { width: `${pct * 100}%` as any, backgroundColor: c }]} />
    </View>
  );
}

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const s = getStyles(colors);
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      async function fetchProfile() {
        try {
          const u = await getMe();
          if (active) {
            setUser(u);
            setLoading(false);
          }
        } catch (err) {
          console.error('Error fetching profile for analytics:', err);
          if (active) {
            setLoading(false);
          }
        }
      }

      fetchProfile();

      return () => {
        active = false;
      };
    }, [])
  );

  const maxTokens = user?.plan === 'Enterprise' ? 1000 : user?.plan === 'Pro' ? 100 : 5;
  const remainingTokens = user?.tokens ?? 0;
  const usedTokens = Math.max(0, maxTokens - remainingTokens);

  if (loading) {
    return (
      <SafeAreaView style={[s.root, s.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const TRANSACTIONS = [
    { label: 'Standard Video Processing', date: 'Just now', amount: '-1 Token', color: '#EF4444' },
    { label: 'Welcome Allocation', date: 'Account creation', amount: `+5 Tokens`, color: '#10B981' },
  ];

  if (user?.plan && user.plan !== 'Free') {
    TRANSACTIONS.unshift({
      label: `${user.plan} Plan Top-up`,
      date: 'Plan activation',
      amount: `+${maxTokens} Tokens`,
      color: '#10B981',
    });
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.logo}>KaraokeAI</Text>
          <TouchableOpacity style={s.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
            <View style={s.avatarSmall}>
              <Text style={s.avatarText}>{(user?.name || 'M')[0].toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={s.pageTitle}>Usage & Credits</Text>
        <Text style={s.pageSub}>Track your AI resources and workspace health.</Text>

        {/* AI Credits */}
        <View style={s.statsCard}>
          <View style={s.statRow}>
            <View style={s.statLeft}>
              <View style={s.statIcon}>
                <Ionicons name="flash-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={s.statTitle}>Remaining Tokens</Text>
                <Text style={s.statValue}>{remainingTokens} / {maxTokens} available</Text>
              </View>
            </View>
            <View style={s.proPlanBadge}>
              <Text style={s.proPlanText}>{user?.plan || 'Free'} Plan</Text>
            </View>
          </View>
          <ProgressBar value={remainingTokens} max={maxTokens} />
          <Text style={s.renewText}>Usage: {usedTokens} tokens consumed this billing cycle</Text>
        </View>

        {/* Workspace Health / Video Generations */}
        <View style={s.statsCard}>
          <View style={s.statRow}>
            <View style={s.statLeft}>
              <View style={s.statIcon}>
                <Ionicons name="film-outline" size={18} color="#60A5FA" />
              </View>
              <View>
                <Text style={s.statTitle}>Generated Videos</Text>
                <Text style={s.statValue}>{user?.project_count ?? 0} projects generated</Text>
              </View>
            </View>
          </View>
          <ProgressBar value={user?.project_count ?? 0} max={100} color="#60A5FA" />
        </View>

        {/* Upgrade Banner */}
        <View style={s.upgradeBanner}>
          <View style={s.rocketWrap}>
            <Text style={{ fontSize: 32 }}>🚀</Text>
          </View>
          <Text style={s.upgradeTitle}>Unlock Unlimited{'\n'}Creativity</Text>
          <Text style={s.upgradeSub}>Upgrade to Studio Pro or Enterprise for additional AI credits, advanced separation algorithms, and priority speed.</Text>
          <TouchableOpacity style={s.upgradeBtn} onPress={() => router.push('/subscription')}>
            <Text style={s.upgradeBtnText}>Upgrade to Pro / Enterprise</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={s.txHeader}>
          <Text style={s.sectionTitle}>TOKEN HISTORY</Text>
        </View>
        <View style={s.txCard}>
          {TRANSACTIONS.map((tx, i) => (
            <View key={i} style={[s.txRow, i < TRANSACTIONS.length - 1 && s.txBorder]}>
              <View style={s.txLeft}>
                <View style={s.txIcon}>
                  <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                </View>
                <View>
                  <Text style={s.txLabel}>{tx.label}</Text>
                  <Text style={s.txDate}>{tx.date}</Text>
                </View>
              </View>
              <Text style={[s.txAmount, { color: tx.color }]}>{tx.amount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const pb = StyleSheet.create({
  track: { width: '100%', height: 6, backgroundColor: '#F3F4F6', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 4 },
});

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginBottom: 16 },
  logo: { fontSize: 18, fontWeight: '800', color: colors.text },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 },
  pageSub: { fontSize: 13, color: colors.textSub, marginBottom: 20 },

  statsCard: {
    backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  statLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  statTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  statValue: { fontSize: 11, color: colors.textSub, marginTop: 2 },
  proPlanBadge: { backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  proPlanText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  renewText: { fontSize: 10, color: colors.textSub, marginTop: 6 },

  upgradeBanner: {
    backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 24,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  rocketWrap: { marginBottom: 10 },
  upgradeTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  upgradeSub: { fontSize: 12, color: colors.textSub, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  upgradeBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  upgradeBtnText: { fontSize: 13, fontWeight: '700', color: colors.pureWhite },

  sectionTitle: { fontSize: 10, fontWeight: '800', color: colors.textSub, letterSpacing: 1.5, marginBottom: 12 },

  txCard: {
    backgroundColor: colors.card, borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  txRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  txBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  txIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  txLabel: { fontSize: 12, fontWeight: '700', color: colors.text, flex: 1 },
  txDate: { fontSize: 10, color: colors.textSub, marginTop: 2 },
  txAmount: { fontSize: 12, fontWeight: '700' },
});
