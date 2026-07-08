/**
 * LectureApp — redesigned UI
 *
 * Requires:
 *   yarn add react-native-svg        (for the icons)
 *
 * Fonts (optional but recommended — the design uses them):
 *   - Newsreader  (serif, for titles)   https://fonts.google.com/specimen/Newsreader
 *   - Manrope     (sans, for body/UI)   https://fonts.google.com/specimen/Manrope
 *   Drop the .ttf files in assets/fonts, add to react-native.config.js, then `npx react-native-asset`.
 *   If the fonts aren't linked, the app falls back to the system font and still looks fine.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Share,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Svg, { Path, Line, Rect, Circle, Polyline } from 'react-native-svg';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import DocumentPicker from 'react-native-document-picker';
import { useSafeAreaInsets, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://Jaidityas-MacBook-Pro.local:3000';
const audioRecorderPlayer = new AudioRecorderPlayer();

/* ---------- palette ---------- */
const C = {
  paper: '#F5F2EC',
  card: '#FFFFFF',
  ink: '#1E1C19',
  body: '#3C3833',
  muted: '#7C766B',
  faint: '#9A9384',
  hair: '#EDE7DC',
  accent: '#2E6B4E',
  accentSoft: '#E6EEE7',
  accentTintBg: '#EFF4EF',
  danger: '#B4453A',
  gold: '#C9A24A',
};
const SERIF = Platform.select({ ios: 'Newsreader', android: 'Newsreader', default: 'serif' });

/* ---------- icons (lucide-style, via react-native-svg) ---------- */
const Mic = ({ size = 24, color = C.ink, sw = 2 }: any) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <Line x1="12" y1="19" x2="12" y2="23" />
  </Svg>
);
const Upload = ({ size = 24, color = C.ink, sw = 2 }: any) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <Polyline points="17 8 12 3 7 8" />
    <Line x1="12" y1="3" x2="12" y2="15" />
  </Svg>
);
const ShareIcon = ({ size = 24, color = C.ink, sw = 2 }: any) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <Polyline points="16 6 12 2 8 6" />
    <Line x1="12" y1="2" x2="12" y2="15" />
  </Svg>
);
const Trash = ({ size = 24, color = C.ink, sw = 2 }: any) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="3 6 5 6 21 6" />
    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Svg>
);
const Back = ({ size = 24, color = C.ink, sw = 2 }: any) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);
const Chevron = ({ size = 16, color = C.faint, open = false }: any) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
    <Polyline points="6 9 12 15 18 9" />
  </Svg>
);
const Check = ({ size = 13, color = '#fff', sw = 3.5 }: any) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);
const SelectIcon = ({ size = 20, color = C.body, sw = 2 }: any) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="9 11 12 14 22 4" />
    <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </Svg>
);
const Clock = ({ size = 13, color = C.faint, sw = 2 }: any) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="9" />
    <Polyline points="12 7 12 12 15 14" />
  </Svg>
);
const DocIcon = ({ size = 15, color = C.accent, sw = 2.2 }: any) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <Polyline points="14 2 14 8 20 8" />
  </Svg>
);

