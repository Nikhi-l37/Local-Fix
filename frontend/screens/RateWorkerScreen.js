import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API_BASE from '../config';

export default function RateWorkerScreen({ route, navigation }) {
  const { worker } = route.params;
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSubmit = async () => {
    if (rating === 0) { Alert.alert('Error', 'Please select a star rating'); return; }

    try {
      const res = await fetch(`${API_BASE}/api/worker/${worker.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review, reviewerName: 'App User' })
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else { Alert.alert('Error', data.error); }
    } catch (err) {
      Alert.alert('Network Error', 'Could not submit rating');
    }
  };

  if (submitted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successText}>Your rating for {worker.name} has been submitted successfully.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back to Search</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.workerCard}>
        <View style={styles.avatarCircle}><Text style={styles.avatarText}>{worker.name.charAt(0)}</Text></View>
        <Text style={styles.workerName}>{worker.name}</Text>
        <Text style={styles.workerCategory}>{worker.category}</Text>
      </View>

      <Text style={styles.sectionTitle}>How was your experience?</Text>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text style={[styles.star, star <= rating && styles.starActive]}>
              {star <= rating ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingLabel}>
        {rating === 0 ? 'Tap to rate' : ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
      </Text>

      <Text style={styles.sectionTitle}>Write a review (optional)</Text>
      <TextInput
        style={styles.reviewInput}
        placeholder="e.g. 'Very professional, fixed the issue quickly!'"
        placeholderTextColor="#a0aec0"
        multiline numberOfLines={4}
        value={review} onChangeText={setReview}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit Rating</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', paddingHorizontal: 20 },
  workerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#3182ce', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  workerName: { fontSize: 20, fontWeight: 'bold', color: '#2d3748' },
  workerCategory: { fontSize: 14, color: '#718096', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#4a5568', marginBottom: 12 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 8 },
  star: { fontSize: 44, color: '#e2e8f0' },
  starActive: { color: '#ecc94b' },
  ratingLabel: { textAlign: 'center', fontSize: 16, color: '#718096', marginBottom: 24, fontWeight: '500' },
  reviewInput: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1.5, borderColor: '#e2e8f0', minHeight: 100, textAlignVertical: 'top', color: '#2d3748', marginBottom: 20 },
  submitButton: { backgroundColor: '#ecc94b', borderRadius: 12, padding: 16, alignItems: 'center' },
  submitButtonText: { color: '#744210', fontSize: 17, fontWeight: 'bold' },
  successCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', marginTop: 40, borderWidth: 1, borderColor: '#e2e8f0' },
  successIcon: { fontSize: 48, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#2d3748', marginBottom: 8 },
  successText: { fontSize: 15, color: '#718096', textAlign: 'center', marginBottom: 24 },
  backButton: { backgroundColor: '#3182ce', borderRadius: 12, padding: 14, paddingHorizontal: 24 },
  backButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
