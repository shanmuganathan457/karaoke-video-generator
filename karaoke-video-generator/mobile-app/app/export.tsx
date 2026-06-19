/**
 * Screen 4: Export & Share
 * Download and share the karaoke video via native share sheet.
 * Uses expo-sharing + expo-file-system (both available in Expo Go).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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

  const saveToDevice = async () => {
    setSaving(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Not Available', 'Sharing is not supported on this device.');
        return;
      }

      if (!outputUrl) {
        Alert.alert('Error', 'No output video URL found.');
        return;
      }

      // Append quality and format to request dynamic transcoding on-demand
      const queryParams = `?quality=${quality}&format=${format}`;
      const downloadUrl = `${outputUrl}${queryParams}`;
      
      const formatExt = format.toLowerCase();
      const cacheDir = FileSystem.cacheDirectory ?? '';
      const localPath = `${cacheDir}karaoke_output_${quality}.${formatExt}`;
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, localPath);

      if (downloadResult.status !== 200) {
        throw new Error('Failed to download video from backend');
      }

      const mimeType = format === 'MP4' ? 'video/mp4' : 'video/quicktime';
      const uti = format === 'MP4' ? 'public.movie' : 'com.apple.quicktime-movie';

      // Open native share sheet — user can tap "Save Video" or "Save to Files" or "Save to Drive"
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType,
        dialogTitle: `Save ${displayName}`,
        UTI: uti,
      });

      setSaved(true);
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Could not download video.');
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

      // Append quality and format to request dynamic transcoding on-demand
      const queryParams = `?quality=${quality}&format=${format}`;
      const downloadUrl = `${outputUrl}${queryParams}`;
      
      const formatExt = format.toLowerCase();
      const cacheDir = FileSystem.cacheDirectory ?? '';
      const localPath = `${cacheDir}karaoke_share_${quality}.${formatExt}`;
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, localPath);

      if (downloadResult.status !== 200) throw new Error('Download failed');

      const mimeType = format === 'MP4' ? 'video/mp4' : 'video/quicktime';
      const uti = format === 'MP4' ? 'public.movie' : 'com.apple.quicktime-movie';

      await Sharing.shareAsync(downloadResult.uri, {
        mimeType,
        dialogTitle: `Share ${displayName}`,
        UTI: uti,
      });
    } catch (err: any) {
      Alert.alert('Share Failed', err.message);
    }
  };

  const openSocialApp = (platform: string) => {
    const urls: Record<string, string> = {
      WhatsApp: 'whatsapp://',
      Instagram: 'instagram://',
      Telegram: 'tg://',
    };
    const fallbacks: Record<string, string> = {
      WhatsApp: 'https://whatsapp.com',
      Instagram: 'https://instagram.com',
      Telegram: 'https://telegram.org',
    };
    
    const url = urls[platform];
    const fallback = fallbacks[platform];
    
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(fallback);
      }
    }).catch(() => {
      Linking.openURL(fallback);
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
              { name: 'WhatsApp', bg: '#25D366', icon: 'whatsapp' },
              { name: 'Instagram', bg: '#E1306C', icon: 'instagram' },
              { name: 'Telegram', bg: '#0088cc', icon: 'telegram' },
            ].map((platform) => (
              <TouchableOpacity
                key={platform.name}
                style={[styles.socialBtn, { backgroundColor: platform.bg }]}
                onPress={() => openSocialApp(platform.name)}
              >
                <FontAwesome name={platform.icon as any} size={20} color="#fff" style={styles.socialIcon} />
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
          <Text style={styles.savedText}>✅ Video shared successfully!</Text>
        )}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={saveToDevice}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {saved ? '✓  Download Again' : '⬇  Download & Save'}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.saveNote}>Tap "Save Video" in the share sheet to save to Camera Roll</Text>
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
  socialIcon: { marginBottom: 6 },
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
