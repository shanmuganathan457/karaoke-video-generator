/**
 * Projects Screen – Real library of projects
 * Shows a searchable list of karaoke projects with thumbnails and status.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Platform, Alert, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

// ─── SERVICES ──────────────────────────────────────────────────────────────
import { listProjects, deleteProject, getThumbnailUrl, Project } from '../../services/projects';
import { loadSession } from '../../services/authStore';
import { API_BASE_URL } from '../../services/api';

const STATUS_COLOR: Record<string, string> = {
  completed: '#10B981',
  processing: '#F59E0B',
  pending: '#F59E0B',
  failed: '#EF4444',
};

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function ProjectsScreen() {
  const { colors } = useTheme();
  const s = getStyles(colors);

  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInitials, setUserInitials] = useState('M');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchProjectsList = async () => {
    try {
      const plist = await listProjects();
      setProjects(plist);
      
      const session = await loadSession();
      if (session.user?.name) {
        setUserInitials(session.user.name[0].toUpperCase());
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProjectsList();
    }, [])
  );

  const handleDelete = (p: Project) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${p.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteProject(p.id);
              await fetchProjectsList();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete project');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleProjectPress = (p: Project) => {
    if (p.status === 'completed') {
      const fullOutputUrl = `${API_BASE_URL}${p.outputUrl}`;
      router.push({ pathname: '/preview', params: { outputUrl: fullOutputUrl, fileName: p.name, jobId: p.id } });
    } else if (p.status === 'failed') {
      Alert.alert(
        'Project Failed',
        p.error_message || 'An error occurred during subtitle generation.',
        [
          { text: 'Delete Project', style: 'destructive', onPress: () => handleDelete(p) },
          { text: 'OK', style: 'default' },
        ]
      );
    } else {
      router.push({ pathname: '/processing', params: { jobId: p.id, fileName: p.name } });
    }
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.logo}>KaraokeAI</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <View style={s.avatarSmall}>
            <Text style={s.avatarText}>{userInitials}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search projects..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Title row */}
      <View style={s.titleRow}>
        <Text style={s.screenTitle}>Your Projects</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={s.iconBtnSmall} onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            <Ionicons name={viewMode === 'grid' ? 'list' : 'grid'} size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.filterBtn} onPress={fetchProjectsList}>
            <Text style={s.filterText}>Refresh ▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && projects.length === 0 ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <ScrollView contentContainerStyle={s.emptyContainer} showsVerticalScrollIndicator={false}>
          <Ionicons name="folder-open-outline" size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
          <Text style={s.emptyTitle}>No Projects Found</Text>
          <Text style={s.emptySub}>
            {search.trim() ? "Try searching for a different name." : "Upload a video in the Create tab to get started!"}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {filtered.map((p) => {
            if (viewMode === 'list') {
              return (
                <TouchableOpacity key={`list-${p.id}`} style={s.listCard} onPress={() => handleProjectPress(p)}>
                  <View style={s.cardInfoRow}>
                    <View style={s.cardInfo}>
                      <Text style={s.cardTitle} numberOfLines={1}>{p.name}</Text>
                      <Text style={s.dateText}>
                        {new Date(p.created_at).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(p)}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }
            return (
            <TouchableOpacity key={`grid-${p.id}`} style={s.card} onPress={() => handleProjectPress(p)}>
              {/* Thumbnail */}
              <View style={s.thumb}>
                <Image
                  source={{ uri: getThumbnailUrl(p.id) }}
                  style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
                  resizeMode="cover"
                />

                {/* Overlay for processing/error states */}
                {(p.status === 'processing' || p.status === 'pending') && (
                  <View style={s.thumbOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={s.overlayText}>AI Processing...</Text>
                  </View>
                )}
                {p.status === 'failed' && (
                  <View style={[s.thumbOverlay, { backgroundColor: 'rgba(239, 68, 68, 0.7)' }]}>
                    <Ionicons name="alert-circle" size={24} color="#fff" />
                    <Text style={s.overlayText}>Processing Failed</Text>
                  </View>
                )}

                <Text style={s.thumbDuration}>{formatDuration(p.duration)}</Text>
                <View style={s.langBadge}>
                  <Text style={s.langText}>{p.language.toUpperCase()}</Text>
                </View>
              </View>
              {/* Info */}
              <View style={s.cardInfoRow}>
                <View style={s.cardInfo}>
                  <Text style={s.cardTitle} numberOfLines={1}>{p.name}</Text>
                    <Text style={s.dateText}>
                      {new Date(p.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </Text>
                </View>
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(p)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginBottom: 16 },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  logo: { fontSize: 18, fontWeight: '800', color: colors.text },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.iconBg, alignItems: 'center', justifyContent: 'center' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.inputBg, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  screenTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  filterBtn: { backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, justifyContent: 'center' },
  filterText: { fontSize: 12, color: colors.textSub, fontWeight: '600' },
  iconBtnSmall: { backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center', alignItems: 'center' },

  listCard: {
    backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden',
    marginBottom: 10, flexDirection: 'column',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
    borderWidth: 1, borderColor: colors.border,
  },

  card: {
    backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden',
    marginBottom: 16, flexDirection: 'column',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  thumb: {
    height: 170, width: '100%', padding: 12,
    justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: colors.border, overflow: 'hidden',
  },
  thumbOverlay: {
    position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  overlayText: { color: colors.pureWhite, fontSize: 12, fontWeight: '700' },
  thumbDuration: { fontSize: 11, color: colors.pureWhite, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', zIndex: 1 },
  langBadge: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, zIndex: 1 },
  langText: { fontSize: 9, color: colors.pureWhite, fontWeight: '800' },

  cardInfoRow: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  dateText: { fontSize: 11, color: colors.textSub, fontWeight: '600', marginTop: 4 },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 4 },
  emptySub: { fontSize: 13, color: colors.textSub, textAlign: 'center', lineHeight: 20 },
});
