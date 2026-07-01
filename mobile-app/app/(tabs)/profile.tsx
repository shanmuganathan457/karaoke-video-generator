/**
 * Profile Screen – Real user settings, subscription info, and logout.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

// ─── SERVICES ──────────────────────────────────────────────────────────────
import { getMe, logout } from '../../services/auth';
import { User } from '../../services/authStore';
import { useTheme, ThemeColors } from '../../context/ThemeContext';



export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
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
          console.error('Error fetching profile:', err);
          if (active) {
            setLoading(false);
            router.replace('/onboarding');
          }
        }
      }

      fetchProfile();

      return () => {
        active = false;
      };
    }, [])
  );

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/onboarding');
          } catch (err) {
            console.error('Failed to log out:', err);
            router.replace('/onboarding');
          }
        },
      },
    ]);
  };

  const SETTINGS = [
    { icon: 'globe-outline', label: 'Language', value: 'English', screen: null, action: null },
    { icon: 'card-outline', label: 'Subscription Plan', value: user?.plan || 'Free', screen: '/subscription', action: null },
    { icon: 'analytics-outline', label: 'Usage & Credits', value: `${user?.tokens ?? 0} tokens left`, screen: '/(tabs)/analytics', action: null },
    { icon: 'notifications-outline', label: 'Notifications', value: '', screen: null, action: null },
    { icon: 'lock-closed-outline', label: 'Privacy Policy', value: '', screen: null, action: null },
    { icon: 'color-palette-outline', label: 'Theme', value: isDark ? 'Dark Mode' : 'Light Mode', screen: null, action: toggleTheme },
    { icon: 'help-circle-outline', label: 'Help & Support', value: '', screen: null, action: null },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[s.root, s.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
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

        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatarWrap}>
            <View style={s.avatarImg}>
              <Text style={s.avatarLetter}>
                {(user?.name || 'M')[0].toUpperCase()}
              </Text>
            </View>
            {user?.plan && user.plan !== 'Free' && (
              <View style={s.proBadge}>
                <Text style={s.proBadgeText}>{user.plan.toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={s.name}>{user?.name || 'Musician'}</Text>
          <Text style={s.email}>{user?.email || 'email@example.com'}</Text>
        </View>

        {/* Settings */}
        <Text style={s.sectionTitle}>SETTINGS</Text>
        <View style={s.card}>
          {SETTINGS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.row, i < SETTINGS.length - 1 && s.rowBorder]}
              onPress={() => item.action ? item.action() : item.screen ? router.push(item.screen as any) : null}
            >
              <View style={s.rowLeft}>
                <View style={s.rowIconWrap}>
                  <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={s.rowLabel}>{item.label}</Text>
              </View>
              <View style={s.rowRight}>
                {item.value ? (
                  <Text style={s.rowValue}>{item.value}</Text>
                ) : null}
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={s.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginBottom: 16 },
  logo: { fontSize: 18, fontWeight: '800', color: colors.text },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarImg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.primaryLight,
  },
  avatarLetter: { fontSize: 32, fontWeight: '800', color: colors.pureWhite },
  proBadge: {
    position: 'absolute', bottom: 2, right: -4,
    backgroundColor: '#F59E0B', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  proBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  email: { fontSize: 13, color: colors.textSub },

  sectionTitle: { fontSize: 10, fontWeight: '800', color: colors.textSub, letterSpacing: 1.5, marginBottom: 10 },
  card: {
    backgroundColor: colors.card, borderRadius: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 13, color: colors.textSub },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderColor: colors.dangerLight,
    borderRadius: 14, paddingVertical: 16, backgroundColor: colors.dangerLight,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: colors.danger, letterSpacing: 0.5 },
});
