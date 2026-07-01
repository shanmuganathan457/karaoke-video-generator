/**
 * Subscription / Pricing Screen
 * Shows Free, Pro, and Enterprise plans with a feature comparison table.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

const FREE_FEATURES = ['5 Songs / month', 'Standard AI Vocals', 'No Watermark'];
const PRO_FEATURES = ['Unlimited Videos', 'No Watermark', 'Vocal Removal', 'Multi-track Recording'];
const ENT_FEATURES = ['Studio Licensing', 'API Access', '24/7 Support'];

const COMPARE = [
  { feature: 'AI Voice Correction', free: 'Basic', pro: 'Advanced' },
  { feature: 'Audio Export Quality', free: '128kbps', pro: 'Lossless' },
  { feature: 'Background Styles', free: '3 Styles', pro: 'Unlimited' },
  { feature: 'Collaborative Duets', free: false, pro: true },
];

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const [isYearly, setIsYearly] = useState(false);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={s.backText}>KaraokeAI</Text>
        </TouchableOpacity>

        {/* Hero */}
        <Text style={s.heroTitle}>Elevate Your Voice</Text>
        <Text style={s.heroSub}>Unlock professional AI tools and studio-quality processing for your performances.</Text>

        {/* Toggle */}
        <View style={s.toggleRow}>
          <Text style={[s.toggleLabel, !isYearly && s.toggleActive]}>Monthly</Text>
          <Switch
            value={isYearly}
            onValueChange={setIsYearly}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.pureWhite}
            style={{ marginHorizontal: 10 }}
          />
          <Text style={[s.toggleLabel, isYearly && s.toggleActive]}>Yearly</Text>
          {isYearly && <View style={s.saveBadge}><Text style={s.saveBadgeText}>SAVE 20%</Text></View>}
        </View>

        {/* Free Plan */}
        <View style={s.planCard}>
          <Text style={s.planName}>Free</Text>
          <Text style={s.planPrice}>₹0<Text style={s.planPer}>/mo</Text></Text>
          {FREE_FEATURES.map((f) => (
            <View key={f} style={s.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
          <TouchableOpacity style={s.currentPlanBtn}>
            <Text style={s.currentPlanText}>Current Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Pro Plan */}
        <View style={[s.planCard, s.proPlanCard]}>
          <View style={s.mostPopularBadge}>
            <Text style={s.mostPopularText}>MOST POPULAR</Text>
          </View>
          <Text style={[s.planName, { color: '#fff' }]}>Pro</Text>
          <Text style={[s.planPrice, { color: '#fff' }]}>
            ₹{isYearly ? '239' : '299'}<Text style={[s.planPer, { color: '#DDD6FE' }]}>/mo</Text>
          </Text>
          {PRO_FEATURES.map((f) => (
            <View key={f} style={s.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#A78BFA" />
              <Text style={[s.featureText, { color: '#EDE9FE' }]}>{f}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={s.premiumBtn}
            onPress={() => router.push('/subscription/review')}
          >
            <Text style={s.premiumBtnText}>Go Premium</Text>
          </TouchableOpacity>
        </View>

        {/* Enterprise Plan */}
        <View style={s.planCard}>
          <Text style={[s.planName, { fontSize: 14, color: '#6B7280' }]}>Enterprise</Text>
          <Text style={[s.planPrice, { fontSize: 32 }]}>Custom</Text>
          {ENT_FEATURES.map((f) => (
            <View key={f} style={s.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Compare Features */}
        <Text style={s.compareTitle}>Compare Features</Text>
        <View style={s.compareTable}>
          <View style={[s.compareRow, s.compareHeader]}>
            <Text style={[s.compareCell, { flex: 2, fontWeight: '700', color: '#6B7280' }]}>Feature</Text>
            <Text style={[s.compareCell, { fontWeight: '700', color: '#6B7280' }]}>Free</Text>
            <Text style={[s.compareCell, { fontWeight: '700', color: colors.primary }]}>P</Text>
          </View>
          {COMPARE.map((row, i) => (
            <View key={row.feature} style={[s.compareRow, i % 2 === 0 && s.compareAlt]}>
              <Text style={[s.compareCell, { flex: 2, color: '#374151' }]}>{row.feature}</Text>
              <Text style={[s.compareCell, { color: '#9CA3AF' }]}>
                {typeof row.free === 'boolean' ? (row.free ? '✓' : '✗') : row.free}
              </Text>
              <Text style={[s.compareCell, { color: colors.primary, fontWeight: '700' }]}>
                {typeof row.pro === 'boolean' ? (row.pro ? '✓' : '✗') : row.pro}
              </Text>
            </View>
          ))}
        </View>

        {/* Testimonial */}
        <View style={s.testimonial}>
          <View style={s.stars}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Text key={i} style={{ color: colors.primary, fontSize: 14 }}>★</Text>
            ))}
          </View>
          <Text style={s.testimonialText}>
            "The vocal removal feature is actual magic. I can turn any song into a studio session in seconds."
          </Text>
          <View style={s.testimonialAuthor}>
            <View style={s.testimonialAvatar}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>S</Text>
            </View>
            <View>
              <Text style={s.testimonialName}>Sarah J.</Text>
              <Text style={s.testimonialHandle}>@dj.sarah.j</Text>
            </View>
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

  heroTitle: { fontSize: 22, fontWeight: '900', color: colors.primary, textAlign: 'center', marginBottom: 8 },
  heroSub: { fontSize: 13, color: colors.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  toggleLabel: { fontSize: 14, color: colors.textSub, fontWeight: '600' },
  toggleActive: { color: colors.text, fontWeight: '800' },
  saveBadge: { backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  saveBadgeText: { fontSize: 9, fontWeight: '800', color: colors.primary },

  planCard: {
    backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  proPlanCard: {
    backgroundColor: colors.primary,
    borderWidth: 2, borderColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.3,
  },
  mostPopularBadge: {
    position: 'absolute', top: -1, right: 20,
    backgroundColor: '#F59E0B', borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  mostPopularText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  planName: { fontSize: 14, fontWeight: '700', color: colors.textSub, marginBottom: 4 },
  planPrice: { fontSize: 36, fontWeight: '900', color: colors.text, marginBottom: 14 },
  planPer: { fontSize: 14, fontWeight: '500', color: colors.textSub },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  currentPlanBtn: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginTop: 8,
  },
  currentPlanText: { fontSize: 14, fontWeight: '700', color: colors.textSub },
  premiumBtn: {
    backgroundColor: colors.card, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  premiumBtnText: { fontSize: 14, fontWeight: '800', color: colors.primary },

  compareTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 16 },
  compareTable: { backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  compareRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16 },
  compareHeader: { borderBottomWidth: 1, borderBottomColor: colors.border },
  compareAlt: { backgroundColor: colors.background },
  compareCell: { flex: 1, fontSize: 12, color: colors.text },

  testimonial: { backgroundColor: colors.primaryLight, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  stars: { flexDirection: 'row', gap: 2, marginBottom: 10 },
  testimonialText: { fontSize: 13, color: colors.text, lineHeight: 20, fontStyle: 'italic', marginBottom: 16 },
  testimonialAuthor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  testimonialAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  testimonialName: { fontSize: 13, fontWeight: '700', color: colors.text },
  testimonialHandle: { fontSize: 11, color: colors.textSub },
});
