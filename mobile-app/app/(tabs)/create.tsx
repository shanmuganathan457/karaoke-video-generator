/**
 * Create Screen – Upload video and generate karaoke (existing functionality)
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Platform, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { uploadVideo, pingServer, API_BASE_URL } from '../../services/api';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { User, loadSession } from '../../services/authStore';



export default function CreateScreen() {
  const { colors } = useTheme();
  const s = getStyles(colors);

  const [user, setUser] = useState<User | null>(null);

  const [uploading, setUploading] = useState(false);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [language, setLanguage] = useState('auto');
  const [langModalVisible, setLangModalVisible] = useState(false);

  const LANGUAGES = [
    { code: 'auto', label: 'Auto-Detect' },
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'Tamil' },
    { code: 'hi', label: 'Hindi' },
    { code: 'es', label: 'Spanish' },
    { code: 'ko', label: 'Korean' },
  ];

  React.useEffect(() => {
    loadSession().then(s => setUser(s.user));
    pingServer().then(setServerOk);
  }, []);

  const handleVideoSelected = async (uri: string, name: string, mimeType = 'video/mp4') => {
    setUploading(true);
    try {
      const alive = await pingServer();
      if (!alive) {
        Alert.alert(
          'Cannot Reach Server',
          `Make sure the Python backend is running on your PC.\n\nStart it with:\n  python -m karaoke_generator.server\n\nThen update API_BASE_URL in services/api.ts to:\n  ${API_BASE_URL}`,
          [{ text: 'OK' }]
        );
        setUploading(false);
        return;
      }
      const { jobId } = await uploadVideo(uri, name, mimeType, language);
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
      await handleVideoSelected(asset.uri, asset.fileName || `video_${Date.now()}.mp4`, asset.mimeType || 'video/mp4');
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

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.logo}>KaraokeAI</Text>
          <TouchableOpacity style={s.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
            <View style={s.avatarSmall}>
              <Text style={s.avatarText}>{(user?.name || 'M')[0].toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Server status */}
        {serverOk !== null && (
          <View style={[s.badge, { backgroundColor: serverOk ? colors.successLight : colors.dangerLight }]}>
            <View style={[s.dot, { backgroundColor: serverOk ? colors.success : colors.danger }]} />
            <Text style={[s.badgeText, { color: serverOk ? colors.success : colors.danger }]}>
              {serverOk ? 'Backend connected' : `Backend offline — update API_BASE_URL in services/api.ts`}
            </Text>
          </View>
        )}

        {/* Title */}
        <Text style={s.title}>Create New Karaoke</Text>
        <Text style={s.subtitle}>Upload a video to isolate vocals and generate AI-synchronized lyrics.</Text>

        {/* Language Selector */}
        <View style={s.langRow}>
          <Text style={s.sectionLabel}>Language</Text>
          <TouchableOpacity style={s.langDropdownBtn} onPress={() => setLangModalVisible(true)}>
            <Text style={s.langDropdownText}>{LANGUAGES.find(l => l.code === language)?.label}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSub} />
          </TouchableOpacity>
        </View>

        {/* Language Modal */}
        <Modal visible={langModalVisible} transparent animationType="fade">
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setLangModalVisible(false)}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>Select Language</Text>
              <FlatList
                data={LANGUAGES}
                keyExtractor={item => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[s.modalItem, language === item.code && s.modalItemActive]}
                    onPress={() => {
                      setLanguage(item.code);
                      setLangModalVisible(false);
                    }}
                  >
                    <Text style={[s.modalItemText, language === item.code && s.modalItemTextActive]}>{item.label}</Text>
                    {language === item.code && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Drop Zone */}
        <TouchableOpacity style={s.dropZone} onPress={pickFromGallery} disabled={uploading} activeOpacity={0.85}>
          {uploading ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={s.uploadingText}>Uploading...</Text>
            </>
          ) : (
            <>
              <View style={s.uploadIcon}>
                <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
              </View>
              <Text style={s.dropTitle}>Upload Video</Text>
              <Text style={s.dropSub}>Tap to pick from your Gallery</Text>
              <Text style={s.dropFormats}>MP4 • MOV • AVI supported</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Source Grid */}
        <Text style={s.orLabel}>Or choose a source</Text>
        <View style={s.sourceGrid}>
          {[
            { icon: 'images-outline', label: 'Gallery', action: pickFromGallery },
            { icon: 'folder-open-outline', label: 'Files', action: pickFromFiles },
          ].map((src) => (
            <TouchableOpacity key={src.label} style={s.srcCard} onPress={src.action} disabled={uploading}>
              <Ionicons name={src.icon as any} size={26} color={colors.primary} />
              <Text style={s.srcLabel}>{src.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feature Pills */}
        <View style={s.pills}>
          {['🎤 Whisper AI', '⚡ Word-Level Sync', '🌍 Multilingual', '🎬 HD Export'].map((f) => (
            <View key={f} style={s.pill}>
              <Text style={s.pillText}>{f}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginBottom: 16 },
  logo: { fontSize: 18, fontWeight: '800', color: colors.text },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', flex: 1 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.textSub, marginBottom: 24, lineHeight: 20 },
  
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  langDropdownBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  langDropdownText: { fontSize: 14, fontWeight: '600', color: colors.text },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16, textAlign: 'center' },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemActive: {  },
  modalItemText: { fontSize: 16, color: colors.text, fontWeight: '500' },
  modalItemTextActive: { color: colors.primary, fontWeight: '700' },

  dropZone: {
    backgroundColor: colors.card, borderRadius: 20, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
  },
  uploadIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  dropTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  dropSub: { fontSize: 13, color: colors.textSub, marginBottom: 6 },
  dropFormats: { fontSize: 11, color: colors.textSub },
  uploadingText: { marginTop: 12, fontSize: 14, color: colors.primary, fontWeight: '600' },
  orLabel: { fontSize: 12, fontWeight: '700', color: colors.textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  sourceGrid: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  srcCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 20, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
  },
  srcLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 11, fontWeight: '600', color: colors.primary },
});
