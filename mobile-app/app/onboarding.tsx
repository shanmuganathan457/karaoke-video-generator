/**
 * Onboarding Flow:
 * Slide 0 - Auth (Sign In / Sign Up)
 * Slide 1 - Upload Any Video
 * Slide 2 - Generate Karaoke
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, Dimensions, Platform, KeyboardAvoidingView,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { login, register } from '../services/auth';
import { loadSession } from '../services/authStore';
import { useTheme, ThemeColors } from '../context/ThemeContext';

// ─── Auth Screen ─────────────────────────────────────────────────────────────
function AuthScreen({ onContinue }: { onContinue: () => void }) {
  const { colors } = useTheme();
  const auth = getAuthStyles(colors);
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please fill in all fields.');
      return;
    }
    if (tab === 'signup' && !name.trim()) {
      Alert.alert('Required Fields', 'Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'signin') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim());
      }
      onContinue();
    } catch (err: any) {
      Alert.alert('Authentication Error', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={auth.scroll} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={auth.logoRow}>
          <Text style={auth.logo}>KaraokeAI</Text>
        </View>
        <Text style={auth.tagline}>Your voice, amplified by intelligence.</Text>

        {/* Card */}
        <View style={auth.card}>
          <Text style={auth.cardTitle}>{tab === 'signin' ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={auth.cardSub}>{tab === 'signin' ? 'Continue your musical journey' : 'Start generating high-quality karaoke'}</Text>

          {/* Tabs */}
          <View style={auth.tabs}>
            <TouchableOpacity
              style={[auth.tab, tab === 'signin' && auth.tabActive]}
              onPress={() => setTab('signin')}
              disabled={loading}
            >
              <Text style={[auth.tabText, tab === 'signin' && auth.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[auth.tab, tab === 'signup' && auth.tabActive]}
              onPress={() => setTab('signup')}
              disabled={loading}
            >
              <Text style={[auth.tabText, tab === 'signup' && auth.tabTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Name Field (Sign Up only) */}
          {tab === 'signup' && (
            <View style={{ marginBottom: 12 }}>
              <Text style={auth.label}>Full Name</Text>
              <View style={auth.inputWrap}>
                <Ionicons name="person-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                <TextInput
                  style={auth.input}
                  placeholder="John Doe"
                  placeholderTextColor="#C4B5FD"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>
          )}

          {/* Email Field */}
          <Text style={auth.label}>Email Address</Text>
          <View style={auth.inputWrap}>
            <Ionicons name="mail-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={auth.input}
              placeholder="name@example.com"
              placeholderTextColor="#C4B5FD"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          {/* Password Field */}
          <View style={auth.labelRow}>
            <Text style={auth.label}>Password</Text>
            {tab === 'signin' && (
              <TouchableOpacity>
                <Text style={auth.forgot}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={auth.inputWrap}>
            <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={[auth.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor="#C4B5FD"
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} disabled={loading}>
              <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <TouchableOpacity style={auth.cta} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={auth.ctaText}>{tab === 'signin' ? 'Enter the Studio  →' : 'Create Account  →'}</Text>
            )}
          </TouchableOpacity>

          <Text style={auth.legal}>
            By continuing, you agree to our{' '}
            <Text style={auth.legalLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={auth.legalLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Onboarding Slide ─────────────────────────────────────────────────────────
function OnboardSlide({
  title, description, slideIndex, totalSlides, onNext,
}: {
  title: string;
  description: string;
  slideIndex: number;
  totalSlides: number;
  onNext: () => void;
}) {
  const { colors } = useTheme();
  const slide = getSlideStyles(colors);
  const isUpload = slideIndex === 0;

  return (
    <View style={slide.container}>
      {/* Skip */}
      <TouchableOpacity style={slide.skip} onPress={onNext}>
        <Text style={slide.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Illustration */}
      <View style={slide.illustrationWrap}>
        {isUpload ? (
          <View style={slide.phoneCard}>
            <View style={slide.phoneBody}>
              <View style={slide.fileIconWrap}>
                <Ionicons name="document" size={36} color="#fff" />
              </View>
              <View style={slide.phoneLine} />
              <View style={[slide.phoneLine, { width: 80 }]} />
              <View style={slide.phoneBar} />
            </View>
          </View>
        ) : (
          <View style={slide.aiWrap}>
            <View style={slide.aiOuter}>
              <View style={slide.aiInner}>
                <Ionicons name="settings" size={30} color={colors.primary} />
              </View>
            </View>
            <View style={slide.noteBubble}>
              <Ionicons name="musical-note" size={18} color={colors.primary} />
            </View>
            <View style={slide.linesBubble}>
              <View style={slide.aiBullet} />
              <View style={[slide.aiBullet, { width: 40 }]} />
              <View style={[slide.aiBullet, { width: 30 }]} />
            </View>
          </View>
        )}
      </View>

      {/* Text */}
      <Text style={slide.title}>{title}</Text>
      <Text style={slide.description}>{description}</Text>

      {/* Dots */}
      <View style={slide.dots}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <View
            key={i}
            style={[slide.dot, i === slideIndex && slide.dotActive]}
          />
        ))}
      </View>

      {/* Continue */}
      <TouchableOpacity style={slide.btn} onPress={onNext}>
        <Text style={slide.btnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [step, setStep] = useState(0); // 0=auth, 1=upload slide, 2=karaoke slide
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    loadSession().then((session) => {
      if (session.token && session.user) {
        router.replace('/(tabs)');
      } else {
        setInitializing(false);
      }
    }).catch(() => {
      setInitializing(false);
    });
  }, []);

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      router.replace('/(tabs)');
    }
  };

  if (initializing) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {step === 0 ? (
        <AuthScreen onContinue={handleNext} />
      ) : (
        <OnboardSlide
          slideIndex={step - 1}
          totalSlides={2}
          title={step === 1 ? 'Upload Any Video' : 'Generate Karaoke'}
          description={
            step === 1
              ? 'Pick a music video or recording from your library. Our AI will handle the rest.'
              : 'Our AI magic instantly analyzes any song to perfectly sync lyrics and remove vocals for your performance.'
          }
          onNext={handleNext}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});

const getAuthStyles = (colors: ThemeColors) => StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },
  logoRow: { alignItems: 'center', marginBottom: 4 },
  logo: { fontSize: 28, fontWeight: '900', color: colors.primary, letterSpacing: -0.5 },
  tagline: { textAlign: 'center', color: colors.primaryLight, fontSize: 13, marginBottom: 28 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 4 },
  cardSub: { fontSize: 13, color: colors.textSub, textAlign: 'center', marginBottom: 20 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSub },
  tabTextActive: { color: colors.primary },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.border,
  },
  appleBtnStyle: { backgroundColor: '#E5E7EB', borderColor: '#E5E7EB' },
  socialIcon: { fontSize: 16, color: colors.text, marginRight: 8 },
  socialText: { fontSize: 14, fontWeight: '600', color: colors.text },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  divLine: { flex: 1, height: 1, backgroundColor: colors.border },
  divText: { fontSize: 11, color: colors.textSub, marginHorizontal: 12, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgot: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 16, backgroundColor: colors.background,
  },
  input: { flex: 1, fontSize: 14, color: colors.text },
  cta: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaText: { fontSize: 15, fontWeight: '800', color: colors.pureWhite },
  legal: { fontSize: 11, color: colors.textSub, textAlign: 'center', lineHeight: 18 },
  legalLink: { color: colors.primary, fontWeight: '600' },
});

const getSlideStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  skip: { position: 'absolute', top: 16, right: 0 },
  skipText: { fontSize: 14, color: colors.textSub, fontWeight: '600' },

  illustrationWrap: {
    width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: 40,
  },
  phoneCard: {
    width: 150, height: 200,
    backgroundColor: colors.card,
    borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
    padding: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  phoneBody: { alignItems: 'center', width: '100%' },
  fileIconWrap: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  phoneLine: { width: 100, height: 6, backgroundColor: colors.border, borderRadius: 4, marginBottom: 8 },
  phoneBar: { width: 60, height: 8, backgroundColor: colors.border, borderRadius: 8, marginTop: 8 },

  aiWrap: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  aiOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  aiInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  noteBubble: {
    position: 'absolute', top: 8, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  linesBubble: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: colors.card, borderRadius: 12, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  aiBullet: { width: 50, height: 5, backgroundColor: colors.border, borderRadius: 4, marginBottom: 4 },

  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 14 },
  description: { fontSize: 14, color: colors.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 32 },

  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.primary },

  btn: {
    backgroundColor: colors.primary, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 80,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  btnText: { fontSize: 15, fontWeight: '800', color: colors.pureWhite },
});
