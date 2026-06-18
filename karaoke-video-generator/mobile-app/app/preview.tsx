/**
 * Screen 3: Preview with Subtitle Overlay
 * Plays the real output video from the Python backend.
 * Shows subtitle text overlay and playback controls.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';

const { width: SCREEN_W } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_W * 0.75; // 4:3 ratio

// Sample subtitle lines — in production these come from the backend ASS file
const SAMPLE_SUBTITLES = [
  'நடுவானில் நிலவு...',
  'கண்ணில் தெரியும் ஒளி...',
  'Midnight Serenade...',
  'Singing under starlight...',
];

export default function PreviewScreen() {
  const { outputUrl, fileName } = useLocalSearchParams<{ outputUrl: string; fileName: string }>();
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoTitle, setVideoTitle] = useState(
    fileName?.replace(/\.[^/.]+$/, '') || 'Karaoke Video'
  );

  // expo-video player
  const player = useVideoPlayer(outputUrl || '', (p) => {
    p.loop = true;
    p.play();
  });

  // Format seconds to mm:ss
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekBack = () => {
    player.currentTime = Math.max(0, player.currentTime - 10);
  };

  const seekForward = () => {
    player.currentTime = Math.min(player.duration || 0, player.currentTime + 10);
  };

  const handleExport = () => {
    router.push({ pathname: '/export', params: { outputUrl, fileName } });
  };

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate?',
      'This will go back and re-process the video with new settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  // Subtitle text cycling
  const subtitleIndex = Math.floor(player.currentTime / 4) % SAMPLE_SUBTITLES.length;
  const currentSubtitle = SAMPLE_SUBTITLES[subtitleIndex] || '';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>KaraokeAI</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Video Player with Subtitle Overlay ── */}
      <View style={styles.videoWrapper}>
        {outputUrl ? (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.placeholderText}>🎬  No video found</Text>
          </View>
        )}

        {/* Title Edit Badge */}
        <View style={styles.titleOverlay}>
          <View style={styles.titleBadge}>
            <Text style={styles.titleBadgeText} numberOfLines={1}>{videoTitle}</Text>
            <View style={styles.editTag}>
              <Text style={styles.editTagText}>EDIT</Text>
            </View>
          </View>
        </View>

        {/* Subtitle Overlay */}
        <View style={styles.subtitleOverlay}>
          <Text style={styles.subtitleText}>{currentSubtitle}</Text>
        </View>

        {/* Paused indicator */}
        {!isPlaying && (
          <View style={styles.pausedOverlay}>
            <Text style={styles.pausedIcon}>▶</Text>
          </View>
        )}
      </View>

      {/* ── Playback Controls ── */}
      <View style={styles.controlCard}>
        {/* Time Bar */}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{fmt(player.currentTime)}</Text>
          <Text style={styles.timeText}>{fmt(player.duration || 0)}</Text>
        </View>

        {/* Progress Bar (visual only) */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: player.duration ? `${(player.currentTime / player.duration) * 100}%` : '0%' },
            ]}
          />
          <View
            style={[
              styles.progressThumb,
              { left: player.duration ? `${(player.currentTime / player.duration) * 100}%` : '0%' },
            ]}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity onPress={seekBack} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>↩  10s</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlayPause} style={styles.playBtn}>
            <Text style={styles.playBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={seekForward} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>10s  ↪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Action Bar ── */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionSecondary}
          onPress={() => Alert.alert('Editor', 'Subtitle editor coming soon!')}
        >
          <Text style={styles.actionSecondaryText}>✏️  Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionSecondary} onPress={handleRegenerate}>
          <Text style={styles.actionSecondaryText}>🔄  Regenerate</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionPrimary} onPress={handleExport}>
          <Text style={styles.actionPrimaryText}>⬆  Export</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────
const PURPLE = '#7C3AED';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: '#374151', fontWeight: '300' },
  logo: { fontSize: 20, fontWeight: '800', color: PURPLE },

  videoWrapper: {
    marginHorizontal: 16,
    height: VIDEO_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
    position: 'relative',
  },
  video: { width: '100%', height: '100%' },
  videoPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1F2937',
  },
  placeholderText: { color: '#9CA3AF', fontSize: 16 },

  titleOverlay: {
    position: 'absolute', top: 16, left: 0, right: 0,
    alignItems: 'center', zIndex: 10,
  },
  titleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  titleBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600', maxWidth: 160 },
  editTag: { backgroundColor: 'rgba(124,58,237,0.8)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  editTagText: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 1 },

  subtitleOverlay: {
    position: 'absolute', bottom: 16, left: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  subtitleText: {
    color: '#fff', fontSize: 14, fontWeight: '800',
    textAlign: 'center', lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },

  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  pausedIcon: { fontSize: 48, color: 'rgba(255,255,255,0.8)' },

  controlCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    marginBottom: 16, gap: 12,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },

  progressTrack: {
    height: 4, backgroundColor: '#F3F4F6',
    borderRadius: 2, overflow: 'visible', position: 'relative',
  },
  progressFill: { height: '100%', backgroundColor: PURPLE, borderRadius: 2 },
  progressThumb: {
    position: 'absolute', top: -4,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: PURPLE, marginLeft: -6,
  },

  buttonsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  iconBtnText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  playBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  playBtnText: { fontSize: 20, color: '#fff' },

  actionBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  actionSecondary: {
    flex: 1, paddingVertical: 14, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  actionSecondaryText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  actionPrimary: {
    flex: 1, paddingVertical: 14, borderRadius: 16,
    backgroundColor: PURPLE, alignItems: 'center',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  actionPrimaryText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