/* Brand mark used in the header — mic with sound waves on a green tile */
const LogoMark = ({ tile = 38 }: any) => (
  <View style={{ width: tile, height: tile, borderRadius: tile * 0.28, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={tile * 0.62} height={tile * 0.62} viewBox="0 0 120 120" fill="none" stroke={C.paper} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="49" y="26" width="22" height="48" rx="11" fill={C.paper} stroke="none" />
      <Path d="M39 58 a21 21 0 0 0 42 0" />
      <Line x1="60" y1="79" x2="60" y2="92" />
      <Line x1="49" y1="92" x2="71" y2="92" />
      <Path d="M28 46 a20 20 0 0 0 0 26" opacity={0.5} />
      <Path d="M92 46 a20 20 0 0 1 0 26" opacity={0.5} />
    </Svg>
  </View>
);

interface Lecture {
  id: number;
  title: string;
  transcript: string;
  summary: string;
  keyPoints: string;
  probableQuestions: string;
  questionsForLecturer: string;
  importantWords: string;
  createdAt?: string; // optional — render a date chip if your backend supplies it
  duration?: string;  // optional — render a duration chip if your backend supplies it
}

function AppContent() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingPathRef = useRef<string>('');
  const insets = useSafeAreaInsets();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    transcript: false,
    summary: true,
    keyPoints: true,
    probableQuestions: true,
    questionsForLecturer: true,
    importantWords: true,
  });

  useEffect(() => {
    fetchLectures();
    requestMicrophonePermission();
  }, []);

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to record lectures.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Microphone access is required to record.');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const fetchLectures = async () => {
    try {
      const response = await fetch(`${API_URL}/lectures`);
      const data = await response.json();
      setLectures(data);
    } catch (error) {
      console.error('Error fetching lectures:', error);
    }
  };

  const fetchLectureDetail = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/lectures/${id}`);
      const data = await res.json();
      setSelectedLecture(data);
    } catch (e) {
      Alert.alert('Error', 'Could not load lecture.');
    }
  };

  const deleteLecture = async (id: number) => {
    Alert.alert('Delete Lecture', 'Permanently delete this lecture?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API_URL}/lectures/${id}`, { method: 'DELETE' });
          setLectures(prev => prev.filter((l: any) => l.id !== id));
          if (selectedLecture && selectedLecture.id === id) setSelectedLecture(null);
        } catch (e) { Alert.alert('Error', 'Failed to delete.'); }
      }}
    ]);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };
  const enterSelect = (id?: number) => {
    setIsSelecting(true);
    if (id !== undefined) setSelectedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  };
  const exitSelect = () => {
    setIsSelecting(false);
    setSelectedIds([]);
  };

  const shareDetail = (lec: any) => {
    const msg = `${lec.title}\n\nSummary:\n${lec.summary || ''}\n\nKey Points:\n${lec.keyPoints || ''}\n\nQuestions to Ask Lecturer:\n${lec.questionsForLecturer || ''}\n\nImportant Words:\n${lec.importantWords || ''}`;
    Share.share({ message: msg, title: lec.title });
  };

  const bulkShare = async () => {
    try {
      const details = await Promise.all(
        selectedIds.map(id => fetch(`${API_URL}/lectures/${id}`).then(r => r.json()))
      );
      const msg = details.map(l =>
        `== ${l.title} ==\nSummary: ${l.summary || ''}\nKey Points: ${l.keyPoints || ''}\nQuestions: ${l.questionsForLecturer || ''}`
      ).join('\n\n---\n\n');
      Share.share({ message: msg });
      exitSelect();
    } catch (e) {
      Alert.alert('Error', 'Failed to share.');
    }
  };

  const bulkDelete = () => {
    Alert.alert('Delete', `Delete ${selectedIds.length} lecture(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await Promise.all(selectedIds.map(id => fetch(`${API_URL}/lectures/${id}`, { method: 'DELETE' })));
        setLectures(prev => prev.filter((l: any) => !selectedIds.includes(l.id)));
        exitSelect();
      }}
    ]);
  };

  const startRecording = async () => {
    try {
      const result = await audioRecorderPlayer.startRecorder();
      recordingPathRef.current = result;
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Make sure microphone permission is granted.');
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      await audioRecorderPlayer.stopRecorder();
      setIsRecording(false);
      if (recordingPathRef.current) {
        await uploadRecording(recordingPathRef.current, `Lecture ${new Date().toLocaleTimeString()}`);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const uploadRecording = async (filePath: string, title: string) => {
    setLoading(true);
    try {
      const fs = require('react-native-fs');
      const base64 = await fs.readFile(filePath, 'base64');
      const response = await fetch(`${API_URL}/lectures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, audioBase64: base64 }),
      });
      if (response.ok) {
        Alert.alert('Success', 'Lecture uploaded! Processing...');
        setTimeout(fetchLectures, 2000);
      } else {
        Alert.alert('Error', 'Failed to upload lecture.');
      }
    } catch (error: any) {
      console.error('Error uploading:', error);
      Alert.alert('Upload Error', error?.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.pick({ type: [DocumentPicker.types.audio] });
      if (result[0]?.uri) {
        const RNFS = require('react-native-fs');
        const uri = result[0].uri;
        const rawPath = decodeURIComponent(uri.replace('file://', ''));
        const destPath = RNFS.TemporaryDirectoryPath + '/upload_' + Date.now() + '.m4a';
        await RNFS.copyFile(rawPath, destPath);
        await uploadRecording(destPath, result[0].name || 'Uploaded Lecture');
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Pick error:', error);
        Alert.alert('Error', 'Could not pick file.');
      }
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  /* ===================== DETAIL ===================== */
  if (selectedLecture) {
    const words = (selectedLecture.importantWords || '')
      .split(/[,\n]/).map(w => w.trim()).filter(Boolean);

    const collapsible = [
      { key: 'keyPoints', label: 'Key Points', content: selectedLecture.keyPoints },
      { key: 'probableQuestions', label: 'Probable Exam Questions', content: selectedLecture.probableQuestions },
      { key: 'questionsForLecturer', label: 'Ask the Lecturer', content: selectedLecture.questionsForLecturer },
    ];

    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSelectedLecture(null)}>
            <Back size={20} color={C.body} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sharePill} onPress={() => shareDetail(selectedLecture)}>
            <ShareIcon size={15} color="#fff" />
            <Text style={styles.sharePillText}>Share</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.metaRow}>
            {!!selectedLecture.createdAt && <Text style={styles.metaDate}>{selectedLecture.createdAt}</Text>}
            {!!selectedLecture.duration && (
              <>
                {!!selectedLecture.createdAt && <View style={styles.metaDot} />}
                <Text style={styles.metaDate}>{selectedLecture.duration}</Text>
              </>
            )}
          </View>
          <Text style={styles.detailTitle}>{selectedLecture.title}</Text>

          {/* Summary hero */}
          {!!selectedLecture.summary && (
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.heroIcon}><DocIcon /></View>
                <Text style={styles.heroLabel}>Summary</Text>
              </View>
              <Text style={styles.heroText}>{selectedLecture.summary}</Text>
            </View>
          )}

          {/* Collapsible text sections */}
          {collapsible.map(({ key, label, content }) => (
            <View key={key} style={styles.sectionCard}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(key)} activeOpacity={0.7}>
                <Text style={styles.sectionTitle}>{label}</Text>
                <Chevron open={!!expandedSections[key]} />
              </TouchableOpacity>
              {expandedSections[key] && <Text style={styles.sectionText}>{content}</Text>}
            </View>
          ))}

          {/* Key Terms as chips */}
          {words.length > 0 && (
            <View style={styles.sectionCard}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('importantWords')} activeOpacity={0.7}>
                <Text style={styles.sectionTitle}>Key Terms</Text>
                <Chevron open={!!expandedSections.importantWords} />
              </TouchableOpacity>
              {expandedSections.importantWords && (
                <View style={styles.chipWrap}>
                  {words.map((w, i) => (
                    <View key={i} style={styles.chip}><Text style={styles.chipText}>{w}</Text></View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Transcript */}
          {!!selectedLecture.transcript && (
            <View style={styles.sectionCard}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('transcript')} activeOpacity={0.7}>
                <Text style={styles.sectionTitle}>Full Transcript</Text>
                <Chevron open={!!expandedSections.transcript} />
              </TouchableOpacity>
              {expandedSections.transcript && <Text style={styles.transcriptText}>{selectedLecture.transcript}</Text>}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ===================== LIST ===================== */
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.listHeader}>
        <View style={styles.brandRow}>
          <LogoMark tile={38} />
          <Text style={styles.header}>Lectures</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, isSelecting && styles.iconBtnActive]}
          onPress={() => (isSelecting ? exitSelect() : enterSelect())}
        >
          <SelectIcon size={20} color={isSelecting ? '#fff' : C.body} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Processing…</Text>
        </View>
      )}

      <ScrollView style={styles.lecturesList} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        {lectures.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyTile}><LogoMark tile={64} /></View>
            <Text style={styles.emptyTitle}>No recordings yet</Text>
            <Text style={styles.emptyText}>Tap the mic to record a lecture or meeting, or upload an audio file.</Text>
          </View>
        ) : (
          lectures.map(lecture => {
            const selected = selectedIds.includes(lecture.id);
            return (
              <TouchableOpacity
                key={lecture.id}
                activeOpacity={0.85}
                style={[styles.lectureCard, selected && styles.lectureCardSelected]}
                onPress={() => (isSelecting ? toggleSelect(lecture.id) : fetchLectureDetail(lecture.id))}
                onLongPress={() => enterSelect(lecture.id)}
              >
                <View style={styles.cardRow}>
                  {isSelecting && (
                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                      {selected && <Check />}
                    </View>
                  )}
                  <View style={styles.cardContent}>
                    <Text style={styles.lectureTitle} numberOfLines={2}>{lecture.title}</Text>
                    <Text style={styles.lectureSummary} numberOfLines={2}>
                      {lecture.summary || 'Processing…'}
                    </Text>
                    {!!lecture.duration && (
                      <View style={styles.durationRow}>
                        <Clock size={13} color={C.faint} />
                        <Text style={styles.durationText}>{lecture.duration}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* selection action bar */}
      {isSelecting && (
        <View style={styles.selectBar}>
          <Text style={styles.selectCount}>{selectedIds.length} selected</Text>
          <TouchableOpacity onPress={bulkShare} style={styles.selectAction}>
            <ShareIcon size={15} color={C.paper} />
            <Text style={styles.selectActionText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={bulkDelete} style={styles.selectActionDanger}>
            <Trash size={15} color="#fff" />
            <Text style={styles.selectDangerText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* floating actions */}
      {!isSelecting && (
        <View style={styles.fabContainer}>
          <View style={styles.fabItem}>
            <TouchableOpacity style={styles.fabUpload} onPress={pickFile} disabled={loading || isRecording}>
              <Upload size={22} color="#3C3833" />
            </TouchableOpacity>
            <Text style={styles.fabLabel}>Upload</Text>
          </View>
          <View style={styles.fabItem}>
            <TouchableOpacity
              style={[styles.fabRecord, isRecording && styles.fabRecordActive]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={loading}
            >
              {isRecording ? <View style={styles.stopSquare} /> : <Mic size={26} color="#fff" sw={2} />}
            </TouchableOpacity>
            <Text style={[styles.fabLabel, isRecording && styles.fabLabelRec]}>
              {isRecording ? formatTime(recordingTime) : 'Record'}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },

  /* list header */
  listHeader: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  header: { fontFamily: SERIF, fontSize: 34, fontWeight: '500', color: C.ink, letterSpacing: -0.5 },
  iconBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: '#E3DDD2', alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { backgroundColor: C.accent, borderColor: C.accent },

  loadingContainer: { alignItems: 'center', paddingVertical: 28 },
  loadingText: { marginTop: 12, color: C.muted, fontSize: 14 },

  lecturesList: { flex: 1, paddingHorizontal: 22 },

  /* empty state */
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
  emptyTile: { marginBottom: 22 },
  emptyTitle: { fontFamily: SERIF, fontSize: 22, fontWeight: '500', color: C.ink, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: C.muted, fontSize: 14, lineHeight: 21, maxWidth: 260 },

  /* list card */
  lectureCard: { backgroundColor: C.card, borderRadius: 20, padding: 17, marginBottom: 13, borderWidth: 1, borderColor: C.hair },
  lectureCardSelected: { backgroundColor: C.accentTintBg, borderColor: C.accent, borderWidth: 1.5 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardContent: { flex: 1, minWidth: 0 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  cardMetaDate: { fontSize: 11, fontWeight: '600', color: C.faint },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#CFC8BB', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxSelected: { backgroundColor: C.accent, borderColor: C.accent },
  lectureTitle: { fontFamily: SERIF, fontSize: 20, fontWeight: '500', color: C.ink, letterSpacing: -0.2, marginBottom: 6, lineHeight: 24 },
  lectureSummary: { fontSize: 13.5, color: C.muted, lineHeight: 20 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11 },
  durationText: { fontSize: 12, fontWeight: '600', color: '#A7A092', letterSpacing: 0.2 },

  /* selection bar */
  selectBar: { position: 'absolute', left: 16, right: 16, bottom: 28, backgroundColor: C.ink, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.28, shadowRadius: 20, elevation: 10 },
  selectCount: { flex: 1, fontSize: 14, fontWeight: '600', color: C.paper },
  selectAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 12 },
  selectActionText: { color: C.paper, fontSize: 13, fontWeight: '600' },
  selectActionDanger: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(180,69,58,0.92)', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 12 },
  selectDangerText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  /* FABs */
  fabContainer: { position: 'absolute', right: 22, bottom: 30, alignItems: 'center', gap: 16 },
  fabItem: { alignItems: 'center', gap: 5 },
  fabUpload: { width: 50, height: 50, borderRadius: 17, backgroundColor: C.card, borderWidth: 1, borderColor: '#E6E0D5', alignItems: 'center', justifyContent: 'center', shadowColor: '#1E1C19', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4 },
  fabRecord: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 22, elevation: 8 },
  fabRecordActive: { backgroundColor: C.danger, shadowColor: C.danger },
  stopSquare: { width: 20, height: 20, borderRadius: 5, backgroundColor: '#fff' },
  fabLabel: { fontSize: 11, fontWeight: '700', color: C.faint, letterSpacing: 0.3 },
  fabLabelRec: { color: C.danger },

  /* detail */
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10 },
  sharePill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.accent, height: 42, paddingHorizontal: 16, borderRadius: 13 },
  sharePillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  detailsScroll: { flex: 1, paddingHorizontal: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  metaDate: { fontSize: 11, fontWeight: '600', color: C.faint },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#C9C1B3' },
  detailTitle: { fontFamily: SERIF, fontSize: 29, fontWeight: '500', color: C.ink, letterSpacing: -0.4, lineHeight: 33, marginBottom: 22 },

  heroCard: { backgroundColor: C.card, borderWidth: 1, borderColor: '#EAE4D9', borderRadius: 20, padding: 20, marginBottom: 14 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  heroIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontSize: 13, fontWeight: '700', color: C.ink, letterSpacing: 0.3 },
  heroText: { fontSize: 15, lineHeight: 24, color: C.body },

  sectionCard: { backgroundColor: C.card, borderWidth: 1, borderColor: '#EAE4D9', borderRadius: 20, paddingHorizontal: 20, marginBottom: 14, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.ink, letterSpacing: 0.3 },
  sectionText: { fontSize: 14, lineHeight: 22, color: C.body, paddingBottom: 20 },
  transcriptText: { fontSize: 13.5, lineHeight: 24, color: '#6E685D', paddingBottom: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 20 },
  chip: { backgroundColor: C.accentSoft, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 10 },
  chipText: { fontSize: 13, fontWeight: '600', color: C.accent },
});
