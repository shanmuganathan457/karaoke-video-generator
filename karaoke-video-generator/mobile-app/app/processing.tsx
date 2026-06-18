/**
 * Screen 2: Processing
 * Polls the backend for real AI processing progress.
 * Shows animated circular progress, spectrogram, and step-by-step status.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { getJobStatus, getOutputVideoUrl, type JobStatus } from '../services/api';

// ─── PROCESSING STEPS ─────────────────────────────────────────────────────
const STEPS = [
  { key: 'extracting', label: 'Extracting Audio', icon: '🎵' },
  { key: 'transcribing', label: 'Speech Recognition', icon: '🎤' },
  { key: 'timing', label: 'Word-Level Timing', icon: '⏱' },
  { key: 'generating', label: 'Subtitle Generation', icon: '📝' },
];

const STEP_ORDER = ['extracting', 'transcribing', 'timing', 'generating', 'done'];

function getStepStatus(currentStatus: string, stepKey: string): 'done' | 'active' | 'pending' {
  const currentIdx = STEP_ORDER.indexOf(currentStatus);
  const stepIdx = STEP_ORDER.indexOf(stepKey);
  if (currentIdx > stepIdx) return 'done';
  if (currentIdx === stepIdx) return 'active';
  return 'pending';
}

// ─── CIRCULAR PROGRESS ────────────────────────────────────────────────────
function CircularProgress({ progress }: { progress: number }) {
  const SIZE = 140;
  const STROKE = 10;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <View style={circStyles.wrapper}>
      <Svg width={SIZE} height={SIZE}>
        {/* Track */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          stroke="#E2E8F0" strokeWidth={STROKE} fill="transparent"
        />
        {/* Progress */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          stroke="#7C3AED" strokeWidth={STROKE} fill="transparent"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={circStyles.center}>
        <Text style={circStyles.percent}>{Math.round(progress)}%</Text>
        <Text style={circStyles.label}>Processing</Text>
      </View>
    </View>
  );
}

const circStyles = StyleSheet.create({
  wrapper: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  percent: { fontSize: 28, fontWeight: '900', color: '#111827' },
  label: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase' },
});

// ─── AUDIO WAVEFORM ───────────────────────────────────────────────────────
function AudioWaveform({ active }: { active: boolean }) {
  const anims = useRef(Array.from({ length: 24 }, () => new Animated.Value(6))).current;

  useEffect(() => {
    if (!active) return;
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 30),
          Animated.timing(anim, {
            toValue: 6 + Math.random() * 36,
            duration: 400 + Math.random() * 300,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 6,
            duration: 400 + Math.random() * 300,
            useNativeDriver: false,
          }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, [active]);

  return (
    <View style={waveStyles.container}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[waveStyles.bar, { height: anim }]}
        />
      ))}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 48, gap: 3, paddingHorizontal: 8,
  },
  bar: {
    width: 4, borderRadius: 2,
    backgroundColor: '#7C3AED',
  },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────
export default function ProcessingScreen() {
  const { jobId, fileName } = useLocalSearchParams<{ jobId: string; fileName: string }>();
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = jobStatus?.progress ?? 0;
  const currentStep = jobStatus?.status ?? 'extracting';
  const estimatedSecs = jobStatus?.estimatedSeconds ?? 0;

  useEffect(() => {
    if (!jobId) return;

    // Poll every 2 seconds
    pollRef.current = setInterval(async () => {
      try {
        const status = await getJobStatus(jobId);
        setJobStatus(status);

        if (status.status === 'done') {
          clearInterval(pollRef.current!);
          // Navigate to preview with the output video URL
          const outputUrl = getOutputVideoUrl(jobId);
          router.replace({ pathname: '/preview', params: { outputUrl, fileName } });
        } else if (status.status === 'error') {
          clearInterval(pollRef.current!);
          setError(status.error || 'Processing failed');
        }
      } catch (err: any) {
        setError(err.message);
        clearInterval(pollRef.current!);
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId]);

  const handleCancel = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    router.back();
  };

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Processing Failed</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleCancel}>
            <Text style={styles.retryText}>Go Back & Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>KaraokeAI</Text>
        </View>

        <Text style={styles.pageTitle}>AI Processing</Text>
        {fileName ? <Text style={styles.fileLabel}>📹 {fileName}</Text> : null}

        {/* Circular Progress */}
        <View style={styles.progressSection}>
          <CircularProgress progress={progress} />
          <View style={styles.timerRow}>
            <Text style={styles.timerIcon}>⏱</Text>
            <Text style={styles.timerText}>
              {estimatedSecs > 0 ? `${estimatedSecs}s remaining` : 'Calculating...'}
            </Text>
          </View>
          <Text style={styles.processingNote}>Your AI karaoke is being created</Text>
        </View>

        {/* Live Spectrogram */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Live Audio Analysis</Text>
            <View style={styles.activePill}>
              <View style={styles.pingDot} />
              <Text style={styles.activeText}>Active</Text>
            </View>
          </View>
          <AudioWaveform active={currentStep !== 'done' && currentStep !== 'error'} />
        </View>

        {/* Workflow Steps */}
        <View style={styles.card}>
          <Text style={styles.stepsTitle}>Workflow Steps</Text>
          {STEPS.map((step) => {
            const status = getStepStatus(currentStep, step.key);
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={[
                  styles.stepIndicator,
                  status === 'done' && styles.indicatorDone,
                  status === 'active' && styles.indicatorActive,
                  status === 'pending' && styles.indicatorPending,
                ]}>
                  {status === 'done' && <Text style={styles.checkMark}>✓</Text>}
                  {status === 'active' && <View style={styles.innerSpin} />}
                </View>
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepLabel, status === 'pending' && styles.stepLabelPending]}>
                    {step.icon}  {step.label}
                  </Text>
                </View>
                <Text style={[
                  styles.stepStatus,
                  status === 'done' && { color: '#7C3AED' },
                  status === 'active' && { color: '#F59E0B' },
                  status === 'pending' && { color: '#D1D5DB' },
                ]}>
                  {status === 'done' ? 'Done' : status === 'active' ? 'Active' : 'Pending'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelText}>✕  Cancel Processing</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────
const PURPLE = '#7C3AED';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  header: { paddingTop: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  logo: { fontSize: 22, fontWeight: '800', color: PURPLE },

  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  fileLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 24 },

  progressSection: { alignItems: 'center', marginBottom: 24, gap: 12 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerIcon: { fontSize: 14 },
  timerText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  processingNote: { fontSize: 11, color: '#9CA3AF' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  activeText: { fontSize: 10, fontWeight: '700', color: '#991B1B' },

  stepsTitle: { fontSize: 11, fontWeight: '800', color: PURPLE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  stepIndicator: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  indicatorDone: { backgroundColor: '#EDE9FE', borderColor: PURPLE },
  indicatorActive: { borderColor: PURPLE, borderStyle: 'dashed' },
  indicatorPending: { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  checkMark: { fontSize: 12, color: PURPLE, fontWeight: '700' },
  innerSpin: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: PURPLE, borderTopColor: 'transparent' },
  stepInfo: { flex: 1 },
  stepLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  stepLabelPending: { color: '#D1D5DB' },
  stepStatus: { fontSize: 11, fontWeight: '700' },

  cancelBtn: {
    borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 16, paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },

  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  errorEmoji: { fontSize: 48 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  errorMsg: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  retryBtn: { backgroundColor: PURPLE, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
