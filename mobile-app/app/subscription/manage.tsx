/**
 * Manage Subscription Screen
 * Shows active subscription details, payment history, and support links.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

// ─── SERVICES ──────────────────────────────────────────────────────────────
import { getMe, subscribeToPlan } from '../../services/auth';
import { User } from '../../services/authStore';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

export default function ManageSubscriptionScreen() {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchUserSession = async () => {
    try {
      const u = await getMe();
      setUser(u);
    } catch (err) {
      console.error('Failed to load user info:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchUserSession();
    }, [])
  );

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your Pro subscription? You will lose access to premium features immediately.',
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              const updated = await subscribeToPlan('Free');
              setUser(updated);
              Alert.alert('Subscription Cancelled', 'Your plan has been downgraded to Free.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel subscription.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.root, s.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const isFree = !user?.plan || user.plan === 'Free';

  const HISTORY = isFree
    ? [{ date: 'Today', plan: 'Free Plan Active', amount: '₹0' }]
    : [
        { date: 'Just now', plan: `${user?.plan} Subscription`, amount: user?.plan === 'Pro' ? '₹999' : 'Custom' },
        { date: 'Account Creation', plan: 'Free Trial Signup', amount: '₹0' }
      ];

  return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/(tabs)/profile')} disabled={submitting}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={s.backText}>Back to Profile</Text>
        </TouchableOpacity>

        <Text style={s.pageTitle}>Subscription</Text>
        <Text style={s.pageSub}>Manage your plan, payments, and billing preferences.</Text>

        {/* Current Plan */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardLabel}>CURRENT PLAN</Text>
            <View style={[s.activeBadge, { backgroundColor: isFree ? colors.textSub : colors.primary }]}>
              <Text style={s.activeBadgeText}>
                {isFree ? 'Basic' : 'Active'}
              </Text>
            </View>
          </View>
          <Text style={s.planName}>{user?.plan || 'Free'}</Text>

          <View style={s.detailRow}>
            <Ionicons name="flash-outline" size={16} color={colors.primary} />
            <Text style={s.detailText}>
              Available balance: <Text style={{ fontWeight: '600', color: colors.text }}>{user?.tokens ?? 0} tokens</Text>
            </Text>
          </View>

          {!isFree && (
            <>
              <View style={s.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={s.detailText}>Next renewal: <Text style={{ fontWeight: '600', color: colors.text }}>In 30 days</Text></Text>
              </View>
              <View style={s.detailRow}>
                <Ionicons name="card-outline" size={16} color={colors.primary} />
                <Text style={s.detailText}>Billed via Card Ending in <Text style={{ fontWeight: '600', color: colors.text }}>4242</Text></Text>
              </View>
            </>
          )}

          {isFree ? (
            <TouchableOpacity style={s.upgradeBtn} onPress={() => router.push('/subscription')}>
              <Text style={s.upgradeBtnText}>Upgrade Plan ⚡</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.actionRow}>
              <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/subscription')} disabled={submitting}>
                <Text style={s.actionBtnText}>Change Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { borderColor: colors.dangerLight }]}
                onPress={handleCancelSubscription}
                disabled={submitting}
              >
                <Text style={[s.actionBtnText, { color: colors.danger }]}>Cancel Plan</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Payment History */}
        <View style={s.historyHeader}>
          <Text style={s.historyTitle}>Payment History</Text>
        </View>

        <View style={s.historyCard}>
          {HISTORY.map((item, i) => (
            <View key={i} style={[s.historyRow, i < HISTORY.length - 1 && s.historyBorder]}>
              <View style={s.historyLeft}>
                <View style={s.historyIcon}>
                  <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                </View>
                <View>
                  <Text style={s.historyDate}>{item.date}</Text>
                  <Text style={s.historyPlan}>{item.plan} • {item.amount}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Support */}
        <View style={s.supportCard}>
          <View style={s.supportHeader}>
            <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
            <Text style={s.supportTitle}>Need help with billing?</Text>
          </View>
          <Text style={s.supportText}>
            Our support team is available 24/7 to help you with plan transitions or refund requests.
          </Text>
          <TouchableOpacity style={s.supportLinkBtn}>
            <Text style={s.supportLink}>Contact Billing Support →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, marginBottom: 20 },
  backText: { fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: 4 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 },
  pageSub: { fontSize: 13, color: colors.textSub, marginBottom: 24, lineHeight: 20 },

  card: {
    backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardLabel: { fontSize: 11, fontWeight: '800', color: colors.textSub, letterSpacing: 1 },
  activeBadge: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  activeBadgeText: { fontSize: 10, fontWeight: '700', color: colors.pureWhite },
  planName: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 16 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  detailText: { fontSize: 13, color: colors.text },

  upgradeBtn: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 12, marginBottom: 12,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  upgradeBtnText: { fontSize: 14, fontWeight: '800', color: colors.pureWhite },

  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSub },

  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  historyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },

  historyCard: {
    backgroundColor: colors.card, borderRadius: 20, marginBottom: 24, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  historyBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  historyDate: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  historyPlan: { fontSize: 11, color: colors.textSub },

  supportCard: { backgroundColor: colors.primaryLight, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  supportHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  supportTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  supportText: { fontSize: 13, color: colors.textSub, lineHeight: 20, marginBottom: 16 },
  supportLinkBtn: { alignSelf: 'flex-start' },
  supportLink: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
