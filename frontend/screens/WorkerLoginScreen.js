import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import API_BASE from '../config';
import { colors, shadows, spacing, borderRadius, typography } from '../theme';

const ALL_SKILLS = [
  'Plumber', 'Electrician', 'Carpenter', 'AC Mechanic', 'Painter',
  'Cleaner', 'JCB Operator', 'Mason', 'Welder', 'Pest Control',
  'Tractor Operator', 'Appliance Repair', 'Gardener', 'Auto Mechanic'
];

export default function WorkerLoginScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const toggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleRegister = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Please enter your name'); return; }
    if (!phone.trim() || phone.length < 10) { Alert.alert('Error', 'Please enter a valid phone number'); return; }
    if (selectedSkills.length === 0) { Alert.alert('Error', 'Please select at least one skill'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/worker/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone: `+91 ${phone}`, aadhaarLast4: aadhaar,
          skills: selectedSkills
        })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('🎉 Registration Successful!', `Welcome to LocalFix, ${name}! You are now discoverable by nearby users.`, [
          { text: 'Go to Dashboard', onPress: () => navigation.replace('WorkerDashboard', { phone: `+91 ${phone}`, workerName: name }) }
        ]);
      } else { Alert.alert('Error', data.error); }
    } catch (err) {
      Alert.alert('Network Error', 'Could not connect to server');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[colors.primaryDark, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerCard}>
        <View style={styles.headerCardContent}>
          <MaterialIcons name="engineering" size={48} color={colors.textInverse} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Worker Registration</Text>
          <Text style={styles.headerSub}>Join LocalFix — Free forever, no commission</Text>
        </View>
      </LinearGradient>

      <Text style={styles.label}>Full Name *</Text>
      <TextInput style={styles.input} placeholder="Enter your full name" placeholderTextColor="#a0aec0" value={name} onChangeText={setName} />

      <Text style={styles.label}>Phone Number *</Text>
      <View style={styles.phoneRow}>
        <View style={styles.phonePrefix}><Text style={styles.phonePrefixText}>+91</Text></View>
        <TextInput style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
          placeholder="9876543210" placeholderTextColor="#a0aec0" keyboardType="phone-pad"
          maxLength={10} value={phone} onChangeText={setPhone} />
      </View>

      <Text style={styles.label}>Aadhaar (Last 4 Digits)</Text>
      <TextInput style={styles.input} placeholder="e.g. 1234" placeholderTextColor="#a0aec0"
        keyboardType="number-pad" maxLength={4} value={aadhaar} onChangeText={setAadhaar} />

      <Text style={styles.label}>Select Your Skills *</Text>
      <Text style={styles.subLabel}>Tap to select one or more skills</Text>
      <View style={styles.skillsGrid}>
        {ALL_SKILLS.map(skill => (
          <TouchableOpacity key={skill}
            style={[styles.skillChip, selectedSkills.includes(skill) && styles.skillChipActive]}
            onPress={() => toggleSkill(skill)}>
            <Text style={[styles.skillText, selectedSkills.includes(skill) && styles.skillTextActive]}>{skill}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
        <Text style={styles.registerButtonText}>{loading ? 'Registering...' : '✅ Register Free'}</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>Your data is secure. No fees, ever.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
  headerCard: { borderRadius: borderRadius.xl, overflow: 'hidden', marginBottom: spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  headerCardContent: { alignItems: 'center', padding: spacing.xl },
  headerIcon: { marginBottom: spacing.md, tintColor: colors.textInverse },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: colors.textInverse, textAlign: 'center' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: spacing.sm, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, marginLeft: spacing.xs, textTransform: 'uppercase' },
  subLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md, marginLeft: spacing.xs },
  input: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, fontSize: 15, borderWidth: 1.5, borderColor: colors.border, color: colors.textPrimary, marginBottom: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'stretch', marginBottom: spacing.md },
  phonePrefix: { backgroundColor: colors.background, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1.5, borderColor: colors.border, borderRightWidth: 0 },
  phonePrefixText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  skillChip: { backgroundColor: colors.surface, borderRadius: borderRadius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 2, borderColor: colors.border },
  skillChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  skillText: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  skillTextActive: { color: colors.textInverse },
  registerButton: { backgroundColor: colors.success, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  registerButtonText: { color: colors.textInverse, fontSize: 17, fontWeight: 'bold' },
  footerText: { textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xxxl },
});
