/**
 * Review Plan Screen – Payment method selection and subscription confirmation.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// ─── SERVICES ──────────────────────────────────────────────────────────────
import { subscribeToPlan } from '../../services/auth';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

type PayMethod = 'upi' | 'card' | 'paypal';

export default function ReviewPlanScreen() {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const [method, setMethod] = useState<PayMethod>('card');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await subscribeToPlan('Pro');
      Alert.alert('Success!', 'You are now subscribed to KaraokeAI Pro!', [
        { text: 'OK', onPress: () => router.replace('/subscription/manage') },
      ]);
    } catch (err: any) {
      Alert.alert('Subscription Failed', err.message || 'Something went wrong processing payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} disabled={loading}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={s.pageTitle}>Review Plan</Text>

        {/* Plan Summary */}
        <View style={s.planSummary}>
          <View style={s.planRow}>
            <View style={s.subscriptionBadge}>
              <Text style={s.subscriptionBadgeText}>SUBSCRIPTION</Text>
            </View>
            <View style={s.billedBadge}>
              <Text style={s.billedBadgeText}>Billed Monthly</Text>
            </View>
          </View>
          <Text style={s.planName}>KaraokeAI Pro</Text>
          <View style={s.divider} />
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Base Price</Text>
            <Text style={s.priceValue}>₹846.61</Text>
          </View>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>GST (18%)</Text>
            <Text style={s.priceValue}>₹152.39</Text>
          </View>
          <View style={s.divider} />
          <View style={s.priceRow}>
            <Text style={s.totalLabel}>Total Price</Text>
            <Text style={s.totalValue}>₹999.00</Text>
          </View>
        </View>

        {/* Payment Method */}
        <Text style={s.sectionTitle}>Payment Method</Text>

        {/* UPI */}
        <TouchableOpacity
          style={[s.methodCard, method === 'upi' && s.methodCardActive]}
          onPress={() => setMethod('upi')}
          disabled={loading}
        >
          <View style={s.methodLeft}>
            <View style={s.upiIcons}>
              <View style={s.upiDot} />
              <View style={[s.upiDot, { backgroundColor: '#374151' }]} />
            </View>
            <Text style={s.methodLabel}>UPI (GPay, PhonePe, Paytm)</Text>
          </View>
          <View style={[s.radio, method === 'upi' && s.radioActive]}>
            {method === 'upi' && <View style={s.radioDot} />}
          </View>
        </TouchableOpacity>

        {/* Credit/Debit Card */}
        <View style={[s.methodCard, method === 'card' && s.methodCardActive]}>
          <TouchableOpacity style={s.methodHeader} onPress={() => setMethod('card')} disabled={loading}>
            <View style={s.methodLeft}>
              <View style={[s.cardIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="card" size={16} color="#fff" />
              </View>
              <Text style={s.methodLabel}>Credit or Debit Card</Text>
            </View>
            <View style={[s.radio, method === 'card' && s.radioActive]}>
              {method === 'card' && <View style={s.radioDot} />}
            </View>
          </TouchableOpacity>

          {method === 'card' && (
            <View style={s.cardForm}>
              <View style={s.cardInputWrap}>
                <TextInput style={{ flex: 1, fontSize: 14 }} placeholder="Card Number*" placeholderTextColor="#C4B5FD" editable={!loading} />
                <Ionicons name="scan-outline" size={16} color="#9CA3AF" />
              </View>
              <View style={s.cardRow}>
                <TextInput style={[s.cardInput, s.cardHalf]} placeholder="MM/YY" placeholderTextColor="#C4B5FD" editable={!loading} />
                <TextInput style={[s.cardInput, s.cardHalf]} placeholder="CVV" placeholderTextColor="#C4B5FD" editable={!loading} secureTextEntry />
              </View>
              <TextInput style={s.cardInput} placeholder="Cardholder Name" placeholderTextColor="#C4B5FD" editable={!loading} />
            </View>
          )}
        </View>

        {/* PayPal */}
        <TouchableOpacity
          style={[s.methodCard, method === 'paypal' && s.methodCardActive]}
          onPress={() => setMethod('paypal')}
          disabled={loading}
        >
          <View style={s.methodLeft}>
            <View style={[s.cardIcon, { backgroundColor: '#003087' }]}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>PP</Text>
            </View>
            <Text style={s.methodLabel}>PayPal</Text>
          </View>
          <View style={[s.radio, method === 'paypal' && s.radioActive]}>
            {method === 'paypal' && <View style={s.radioDot} />}
          </View>
        </TouchableOpacity>

        {/* Subscribe Now */}
        <TouchableOpacity
          style={s.subscribeBtn}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.subscribeBtnText}>Subscribe Now</Text>
          )}
        </TouchableOpacity>

        <Text style={s.disclaimer}>
          By clicking "Subscribe Now", you agree to our Terms of Service and acknowledge that your subscription will renew automatically.
        </Text>

        {/* Trust Badges */}
        <View style={s.trustRow}>
          <View style={s.trustItem}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={s.trustText}>256-bit SSL</Text>
          </View>
          <View style={s.trustItem}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={s.trustText}>PCI Compliant</Text>
          </View>
          <View style={s.trustItem}>
            <Ionicons name="lock-closed" size={14} color="#10B981" />
            <Text style={s.trustText}>Secure Checkout</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, marginBottom: 20 },
  backText: { fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: 4 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 16 },

  planSummary: {
    backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subscriptionBadge: { backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  subscriptionBadgeText: { fontSize: 9, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  billedBadge: { backgroundColor: '#E0F2FE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  billedBadgeText: { fontSize: 10, fontWeight: '700', color: '#0284C7' },
  planName: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priceLabel: { fontSize: 14, color: colors.textSub },
  priceValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: 18, fontWeight: '900', color: colors.primary },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 14 },

  methodCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  methodCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  methodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  methodLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upiIcons: { flexDirection: 'row', gap: 4 },
  upiDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#F59E0B' },
  cardIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  cardForm: { marginTop: 16, gap: 12 },
  cardInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.background,
  },
  cardInput: {
    flex: 1, fontSize: 14, color: colors.text,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.background,
  },
  cardRow: { flexDirection: 'row', gap: 10 },
  cardHalf: { flex: 1 },

  subscribeBtn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', marginTop: 8, marginBottom: 12,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  subscribeBtnText: { fontSize: 16, fontWeight: '800', color: colors.pureWhite },

  disclaimer: { fontSize: 10, color: colors.textSub, textAlign: 'center', lineHeight: 16, marginBottom: 16 },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustText: { fontSize: 10, color: colors.textSub, fontWeight: '600' },
});
