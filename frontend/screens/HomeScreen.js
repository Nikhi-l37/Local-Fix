import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Linking, Modal, ScrollView, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import API_BASE from '../config';

const SUGGESTIONS = [
  'fan not working', 'pipe leaking', 'need a JCB',
  'pankha kharab hai', 'furniture repair', 'cockroach problem',
  'AC not cooling', 'wall painting', 'bike puncture',
];

export default function HomeScreen({ navigation }) {
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [category, setCategory] = useState('');
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);

  // Voice search states
  const recordingRef = useRef(null);
  const isPreparingRecording = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  // Location states
  const [userLocation, setUserLocation] = useState([78.4867, 17.3850]); // Default to Hyderabad
  const [locationName, setLocationName] = useState('📍 Fetching location...');

  React.useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationName('📍 Location permission denied');
          return;
        }

        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation([location.coords.longitude, location.coords.latitude]);

        let geo = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        if (geo && geo.length > 0) {
          const place = geo[0];
          setLocationName(`📍 ${place.city || place.district || place.region}, ${place.region || place.country}`);
        } else {
          setLocationName('📍 Location Found');
        }
      } catch (err) {
        console.warn(err);
        setLocationName('📍 Location Error');
      }
    })();
  }, []);

  // ===== TEXT SEARCH =====
  const handleSearch = async (query) => {
    const searchText = query || problem;
    if (!searchText.trim()) { Alert.alert('Error', 'Please describe your problem!'); return; }

    setLoading(true); setCategory(''); setWorkers([]); setFallbackUsed(false);
    try {
      const response = await fetch(`${API_BASE}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemDescription: searchText, userLocation })
      });
      const data = await response.json();
      if (response.ok) {
        setCategory(data.categoryIdentified);
        setWorkers(data.workers);
        setFallbackUsed(data.fallbackUsed || false);
        if (data.workers.length === 0) Alert.alert('No workers found', `Need: "${data.categoryIdentified}" — none nearby.`);
      } else { Alert.alert('Error', data.error || 'Something went wrong'); }
    } catch (error) {
      Alert.alert('Network Error', 'Ensure the backend server is running and your phone is on the same Wi-Fi.');
    } finally { setLoading(false); }
  };

  // ===== VOICE SEARCH =====
  const startRecording = async () => {
    if (isPreparingRecording.current) return;
    try {
      isPreparingRecording.current = true;
      // Stop any existing recording first
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {}
        recordingRef.current = null;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) { Alert.alert('Permission needed', 'Please allow microphone access'); return; }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    } finally {
      isPreparingRecording.current = false;
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);

    const currentRecording = recordingRef.current;
    if (!currentRecording) return;
    recordingRef.current = null;

    try {
      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();

      if (uri) {
        setVoiceLoading(true);
        setCategory(''); setWorkers([]);
        setProblem('🎤 Processing voice...');

        // Read audio file as base64
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64'  // use string instead of enum
        });

        // Send to backend
        const response = await fetch(`${API_BASE}/api/voice-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64Audio, userLocation })
        });

        const data = await response.json();
        if (response.ok) {
          // Handle voice unavailable due to API limit
          if (data.voiceUnavailable) {
            setProblem('');
            setFallbackUsed(true);
            Alert.alert(
              '🎤 Voice AI Unavailable', 
              'AI quota temporarily exceeded. Please type your problem instead — smart search still works!',
              [{ text: 'OK', style: 'default' }]
            );
          } else {
            setProblem(data.transcript || '🎤 Voice search');
            setCategory(data.categoryIdentified);
            setWorkers(data.workers);
            setFallbackUsed(data.fallbackUsed || false);
            if (data.workers.length === 0) {
              Alert.alert('No workers found', `Heard: "${data.transcript}"\nCategory: "${data.categoryIdentified}" — none nearby.`);
            }
          }
        } else {
          setProblem('');
          Alert.alert('Error', data.error || 'Voice search failed');
        }
        setVoiceLoading(false);
      }
    } catch (err) {
      console.error('Failed to process recording', err);
      setVoiceLoading(false);
      setProblem('');
      Alert.alert('Error', 'Voice processing failed. Please try again.');
    }
  };

  const openWhatsApp = (phone) => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${cleaned}&text=Hi, I found you on LocalFix. I need help with: ${problem}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'WhatsApp is not installed'));
  };

  const renderWorker = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedWorker(item)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.workerName}>{item.name}</Text>
        <View style={styles.ratingBadge}><Text style={styles.ratingText}>⭐ {item.rating}</Text></View>
      </View>
      <View style={styles.infoRow}>
        <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{item.category}</Text></View>
        {item.distanceKm && <Text style={styles.distanceText}>📍 {item.distanceKm} km</Text>}
        {item.jobsDone > 0 && <Text style={styles.distanceText}>🔧 {item.jobsDone} jobs</Text>}
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.callButton} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
          <Text style={styles.callButtonText}>📞 Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.whatsappButton} onPress={() => openWhatsApp(item.phone)}>
          <Text style={styles.callButtonText}>💬 WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <MaterialIcons name="handyman" size={36} color="#fff" style={styles.headerIcon} />
          <View>
            <Text style={styles.header}>LocalFix</Text>
            <Text style={styles.tagline}>AI-powered local worker discovery</Text>
          </View>
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.locationTag}>{locationName}</Text>
          <View style={styles.liveDot} /><Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      {/* Search Input + Mic Button */}
      <Text style={styles.searchLabel}>Describe your problem</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input} placeholder="Type or use mic 🎤 to speak"
          placeholderTextColor="#a0aec0" multiline numberOfLines={2}
          value={problem} onChangeText={setProblem}
        />
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          activeOpacity={0.7}
        >
          <Animated.Text style={[styles.micIcon, { transform: [{ scale: pulseAnim }] }]}>
            {isRecording ? '⏺️' : '🎤'}
          </Animated.Text>
          <Text style={styles.micLabel}>{isRecording ? 'Release' : 'Hold'}</Text>
        </TouchableOpacity>
      </View>

      {/* Voice Loading */}
      {voiceLoading && (
        <View style={styles.voiceLoadingRow}>
          <ActivityIndicator color="#3182ce" />
          <Text style={styles.voiceLoadingText}>🧠 AI is listening and analyzing...</Text>
        </View>
      )}

      {/* Suggestion Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
        {SUGGESTIONS.map((s, i) => (
          <TouchableOpacity key={i} style={styles.chip} onPress={() => { setProblem(s); handleSearch(s); }}>
            <Text style={styles.chipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search Button */}
      <TouchableOpacity style={styles.searchButton} onPress={() => handleSearch()} disabled={loading || voiceLoading}>
        {loading ? (
          <View style={styles.loadingRow}><ActivityIndicator color="#fff" /><Text style={styles.searchButtonText}>  AI analyzing...</Text></View>
        ) : (<Text style={styles.searchButtonText}>🔍 Find Help Nearby</Text>)}
      </TouchableOpacity>

      {/* Results */}
      {category ? (
        <View style={styles.resultHeader}>
          <Text style={styles.categoryFound}>
            {fallbackUsed ? '🔧 Smart Match: ' : '🧠 AI: '}
            <Text style={styles.highlight}>{category}</Text>
          </Text>
          <Text style={styles.resultCount}>{workers.length} found</Text>
        </View>
      ) : null}

      {fallbackUsed && category ? (
        <View style={styles.fallbackBanner}>
          <Text style={styles.fallbackText}>⚡ Using smart local search (AI quota reached)</Text>
        </View>
      ) : null}

      <FlatList data={workers} keyExtractor={item => String(item.id)} renderItem={renderWorker}
        contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} />

      {/* Worker Detail Modal */}
      <Modal visible={!!selectedWorker} transparent animationType="slide" onRequestClose={() => setSelectedWorker(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedWorker(null)}>
          <View style={styles.modalSheet}>
            {selectedWorker && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <View style={styles.avatarCircle}><Text style={styles.avatarText}>{selectedWorker.name.charAt(0)}</Text></View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.modalName}>{selectedWorker.name}</Text>
                    <Text style={styles.verifiedBadge}>✅ Verified Worker</Text>
                  </View>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailCard}><Text style={styles.detailLabel}>Category</Text><Text style={styles.detailValue}>{selectedWorker.category}</Text></View>
                  <View style={styles.detailCard}><Text style={styles.detailLabel}>Rating</Text><Text style={styles.detailValue}>⭐ {selectedWorker.rating}/5 ({selectedWorker.totalRatings || 0})</Text></View>
                  <View style={styles.detailCard}><Text style={styles.detailLabel}>Jobs Done</Text><Text style={styles.detailValue}>🔧 {selectedWorker.jobsDone || 0}</Text></View>
                  <View style={styles.detailCard}><Text style={styles.detailLabel}>Status</Text><Text style={[styles.detailValue, { color: '#38a169' }]}>🟢 Available</Text></View>
                  <View style={styles.detailCard}><Text style={styles.detailLabel}>Distance</Text><Text style={styles.detailValue}>📍 {selectedWorker.distanceKm || '< 5'} km</Text></View>
                  <View style={styles.detailCard}><Text style={styles.detailLabel}>Member Since</Text><Text style={styles.detailValue}>{selectedWorker.memberSince || 'N/A'}</Text></View>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={[styles.modalCallButton, { flex: 1 }]} onPress={() => Linking.openURL(`tel:${selectedWorker.phone}`)}>
                    <Text style={styles.modalCallText}>📞 Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalWhatsappButton, { flex: 1 }]} onPress={() => openWhatsApp(selectedWorker.phone)}>
                    <Text style={styles.modalCallText}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.rateButton} onPress={() => { setSelectedWorker(null); navigation.navigate('RateWorker', { worker: selectedWorker }); }}>
                  <Text style={styles.rateButtonText}>⭐ Rate this Worker</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedWorker(null)}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', paddingHorizontal: 18 },
  headerCard: { backgroundColor: '#1a56a0', borderRadius: 16, padding: 18, marginBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { marginRight: 12 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  tagline: { fontSize: 12, color: '#b3d4fc', marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  locationTag: { fontSize: 13, color: '#d4e6fc', fontWeight: '500' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#48bb78', marginLeft: 12, marginRight: 4 },
  liveText: { fontSize: 12, color: '#48bb78', fontWeight: '700' },
  searchLabel: { fontSize: 14, fontWeight: '600', color: '#4a5568', marginBottom: 6, marginLeft: 2 },

  searchRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 4 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1.5, borderColor: '#e2e8f0', minHeight: 60, textAlignVertical: 'top', color: '#2d3748' },
  micButton: { width: 64, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  micButtonActive: { backgroundColor: '#fed7d7', borderColor: '#fc8181' },
  micIcon: { fontSize: 28 },
  micLabel: { fontSize: 10, color: '#718096', fontWeight: '600', marginTop: 2 },

  voiceLoadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 8 },
  voiceLoadingText: { fontSize: 13, color: '#3182ce', fontWeight: '500' },

  chipsRow: { marginTop: 6, marginBottom: 10, maxHeight: 36 },
  chipsContent: { paddingRight: 10, gap: 8, flexDirection: 'row' },
  chip: { backgroundColor: '#e8f0fe', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#b3d4fc' },
  chipText: { fontSize: 12, color: '#1a56a0', fontWeight: '500' },
  searchButton: { backgroundColor: '#3182ce', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
  searchButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 },
  categoryFound: { fontSize: 14, color: '#4a5568' },
  highlight: { fontWeight: 'bold', color: '#2b6cb0' },
  resultCount: { fontSize: 12, color: '#a0aec0' },
  listContainer: { paddingBottom: 30 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  workerName: { fontSize: 16, fontWeight: 'bold', color: '#2d3748', flex: 1 },
  ratingBadge: { backgroundColor: '#fefcbf', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ratingText: { fontSize: 13, fontWeight: 'bold', color: '#b7791f' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  categoryBadge: { backgroundColor: '#ebf8ff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  categoryBadgeText: { color: '#3182ce', fontSize: 12, fontWeight: '600' },
  distanceText: { fontSize: 12, color: '#718096', fontWeight: '500' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  callButton: { backgroundColor: '#38a169', borderRadius: 10, padding: 11, alignItems: 'center', flex: 1 },
  whatsappButton: { backgroundColor: '#25d366', borderRadius: 10, padding: 11, alignItems: 'center', flex: 1 },
  callButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#3182ce', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  modalName: { fontSize: 18, fontWeight: 'bold', color: '#1a202c' },
  verifiedBadge: { fontSize: 13, color: '#38a169', fontWeight: '600', marginTop: 3 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  detailCard: { backgroundColor: '#f7fafc', borderRadius: 10, padding: 10, width: '48%', borderWidth: 1, borderColor: '#edf2f7' },
  detailLabel: { fontSize: 10, color: '#a0aec0', fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
  detailValue: { fontSize: 14, fontWeight: 'bold', color: '#2d3748' },
  modalCallButton: { backgroundColor: '#38a169', borderRadius: 12, padding: 14, alignItems: 'center' },
  modalWhatsappButton: { backgroundColor: '#25d366', borderRadius: 12, padding: 14, alignItems: 'center' },
  modalCallText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  rateButton: { backgroundColor: '#ecc94b', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 },
  rateButtonText: { color: '#744210', fontSize: 15, fontWeight: 'bold' },
  modalCloseButton: { borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', marginTop: 8 },
  modalCloseText: { color: '#718096', fontSize: 14, fontWeight: '600' },
  fallbackBanner: { backgroundColor: '#fefcbf', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8, borderWidth: 1, borderColor: '#ecc94b' },
  fallbackText: { fontSize: 12, color: '#744210', fontWeight: '500', textAlign: 'center' },
});
