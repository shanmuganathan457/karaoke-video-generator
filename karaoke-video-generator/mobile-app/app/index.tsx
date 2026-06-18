/**
 * Screen 1: Upload
 * Users pick a video from camera roll, files, or record with camera.
 * On selection, uploads to Python backend and navigates to processing screen.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { uploadVideo, pingServer, API_BASE_URL } from '../services/api';

// ─── Icons (using unicode symbols since no icon lib yet) ───────────────────
const ICONS = {
  upload: '⬆',
  gallery: '🖼',
  files: '📁',
  camera: '📷',
  music: '🎵',
  help: '?',
};

export default function UploadScreen() {
  const [uploading, setUploading] = useState(false);
  const [serverOk, setServerOk] = useState<boolean | null>(null);

  // Check server connection on mount
  React.useEffect(() => {
    pingServer().then(setServerOk);
  }, []);

  const handleVideoSelected = async (uri: string, name: string, mimeType = 'video/mp4') => {
    setUploading(true);
    try {
      // Check server is reachable first
      const alive = await pingServer();
      if (!alive) {
        Alert.alert(
          'Cannot Reach Server',
          `Make sure the Python backend is running on your PC.\n\nStart it with:\n  python -m karaoke_generator.server\n\nThen open services/api.ts and update API_BASE_URL to:\n  ${API_BASE_URL}`,
          [{ text: 'OK' }]
        );
        setUploading(false);
        return;
      }

      const { jobId } = await uploadVideo(uri, name, mimeType);
      // Navigate to processing screen with the jobId
      router.push({ pathname: '/processing', params: { jobId, fileName: name } });
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Something went wrong uploading the video.');
    } finally {
      setUploading(false);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant access to your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName || `video_${Date.now()}.mp4`;
      await handleVideoSelected(asset.uri, name, asset.mimeType || 'video/mp4');
    }
  };

  const pickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/mp4', 'video/quicktime', 'video/*'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await handleVideoSelected(asset.uri, asset.name, asset.mimeType || 'video/mp4');
    }
  };

  const recordWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera access in Settings.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 300, // 5 minutes
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = `recording_${Date.now()}.mp4`;
      await handleVideoSelected(asset.uri, name, 'video/mp4');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.logo}>KaraokeAI</Text>
          <TouchableOpacity style={styles.helpBtn}>
            <Text style={styles.helpText}>?</Text>
          </TouchableOpacity>
        </View>

        {/* ── Server Status Badge ── */}
        {serverOk !== null && (
          <View style={[styles.serverBadge, { backgroundColor: serverOk ? '#ECFDF5' : '#FEF2F2' }]}>
            <View style={[styles.dot, { backgroundColor: serverOk ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.serverText, { color: serverOk ? '#065F46' : '#991B1B' }]}>
              {serverOk
                ? 'Backend connected'
                : `Backend offline — update API_BASE_URL in services/api.ts`}
            </Text>
          </View>
        )}

        {/* ── Title ── */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Create New Karaoke</Text>
          <Text style={styles.subtitle}>
            Upload a video to isolate vocals and generate word-level synchronized lyrics using AI.
          </Text>
        </View>

        {/* ── Main Upload Drop Zone ── */}
        <TouchableOpacity
          style={styles.uploadCard}
          onPress={pickFromGallery}
          disabled={uploading}
          activeOpacity={0.85}
        >
          {uploading ? (
            <ActivityIndicator size="large" color="#7C3AED" />
          ) : (
            <>
              <View style={styles.uploadIconCircle}>
                <Text style={styles.uploadIcon}>⬆</Text>
              </View>
              <Text style={styles.uploadTitle}>Upload Video</Text>
              <Text style={styles.uploadSubtitle}>Tap to pick from your Gallery</Text>
              <Text style={styles.uploadFormats}>MP4 • MOV • AVI supported</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Source Options ── */}
        <Text style={styles.sectionLabel}>Or choose a source</Text>
        <View style={styles.sourceGrid}>
          <TouchableOpacity style={styles.sourceCard} onPress={pickFromGallery} disabled={uploading}>
            <Text style={styles.sourceIcon}>🖼</Text>
            <Text style={styles.sourceLabel}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sourceCard} onPress={pickFromFiles} disabled={uploading}>
            <Text style={styles.sourceIcon}>📁</Text>
            <Text style={styles.sourceLabel}>Files</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sourceCard} onPress={recordWithCamera} disabled={uploading}>
            <Text style={styles.sourceIcon}>📷</Text>
            <Text style={styles.sourceLabel}>Camera</Text>
          </TouchableOpacity>
        </View>

        {/* ── Feature Pills ── */}
        <View style={styles.features}>
          {['🎤 Whisper AI', '⚡ Word-Level Sync', '🌍 Multilingual', '🎬 HD Export'].map(f => (
            <View key={f} style={styles.pill}>
              <Text style={styles.pillText}>{f}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* ── Bottom Tab Bar ── */}
      <View style={styles.tabBar}>
        {[
          { icon: '🏠', label: 'Home', active: true },
          { icon: '📂', label: 'Projects' },
          { icon: '➕', label: 'Create', active: true },
          { icon: '📊', label: 'Analytics' },
          { icon: '👤', label: 'Profile' },
        ].map((tab) => (
          <View key={tab.label} style={styles.tabItem}>
            <Text style={[styles.tabIcon, tab.active && styles.tabActive]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, tab.active && styles.tabLabelActive]}>{tab.label}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────
const PURPLE = '#7C3AED';
const LIGHT_BG = '#FAFAFA';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: LIGHT_BG },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },
  logo: { fontSize: 22, fontWeight: '800', color: PURPLE, letterSpacing: -0.5 },
  helpBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  helpText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },

  serverBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    marginBottom: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  serverText: { fontSize: 11, fontWeight: '600', flex: 1 },

  titleSection: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', lineHeight: 20 },

  uploadCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#DDD6FE',
    borderStyle: 'dashed',
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  uploadIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  uploadIcon: { fontSize: 24 },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: PURPLE, marginBottom: 4 },
  uploadSubtitle: { fontSize: 13, color: '#9CA3AF', marginBottom: 6 },
  uploadFormats: { fontSize: 11, color: '#C4B5FD', letterSpacing: 0.5 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  sourceGrid: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  sourceCard: {
    flex: 1, backgroundColor: '#fff',
    borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sourceIcon: { fontSize: 24, marginBottom: 8 },
  sourceLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280' },

  features: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    backgroundColor: '#EDE9FE', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  pillText: { fontSize: 11, fontWeight: '600', color: PURPLE },

  // Tab Bar
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 10, paddingHorizontal: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: { fontSize: 9, fontWeight: '600', color: '#9CA3AF' },
  tabActive: {},
  tabLabelActive: { color: PURPLE },
});
