/**
 * Screen 4: Export & Share
 * Save to camera roll, share via native sheet, or post to social platforms.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';

type Quality = '720p' | '1080p' | '2K' | '4K Pro';
type Format = 'MP4' | 'MOV';

// Estimated sizes by quality (MB)
const SIZE_MAP: Record<Quality, number> = {
  '720p': 18.4,
  '1080p': 42.8,
  '2K': 98.2,
  '4K Pro': 214.5,
};

export default function ExportScreen() {
  const { outputUrl, fileName } = useLocalSearchParams<{ outputUrl: string; fileName: string }>();
  const [quality, setQuality] = useState<Quality>('1080p');
  const [format, setFormat] = useState<Format>('MP4');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const estSize = (SIZE_MAP[quality] * (format === 'MOV' ? 1.35 : 1)).toFixed(1);
  const displayName = fileName?.replace(/\.[^/.]+$/, '') || 'Karaoke Video';

  const saveToGallery = async () => {
    setSaving(true);
    try {
      // Request media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to save videos in Settings.');
        setSaving(false);
        return;
      }

      if (!outputUrl) {
        Alert.alert('Error', 'No output video URL found.');
        setSaving(false);
        return;
      }

      // Download video to local cache first
      const localPath = `${FileSystem.cacheDirectory}karaoke_output.mp4`;
      const downloadResult = await FileSystem.downloadAsync(outputUrl, localPath);

      if (downloadResult.status !== 200) {
        throw new Error('Failed to download video from backend');
      }

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      await MediaLibrary.createAlbumAsync('KaraokeAI', asset, false);

      setSaved(true);
      Alert.alert('✅ Saved!', 'Your karaoke video has been saved to your Camera Roll in the KaraokeAI album.');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save video to gallery.');
    } finally {
      setSaving(false);
    }
  };

  const shareVideo = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
        return;
      }

      if (!outputUrl) {
        Alert.alert('Error', 'No output video URL found.');
        return;
      }

      // Download first, then share local file
      const localPath = `${FileSystem.cacheDirectory}karaoke_share.mp4`;
      const downloadResult = await FileSystem.downloadAsync(outputUrl, localPath);

      if (downloadResult.status !== 200) throw new Error('Download failed');

      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'video/mp4',
        dialogTitle: `Share ${displayName}`,
        UTI: 'public.movie',
      });
    } catch (err: any) {
      Alert.alert('Share Failed', err.message);
    }
  };

  const openSocialApp = (platform: string) => {
    const urls: Record<string, string> = {
      TikTok: 'tiktok://',
      Instagram: 'instagram://',
      YouTube: 'youtube://',
    };
    const fallbacks: Record<string, string> = {
      TikTok: 'https://www.tiktok.com',
      Instagram: 'https://www.instagram.com',
      YouTube: 'https://www.youtube.com',
    };
    Linking.canOpenURL(urls[platform]).then((supported) => {
      if (supported) {
        Linking.openURL(urls[platform]);
      } else {
        Linking.openURL(fallbacks[platform]);
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.logo}>KaraokeAI</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Success Banner ── */}
        <View style={styles.successBanner}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Ready to Share!</Text>
          <Text style={styles.successSubtitle}>
            Your AI-enhanced karaoke video is processed and ready.
          </Text>
        </View>

        {/* ── Video Card ── */}
        <View style={styles.videoCard}>
          <View style={styles.videoThumb}>
            <Text style={styles.videoThumbIcon}>🎬</Text>
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.videoMeta}>Karaoke • AI Generated</Text>
          </View>
          <View style={styles.waveIcon}>
            {[3, 5, 2, 6, 3].map((h, i) => (
              <View key={i} style={[styles.waveBar, { height: h * 4 }]} />
            ))}
          </View>
        </View>

        {/* ── Quality Selector ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Video Quality</Text>
          <View style={styles.qualityRow}>
            {(['720p', '1080p', '2K', '4K Pro'] as Quality[]).map((q) => (
              <TouchableOpacity
                key={q}
                style={[styles.qualityBtn, quality === q && styles.qualityBtnActive]}
                onPress={() => setQuality(q)}
              >
                <Text style={[styles.qualityText, quality === q && styles.qualityTextActive]}>
                  {q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Format + Size Row */}
          <View style={styles.formatSizeRow}>
            <View style={styles.formatSection}>
              <Text style={styles.sectionLabel}>Format</Text>
              <View style={styles.formatRow}>
                {(['MP4', 'MOV'] as Format[]).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.formatBtn, format === f && styles.formatBtnActive]}
                    onPress={() => setFormat(f)}
                  >
                    <Text style={[styles.formatText, format === f && styles.formatTextActive]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.sizeBox}>
              <Text style={styles.sizeValue}>{estSize} MB</Text>
              <Text style={styles.sizeLabel}>Est. Size</Text>
            </View>
          </View>
        </View>

        {/* ── Social Sharing ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Share Directly To</Text>
          <View style={styles.socialRow}>
            {[
              { name: 'TikTok', bg: '#010101', emoji: '🎵' },
              { name: 'Instagram', bg: '#E1306C', emoji: '📸' },
              { name: 'YouTube', bg: '#FF0000', emoji: '▶' },
            ].map((platform) => (
              <TouchableOpacity
                key={platform.name}
                style={[styles.socialBtn, { backgroundColor: platform.bg }]}
                onPress={() => openSocialApp(platform.name)}
              >
                <Text style={styles.socialEmoji}>{platform.emoji}</Text>
                <Text style={styles.socialName}>{platform.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Native Share button */}
          <TouchableOpacity style={styles.nativeShareBtn} onPress={shareVideo}>
            <Text style={styles.nativeShareText}>📤  Share via...</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Save to Device CTA ── */}
      <View style={styles.ctaContainer}>
        {saved && (
          <Text style={styles.savedText}>✅ Saved to Camera Roll!</Text>
        )}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={saveToGallery}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {saved ? '✓  Saved to Device' : '⬇  Save to Device'}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.saveNote}>Export to Camera Roll takes ~15 seconds</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────
