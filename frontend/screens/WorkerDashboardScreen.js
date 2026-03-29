import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API_BASE from '../config';

export default function WorkerDashboardScreen({ route }) {
  const { phone, workerName } = route.params;
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const fetchMyProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/workers?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      setWorkers(data);
    } catch (err) {
      Alert.alert('Error', 'Could not fetch profile');
    } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchMyProfile(); }, []));

  const toggleAvailability = async (workerId) => {
    try {
      const res = await fetch(`${API_BASE}/api/worker/${workerId}/availability`, { method: 'PUT' });
      const data = await res.json();
      setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, available: data.available } : w));
    } catch (err) {
      Alert.alert('Error', 'Could not update availability');
    }
  };

  if (loading) {
    return (<View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3182ce" /><Text style={styles.loadingText}>Loading your profile...</Text></View>);
  }

  const totalJobs = workers.reduce((sum, w) => sum + (w.jobsDone || 0), 0);
  const avgRating = workers.length > 0 ? (workers.reduce((sum, w) => sum + w.rating, 0) / workers.length).toFixed(1) : '0';
  const totalReviews = workers.reduce((sum, w) => sum + (w.totalRatings || 0), 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}><Text style={styles.avatarText}>{workerName.charAt(0)}</Text></View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.profileName}>{workerName}</Text>
          <Text style={styles.profilePhone}>{phone}</Text>
          <Text style={styles.verifiedBadge}>✅ Verified Worker</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalJobs}</Text>
          <Text style={styles.statLabel}>Jobs Done</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>⭐ {avgRating}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalReviews}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      {/* Skills & Availability */}
      <Text style={styles.sectionTitle}>Your Skills & Availability</Text>
      <FlatList
        data={workers}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.skillCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.skillName}>{item.category}</Text>
              <Text style={styles.skillMeta}>⭐ {item.rating} · {item.jobsDone} jobs · Since {item.memberSince}</Text>
            </View>
            <TouchableOpacity
              style={[styles.availToggle, item.available ? styles.toggleAvailable : styles.toggleOffline]}
              onPress={() => toggleAvailability(item.id)}>
              <Text style={styles.toggleText}>{item.available ? '🟢 Online' : '🔴 Offline'}</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Incoming Requests Section */}
      <View style={styles.requestsCard}>
        <Text style={styles.requestsTitle}>📥 Incoming Job Requests</Text>
        <View style={styles.requestItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.requestText}>Ravi Kumar needs a <Text style={{ fontWeight: 'bold' }}>{workers[0]?.category || 'Worker'}</Text></Text>
            <Text style={styles.requestDistance}>📍 1.2 km away · Just now</Text>
          </View>
          <View style={styles.requestActions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => Alert.alert('Accepted ✅', 'You accepted the job request!')}>
              <Text style={styles.actionText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn} onPress={() => Alert.alert('Declined', 'Job request declined')}>
              <Text style={styles.actionText}>✗</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.requestItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.requestText}>Priya Sharma needs a <Text style={{ fontWeight: 'bold' }}>{workers[0]?.category || 'Worker'}</Text></Text>
            <Text style={styles.requestDistance}>📍 3.5 km away · 5 min ago</Text>
          </View>
          <View style={styles.requestActions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => Alert.alert('Accepted ✅', 'You accepted the job request!')}>
              <Text style={styles.actionText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn} onPress={() => Alert.alert('Declined', 'Job request declined')}>
              <Text style={styles.actionText}>✗</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', paddingHorizontal: 18 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#718096' },

  profileCard: { backgroundColor: '#2d3748', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#3182ce', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  profilePhone: { fontSize: 13, color: '#a0aec0', marginTop: 2 },
  verifiedBadge: { fontSize: 12, color: '#48bb78', fontWeight: '600', marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#2d3748' },
  statLabel: { fontSize: 11, color: '#a0aec0', marginTop: 4, fontWeight: '500' },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#4a5568', marginBottom: 10 },
  skillCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  skillName: { fontSize: 16, fontWeight: 'bold', color: '#2d3748' },
  skillMeta: { fontSize: 12, color: '#718096', marginTop: 3 },
  availToggle: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  toggleAvailable: { backgroundColor: '#c6f6d5' },
  toggleOffline: { backgroundColor: '#fed7d7' },
  toggleText: { fontSize: 13, fontWeight: '600' },

  requestsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 8, marginBottom: 20 },
  requestsTitle: { fontSize: 15, fontWeight: 'bold', color: '#2d3748', marginBottom: 12 },
  requestItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f4f8' },
  requestText: { fontSize: 14, color: '#4a5568' },
  requestDistance: { fontSize: 12, color: '#a0aec0', marginTop: 3 },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { backgroundColor: '#c6f6d5', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  declineBtn: { backgroundColor: '#fed7d7', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 18, fontWeight: 'bold' },
});
