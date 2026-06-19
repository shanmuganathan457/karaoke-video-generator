/**
 * Screen 3: Preview with Subtitle Overlay
 * - Video fills all available space (flex:1), never clips or overflows
 * - Seek bar is fully draggable (PanResponder)
 * - Title is inline-editable (tap to rename)
 * - Skip buttons show icons only (no text)
 * - 3 action buttons are pinned to the bottom
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PanResponder,
  LayoutChangeEvent,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';



export default function PreviewScreen() {
  const { outputUrl, fileName } = useLocalSearchParams<{ outputUrl: string; fileName: string }>();

  const [isPlaying, setIsPlaying] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [videoTitle, setVideoTitle] = useState(
    fileName?.replace(/\.[^/.]+$/, '') || 'Karaoke Video'
  );

  // Seek bar state
  const [trackWidth, setTrackWidth] = useState(1);
  const [seekRatio, setSeekRatio] = useState(0); // 0-1, driven by PanResponder while dragging
  const isDragging = useRef(false);

  // expo-video player
  const player = useVideoPlayer(outputUrl || '', (p) => {
    p.loop = true;
    p.play();
  });

  // --- Computed values ---
  const duration = player.duration || 0;
  const currentTime = player.currentTime || 0;
  const ratio = duration > 0 ? (isDragging.current ? seekRatio : currentTime / duration) : 0;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // --- Controls ---
  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying((p) => !p);
  };

  const seekBack = () => {
    player.currentTime = Math.max(0, player.currentTime - 10);
  };

  const seekForward = () => {
    player.currentTime = Math.min(duration, player.currentTime + 10);
  };

  const handleExport = () => {
    const formatSuffix = fileName?.substring(fileName.lastIndexOf('.')) || '.mp4';
    const newFileName = videoTitle.endsWith(formatSuffix) ? videoTitle : `${videoTitle}${formatSuffix}`;
    router.push({ pathname: '/export', params: { outputUrl, fileName: newFileName } });
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

  // --- Draggable seek bar ---
  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width || 1);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        const x = evt.nativeEvent.locationX;
        setSeekRatio(Math.min(1, Math.max(0, x / trackWidth)));
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        setSeekRatio(Math.min(1, Math.max(0, x / trackWidth)));
      },
      onPanResponderRelease: (evt) => {
        const x = evt.nativeEvent.locationX;
        const r = Math.min(1, Math.max(0, x / trackWidth));
        setSeekRatio(r);
        if (player.duration) {
          player.currentTime = r * player.duration;
        }
        isDragging.current = false;
      },
    })
  ).current;



  const titleInputRef = useRef<TextInput>(null);
  const startEditTitle = () => {
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  };
  const finishEditTitle = () => {
    setEditingTitle(false);
    Keyboard.dismiss();
  };

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

      {/* ── Video Player (fills remaining space) ── */}
      <View style={styles.videoWrapper}>
        {outputUrl ? (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.placeholderText}>🎬  No video found</Text>
          </View>
        )}

        {/* Inline editable title overlay */}
        <TouchableOpacity
          style={styles.titleOverlay}
          onPress={startEditTitle}
          activeOpacity={0.8}
        >
          {editingTitle ? (
            <TextInput
              ref={titleInputRef}
              style={styles.titleInput}
              value={videoTitle}
              onChangeText={setVideoTitle}
              onBlur={finishEditTitle}
              onSubmitEditing={finishEditTitle}
              returnKeyType="done"
              selectTextOnFocus
              maxLength={60}
            />
          ) : (
            <View style={styles.titleBadge}>
              <Text style={styles.titleBadgeText} numberOfLines={1}>
                ✏️  {videoTitle}
              </Text>
            </View>
          )}
        </TouchableOpacity>



        {/* Paused big play icon */}
        {!isPlaying && (
          <View style={styles.pausedOverlay} pointerEvents="none">
            <Text style={styles.pausedIcon}>▶</Text>
          </View>
        )}
      </View>

      {/* ── Playback Controls ── */}
      <View style={styles.controlCard}>
        {/* Times */}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {fmt(isDragging.current ? ratio * duration : currentTime)}
          </Text>
          <Text style={styles.timeText}>{fmt(duration)}</Text>
        </View>

        {/* Draggable progress bar */}
        <View
          style={styles.progressTrack}
          onLayout={onTrackLayout}
          {...panResponder.panHandlers}
          hitSlop={{ top: 12, bottom: 12, left: 0, right: 0 }}
        >
          <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
          <View style={[styles.progressThumb, { left: `${ratio * 100}%` }]} />
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity onPress={seekBack} style={styles.iconBtn}>
            <MaterialIcons name="replay-10" size={32} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlayPause} style={styles.playBtn}>
            <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={36} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={seekForward} style={styles.iconBtn}>
            <MaterialIcons name="forward-10" size={32} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Action Buttons (pinned to bottom) ── */}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#000',  // Black bg so video always blends
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#000',
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: '#fff', fontWeight: '300' },
  logo: { fontSize: 20, fontWeight: '800', color: PURPLE },

  // Video fills remaining space
  videoWrapper: {
    flex: 1,                   // ← takes ALL remaining space
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',            // ← fills parent completely
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
  },
  placeholderText: { color: '#9CA3AF', fontSize: 16 },

  // Inline title overlay on top of video
  titleOverlay: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  titleBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  titleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 220,
  },
  titleInput: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: PURPLE,
    minWidth: 180,
    textAlign: 'center',
  },



  // Paused overlay
  pausedOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedIcon: { fontSize: 52, color: 'rgba(255,255,255,0.85)' },

  // Controls card
  controlCard: {
    backgroundColor: '#111',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },

  // Draggable seek bar — taller hit area via hitSlop on parent
  progressTrack: {
    height: 4,
    backgroundColor: '#2D2D2D',
    borderRadius: 2,
    position: 'relative',
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PURPLE,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -7,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PURPLE,
    marginLeft: -9,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },

  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    paddingTop: 2,
  },
  iconBtn: { padding: 10 },
  iconBtnText: { fontSize: 22, color: '#9CA3AF' },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  playBtnText: { fontSize: 22, color: '#fff' },

  // Action buttons — pinned at bottom (no flex, always visible)
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 4 : 12,
    backgroundColor: '#111',
  },
  actionSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    alignItems: 'center',
  },
  actionSecondaryText: { fontSize: 12, fontWeight: '700', color: '#D1D5DB' },
  actionPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionPrimaryText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
