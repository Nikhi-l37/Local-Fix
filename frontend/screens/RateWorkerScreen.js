import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API_BASE from '../config';
import { colors, spacing, borderRadius } from '../theme';

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
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
  workerCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: 26, fontWeight: 'bold', color: colors.textInverse },
  workerName: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  workerCategory: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md, marginTop: spacing.lg, textTransform: 'uppercase', letterSpacing: 0.5 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.md },
  star: { fontSize: 48, color: colors.border },
  starActive: { color: colors.warning },
  ratingLabel: { textAlign: 'center', fontSize: 16, color: colors.textPrimary, marginBottom: spacing.xl, fontWeight: '600' },
  reviewInput: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, fontSize: 15, borderWidth: 1.5, borderColor: colors.border, minHeight: 100, textAlignVertical: 'top', color: colors.textPrimary, marginBottom: spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  submitButton: { backgroundColor: colors.warning, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  submitButtonText: { color: colors.textInverse, fontSize: 17, fontWeight: 'bold' },
  successCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xxxl, alignItems: 'center', marginTop: spacing.xxxl, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  successIcon: { fontSize: 56, marginBottom: spacing.lg },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.sm },
  successText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  backButton: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.md, paddingHorizontal: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  backButtonText: { color: colors.textInverse, fontSize: 15, fontWeight: 'bold' },
});
