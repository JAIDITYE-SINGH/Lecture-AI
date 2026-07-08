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
  RefreshControl,
  TextInput,
  Modal,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import DocumentPicker from 'react-native-document-picker';
import { useSafeAreaInsets, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const DEFAULT_API_URL = 'https://lecture-ai-production-4917.up.railway.app';
const audioRecorderPlayer = new AudioRecorderPlayer();

interface Lecture {
  id: number;
  title: string;
  transcript: string;
  summary: string;
  keyPoints: string;
  probableQuestions: string;
  questionsForLecturer: string;
  importantWords: string;
  createdAt: string;
}

function AppContent() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serverError, setServerError] = useState(false);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState(DEFAULT_API_URL);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    transcript: false,
    summary: true,
    keyPoints: true,
    probableQuestions: true,
    questionsForLecturer: true,
    importantWords: true,
  });
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingPathRef = useRef<string>('');
  const insets = useSafeAreaInsets();

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
      const response = await fetch(`${apiUrl}/lectures`);
      const data = await response.json();
      setLectures(data);
      setServerError(false);
    } catch (error) {
      console.error('Error fetching lectures:', error);
      setServerError(true);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLectures();
    setRefreshing(false);
  };

  const fetchLectureDetail = async (id: number) => {
    try {
      const res = await fetch(`${apiUrl}/lectures/${id}`);
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
          await fetch(`${apiUrl}/lectures/${id}`, { method: 'DELETE' });
          setLectures(prev => prev.filter((l: any) => l.id !== id));
          if (selectedLecture && selectedLecture.id === id) setSelectedLecture(null);
        } catch (e) { Alert.alert('Error', 'Failed to delete.'); }
      }}
    ]);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const exitSelect = () => { setIsSelecting(false); setSelectedIds([]); };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const shareDetail = (lec: any) => {
    const msg = `${lec.title}\n\nSummary:\n${lec.summary || ''}\n\nKey Points:\n${lec.keyPoints || ''}\n\nQuestions to Ask Lecturer:\n${lec.questionsForLecturer || ''}\n\nImportant Words:\n${lec.importantWords || ''}`;
    Share.share({ message: msg, title: lec.title });
  };

  const bulkShare = async () => {
    try {
      const details = await Promise.all(selectedIds.map(id => fetch(`${apiUrl}/lectures/${id}`).then(r => r.json())));
      const msg = details.map(l => `== ${l.title} ==\nSummary: ${l.summary || ''}\nKey Points: ${l.keyPoints || ''}\nQuestions: ${l.questionsForLecturer || ''}`).join('\n\n---\n\n');
      Share.share({ message: msg });
      exitSelect();
    } catch (e) { Alert.alert('Error', 'Failed to share.'); }
  };

  const bulkDelete = () => {
    Alert.alert('Delete', `Delete ${selectedIds.length} lecture(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await Promise.all(selectedIds.map(id => fetch(`${apiUrl}/lectures/${id}`, { method: 'DELETE' })));
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
      recordingIntervalRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000);
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
    } catch (error) { console.error('Error stopping recording:', error); }
  };

  const uploadRecording = async (filePath: string, title: string) => {
    setLoading(true);
    try {
      const fs = require('react-native-fs');
      const base64 = await fs.readFile(filePath, 'base64');
      const response = await fetch(`${apiUrl}/lectures`, {
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
    } finally { setLoading(false); }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredLectures = lectures.filter(l =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.summary || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedLecture) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedLecture(null)}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={() => shareDetail(selectedLecture)}>
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.detailTitle}>{selectedLecture.title}</Text>
          {selectedLecture.createdAt && (
            <Text style={styles.detailDate}>{formatDate(selectedLecture.createdAt)}</Text>
          )}

          {[
            { key: 'transcript', label: 'Transcript', content: selectedLecture.transcript },
            { key: 'summary', label: 'Summary', content: selectedLecture.summary },
            { key: 'keyPoints', label: 'Key Points', content: selectedLecture.keyPoints },
            { key: 'probableQuestions', label: 'Probable Questions', content: selectedLecture.probableQuestions },
            { key: 'questionsForLecturer', label: 'Questions for Lecturer', content: selectedLecture.questionsForLecturer },
            { key: 'importantWords', label: 'Important Words', content: selectedLecture.importantWords },
          ].map(({ key, label, content }) => (
            <View key={key} style={styles.section}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(key)}>
                <Text style={styles.sectionTitle}>{label}</Text>
                <Text style={styles.sectionChevron}>{expandedSections[key] ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {expandedSections[key] && <Text style={styles.sectionText}>{content}</Text>}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingsSection}>
            <Text style={styles.settingsLabel}>Server URL</Text>
            <TextInput
              style={styles.settingsInput}
              value={tempUrl}
              onChangeText={setTempUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://hostname.local:3000"
            />
            <TouchableOpacity
              style={styles.settingsSave}
              onPress={() => { setApiUrl(tempUrl); setShowSettings(false); fetchLectures(); }}
            >
              <Text style={styles.settingsSaveText}>Save & Reconnect</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingsSection}>
            <Text style={styles.settingsLabel}>Status</Text>
            <Text style={[styles.statusText, { color: serverError ? '#FF3B30' : '#34C759' }]}>
              {serverError ? '● Unreachable' : '● Connected'}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      <View style={styles.headerRow}>
        <Text style={styles.header}>LectureApp</Text>
        <TouchableOpacity onPress={() => { setTempUrl(apiUrl); setShowSettings(true); }} style={styles.settingsBtn}>
          <Text style={styles.settingsBtnText}>⚙</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search lectures..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {serverError && (
        <TouchableOpacity style={styles.errorBanner} onPress={fetchLectures}>
          <Text style={styles.errorBannerText}>Can't reach server — tap to retry</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

      <ScrollView
        style={styles.lecturesList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredLectures.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No results found' : 'No lectures yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'Record or upload a lecture to get started'}
            </Text>
          </View>
        ) : (
          filteredLectures.map(lecture => (
            <TouchableOpacity
              key={lecture.id}
              style={[styles.lectureCard, selectedIds.includes(lecture.id) && styles.lectureCardSelected]}
              onPress={() => isSelecting ? toggleSelect(lecture.id) : fetchLectureDetail(lecture.id)}
              onLongPress={() => { setIsSelecting(true); if (!selectedIds.includes(lecture.id)) setSelectedIds(prev => [...prev, lecture.id]); }}
            >
              <View style={styles.cardRow}>
                {isSelecting && (
                  <View style={[styles.checkbox, selectedIds.includes(lecture.id) && styles.checkboxSelected]}>
                    {selectedIds.includes(lecture.id) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                )}
                <View style={styles.cardContent}>
                  <Text style={styles.lectureTitle}>{lecture.title}</Text>
                  {lecture.createdAt && <Text style={styles.lectureDate}>{formatDate(lecture.createdAt)}</Text>}
                  <Text style={styles.lectureSummary} numberOfLines={2}>{lecture.summary || 'Processing...'}</Text>
                  {!isSelecting && (
                    <TouchableOpacity onPress={() => deleteLecture(lecture.id)} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {isSelecting && (
        <View style={styles.selectBar}>
          <Text style={styles.selectCount}>{selectedIds.length} selected</Text>
          <TouchableOpacity onPress={bulkShare} style={styles.selectAction}><Text style={styles.selectActionText}>Share</Text></TouchableOpacity>
          <TouchableOpacity onPress={bulkDelete} style={styles.selectActionDanger}><Text style={styles.selectDangerText}>Delete</Text></TouchableOpacity>
          <TouchableOpacity onPress={exitSelect}><Text style={styles.selectCancelText}>Cancel</Text></TouchableOpacity>
        </View>
      )}

      {!isSelecting && (
        <View style={styles.fabContainer}>
          <View style={styles.fabItem}>
            <TouchableOpacity style={styles.fabUpload} onPress={pickFile} disabled={loading || isRecording}>
              <Text style={styles.fabIcon}>⬆</Text>
            </TouchableOpacity>
            <Text style={styles.fabLabel}>Upload</Text>
          </View>
          <View style={styles.fabItem}>
            <TouchableOpacity style={[styles.fabRecord, isRecording && styles.fabRecordActive]} onPress={isRecording ? stopRecording : startRecording} disabled={loading}>
              <Text style={styles.fabIcon}>{isRecording ? '⏹' : '⏺'}</Text>
            </TouchableOpacity>
            <Text style={styles.fabLabel}>{isRecording ? formatTime(recordingTime) : 'Rec'}</Text>
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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  header: { fontSize: 28, fontWeight: '700', paddingVertical: 16, color: '#000' },
  settingsBtn: { padding: 8 },
  settingsBtnText: { fontSize: 22, color: '#666' },
  searchContainer: { paddingHorizontal: 20, paddingBottom: 10 },
  searchInput: { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 0.5, borderColor: '#E5E5EA' },
  errorBanner: { backgroundColor: '#FFF0F0', marginHorizontal: 20, marginBottom: 8, padding: 12, borderRadius: 10 },
  errorBannerText: { color: '#FF3B30', fontSize: 13, textAlign: 'center', fontWeight: '500' },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  lecturesList: { flex: 1, paddingHorizontal: 20 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', paddingHorizontal: 40 },
  lectureCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
  lectureCardSelected: { borderColor: '#007AFF', borderWidth: 2, borderLeftWidth: 2, backgroundColor: '#EEF4FF' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardContent: { flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxSelected: { backgroundColor: '#007AFF' },
  checkmark: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  lectureTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
  lectureDate: { fontSize: 11, color: '#999', marginBottom: 6 },
  lectureSummary: { fontSize: 14, color: '#666', lineHeight: 20 },
  backButton: { paddingHorizontal: 20, paddingVertical: 12 },
  backText: { fontSize: 16, color: '#007AFF', fontWeight: '500' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  shareBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#007AFF', borderRadius: 8 },
  shareBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  detailsScroll: { flex: 1, paddingHorizontal: 20 },
  detailTitle: { fontSize: 24, fontWeight: '700', color: '#000', marginBottom: 4 },
  detailDate: { fontSize: 12, color: '#999', marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA', marginBottom: 8 },
  sectionChevron: { fontSize: 12, color: '#999' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  sectionText: { fontSize: 14, color: '#333', lineHeight: 22 },
  deleteBtn: { alignSelf: 'flex-end', marginTop: 6, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#FFF0F0', borderRadius: 8 },
  deleteBtnText: { color: '#FF3B30', fontSize: 13, fontWeight: '600' },
  selectBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: '#E5E5EA', gap: 12 },
  selectCount: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  selectAction: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#007AFF', borderRadius: 8 },
  selectActionText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  selectActionDanger: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#FFF0F0', borderRadius: 8 },
  selectDangerText: { color: '#FF3B30', fontSize: 13, fontWeight: '600' },
  selectCancelText: { color: '#666', fontSize: 13 },
  fabContainer: { position: 'absolute', right: 20, bottom: 36, alignItems: 'center', gap: 12 },
  fabRecord: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 6 },
  fabRecordActive: { backgroundColor: '#CC2200' },
  fabUpload: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
  fabIcon: { color: '#FFF', fontSize: 20 },
  fabItem: { alignItems: 'center', gap: 4 },
  fabLabel: { color: '#555', fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  recordingContainer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  modalContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  modalClose: { fontSize: 16, color: '#007AFF', fontWeight: '500' },
  settingsSection: { backgroundColor: '#FFF', marginTop: 20, padding: 16, marginHorizontal: 16, borderRadius: 12 },
  settingsLabel: { fontSize: 12, color: '#999', fontWeight: '500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingsInput: { borderWidth: 0.5, borderColor: '#E5E5EA', borderRadius: 8, padding: 10, fontSize: 14, color: '#000', marginBottom: 12 },
  settingsSave: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center' },
  settingsSaveText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  statusText: { fontSize: 14, fontWeight: '500' },
});