const PURPLE = '#7C3AED';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { paddingHorizontal: 20, paddingBottom: 20 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: '#374151', fontWeight: '300' },
  logo: { fontSize: 20, fontWeight: '800', color: PURPLE },

  successBanner: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  checkCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  checkMark: { fontSize: 24, color: '#10B981', fontWeight: '800' },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  successSubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 16, lineHeight: 20 },

  videoCard: {
    backgroundColor: '#fff', borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  videoThumb: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
  },
  videoThumbIcon: { fontSize: 22 },
  videoInfo: { flex: 1 },
  videoName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  videoMeta: { fontSize: 11, color: '#9CA3AF' },
  waveIcon: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingRight: 4 },
  waveBar: { width: 3, backgroundColor: PURPLE, borderRadius: 2 },

  card: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 1,
  },

  qualityRow: { flexDirection: 'row', gap: 8 },
  qualityBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#F9FAFB', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  qualityBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  qualityText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  qualityTextActive: { color: '#fff' },

  formatSizeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  formatSection: { flex: 1, gap: 8 },
  formatRow: { flexDirection: 'row', gap: 8 },
  formatBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
  },
  formatBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  formatText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  formatTextActive: { color: '#fff' },

  sizeBox: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  sizeValue: { fontSize: 16, fontWeight: '900', color: '#111827' },
  sizeLabel: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase' },

  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', gap: 4,
  },
  socialEmoji: { fontSize: 18 },
  socialName: { fontSize: 10, fontWeight: '700', color: '#fff' },

  nativeShareBtn: {
    borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', backgroundColor: '#F9FAFB',
  },
  nativeShareText: { fontSize: 13, fontWeight: '700', color: '#374151' },

  ctaContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingTop: 12,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    gap: 8,
  },
  savedText: { fontSize: 13, fontWeight: '700', color: '#10B981', textAlign: 'center' },
  saveBtn: {
    backgroundColor: PURPLE, borderRadius: 18,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  saveNote: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },
});
