/**
 * Home Screen – Real user dashboard
 * Shows token balance, stats, recent projects, and quick actions.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

// ─── SERVICES ──────────────────────────────────────────────────────────────
import { getMe } from '../../services/auth';
import { listProjects, getThumbnailUrl, Project } from '../../services/projects';

import { API_BASE_URL } from '../../services/api';
import { User } from '../../services/authStore';

const QUICK_ACTIONS = [
  { icon: 'cloud-upload-outline', label: 'Upload Video', route: '/(tabs)/create' },
  { icon: 'folder-outline', label: 'My Projects', route: '/(tabs)/projects' },
  { icon: 'star-outline', label: 'Upgrade Plan', route: '/subscription' },
  { icon: 'person-outline', label: 'My Profile', route: '/(tabs)/profile' },
];

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const s = getStyles(colors);
  
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      async function loadData() {
        try {
          const u = await getMe();
          if (active) setUser(u);

          const plist = await listProjects();
          if (active) {
            setProjects(plist);
            setLoading(false);
          }
        } catch (err) {
          console.error('Error loading home data:', err);
          if (active) {
            setLoading(false);
            // Redirect to onboarding if not logged in
            router.replace('/onboarding');
          }
        }
      }

      loadData();

      return () => {
        active = false;
      };
    }, [])
  );

  const activeProjectsCount = projects.filter(
    (p) => p.status === 'processing' || p.status === 'pending'
  ).length;

  const totalGeneratedCount = projects.filter(
    (p) => p.status === 'completed'
  ).length;

  if (loading) {
    return (
      <SafeAreaView style={[s.root, s.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.logo}>KaraokeAI</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <View style={s.avatarSmall}>
              <Text style={s.avatarText}>{(user?.name || 'M')[0].toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Greeting ── */}
        <View style={s.greetingWrap}>
          <Text style={s.greeting}>Hello, {user?.name || 'Musician'}!</Text>
          <Text style={s.greetingSub}>Ready to create your next masterpiece?</Text>
        </View>

        {/* ── Token Card ── */}
        <View style={s.tokenCard}>
          <View>
            <View style={s.tokenBadgeRow}>
              <View style={s.tokenBadge}>
                <Text style={s.tokenBadgeText}>REMAINING TOKENS</Text>
              </View>
              <TouchableOpacity style={s.upgradeBtn} onPress={() => router.push('/subscription')}>
                <Text style={s.upgradeBtnText}>Upgrade</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.tokenCount}>{user?.tokens ?? 0}</Text>
            <Text style={s.tokenLabel}>Plan: {user?.plan || 'Free'}</Text>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{totalGeneratedCount}</Text>
            <Text style={s.statLabel}>Videos Generated</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{activeProjectsCount}</Text>
            <Text style={s.statLabel}>Active Projects</Text>
          </View>
        </View>

        {/* ── Recent Projects ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Projects</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/projects')}>
            <Text style={s.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {projects.length === 0 ? (
          <TouchableOpacity style={s.emptyCard} onPress={() => router.push('/(tabs)/create')}>
            <Ionicons name="add-circle-outline" size={28} color={PURPLE} style={{ marginBottom: 6 }} />
            <Text style={s.emptyText}>Create your first Karaoke video</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {projects.slice(0, 5).map((p) => (
              <TouchableOpacity
                key={p.id}
                style={s.recentCard}
                onPress={() => {
                  if (p.status === 'completed') {
                    const fullOutputUrl = `${API_BASE_URL}${p.outputUrl}`;
                    router.push({ pathname: '/preview', params: { outputUrl: fullOutputUrl, fileName: p.name, jobId: p.id } });
                  } else {
                    router.push({ pathname: '/processing', params: { jobId: p.id, fileName: p.name } });
                  }
                }}
              >
                <View style={s.recentThumb}>
                  <Image
                    source={{ uri: getThumbnailUrl(p.id) }}
                    style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
                    resizeMode="cover"
                  />
                  
                  {/* Overlay for processing/error states */}
                  {(p.status === 'processing' || p.status === 'pending') && (
                    <View style={s.thumbOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={s.overlayText}>Processing</Text>
                    </View>
                  )}
                  {p.status === 'failed' && (
                    <View style={[s.thumbOverlay, { backgroundColor: 'rgba(239, 68, 68, 0.7)' }]}>
                      <Ionicons name="alert-circle" size={16} color="#fff" />
                      <Text style={s.overlayText}>Failed</Text>
                    </View>
                  )}

                  <Text style={s.thumbDuration}>{formatDuration(p.duration)}</Text>
                  <View style={s.thumbLangBadge}>
                    <Text style={s.thumbLangText}>{p.language.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={s.recentTitle} numberOfLines={2}>{p.name}</Text>
                <Text style={s.recentTime}>
                  {new Date(p.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Quick Actions ── */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.qGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={s.qCard}
              onPress={() => router.push(a.route as any)}
            >
              <View style={s.qIconWrap}>
                <Ionicons name={a.icon as any} size={22} color={colors.primary} />
              </View>
              <Text style={s.qLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginBottom: 16 },
  logo: { fontSize: 18, fontWeight: '800', color: colors.text },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  greetingWrap: { marginBottom: 20, paddingHorizontal: 4 },
  greeting: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 4 },
  greetingSub: { fontSize: 13, color: colors.textSub, fontWeight: '500' },

  tokenCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: colors.primaryLight,
  },
  tokenBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  tokenBadge: { backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tokenBadgeText: { fontSize: 9, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  upgradeBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  upgradeBtnText: { fontSize: 11, fontWeight: '700', color: colors.pureWhite },
  tokenCount: { fontSize: 36, fontWeight: '900', color: colors.text },
  tokenLabel: { fontSize: 13, color: colors.textSub, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  statNum: { fontSize: 28, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSub, fontWeight: '600', marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 14 },
  viewAll: { fontSize: 12, color: colors.primary, fontWeight: '600' },

  recentCard: { width: 140, marginRight: 14 },
  recentThumb: {
    width: 140, height: 90, borderRadius: 14, marginBottom: 8,
    overflow: 'hidden', backgroundColor: colors.border,
    justifyContent: 'flex-end', padding: 8,
  },
  thumbOverlay: {
    position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  overlayText: { color: colors.pureWhite, fontSize: 10, fontWeight: '600' },
  thumbDuration: { fontSize: 10, color: colors.pureWhite, fontWeight: '700', zIndex: 1 },
  thumbLangBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: colors.primary, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    zIndex: 1,
  },
  thumbLangText: { fontSize: 8, color: colors.pureWhite, fontWeight: '700' },
  recentTitle: { fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: 2 },
  recentTime: { fontSize: 10, color: colors.textSub },

  emptyCard: {
    backgroundColor: colors.card, borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 32, marginBottom: 24,
  },
  emptyText: { fontSize: 13, color: colors.textSub, fontWeight: '600' },

  qGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  qCard: {
    width: '47%', backgroundColor: colors.card, borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
  },
  qIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  qLabel: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' },
});
