import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API_BASE from '../config';
import { colors, spacing, borderRadius } from '../theme';

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
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: spacing.md, fontSize: 15, color: colors.textSecondary },

  profileCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: colors.textInverse },
  profileName: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  profilePhone: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs },
  verifiedBadge: { fontSize: 12, color: colors.success, fontWeight: '700', marginTop: spacing.xs },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: spacing.xs, fontWeight: '600', textTransform: 'uppercase' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  skillCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  skillName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  skillMeta: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs, fontWeight: '500' },
  availToggle: { borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  toggleAvailable: { backgroundColor: colors.greenBg },
  toggleOffline: { backgroundColor: colors.redBg },
  toggleText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },

  requestsCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  requestsTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.3 },
  requestItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  requestText: { fontSize: 14, color: colors.textPrimary },
  requestDistance: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs, fontWeight: '500' },
  requestActions: { flexDirection: 'row', gap: spacing.md },
  acceptBtn: { backgroundColor: colors.greenBg, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  declineBtn: { backgroundColor: colors.redBg, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  actionText: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
});
