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
import { useTheme, ThemeColors } from '../context/ThemeContext';

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
  const { colors } = useTheme();
  const styles = getStyles(colors);
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
      const safeName = displayName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
      const localPath = `${cacheDir}${safeName}_${quality}.${formatExt}`;
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, localPath);

      if (downloadResult.status !== 200) {
        throw new Error('Failed to download video from backend');
      }

      const mimeType = format === 'MP4' ? 'video/mp4' : 'video/quicktime';
      const uti = format === 'MP4' ? 'public.movie' : 'com.apple.quicktime-movie';

      // Open native share sheet — user can tap "Save Video" or "Save to Files"
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
      const safeName = displayName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
      const localPath = `${cacheDir}${safeName}_${quality}.${formatExt}`;
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
const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12, paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: colors.text, fontWeight: '300' },
  logo: { fontSize: 20, fontWeight: '800', color: colors.primary },

  successBanner: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  checkCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(16, 185, 129, 0.15)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  checkMark: { fontSize: 24, color: '#10B981', fontWeight: '800' },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  successSubtitle: { fontSize: 13, color: colors.textSub, textAlign: 'center', paddingHorizontal: 16, lineHeight: 20 },

  videoCard: {
    backgroundColor: colors.card, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
  },
  videoThumb: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  videoThumbIcon: { fontSize: 22 },
  videoInfo: { flex: 1 },
  videoName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  videoMeta: { fontSize: 11, color: colors.textSub },
  waveIcon: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingRight: 4 },
  waveBar: { width: 3, backgroundColor: colors.primary, borderRadius: 2 },

  card: {
    backgroundColor: colors.card, borderRadius: 20,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: colors.textSub,
    textTransform: 'uppercase', letterSpacing: 1,
  },

  qualityRow: { flexDirection: 'row', gap: 8 },
  qualityBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.background, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  qualityBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  qualityText: { fontSize: 11, fontWeight: '700', color: colors.textSub },
  qualityTextActive: { color: colors.pureWhite },

  formatSizeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  formatSection: { flex: 1, gap: 8 },
  formatRow: { flexDirection: 'row', gap: 8 },
  formatBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  formatBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  formatText: { fontSize: 12, fontWeight: '700', color: colors.textSub },
  formatTextActive: { color: colors.pureWhite },

  sizeBox: {
    backgroundColor: colors.background, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  sizeValue: { fontSize: 16, fontWeight: '900', color: colors.text },
  sizeLabel: { fontSize: 9, fontWeight: '700', color: colors.textSub, letterSpacing: 1, textTransform: 'uppercase' },

  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', gap: 4,
  },
  socialIcon: { marginBottom: 6 },
  socialName: { fontSize: 10, fontWeight: '700', color: '#fff' },

  nativeShareBtn: {
    borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', backgroundColor: colors.background,
  },
  nativeShareText: { fontSize: 13, fontWeight: '700', color: colors.text },

  ctaContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: 8,
  },
  savedText: { fontSize: 13, fontWeight: '700', color: '#10B981', textAlign: 'center' },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 18,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: colors.pureWhite, letterSpacing: 0.5 },
  saveNote: { fontSize: 10, color: colors.textSub, textAlign: 'center' },
});
