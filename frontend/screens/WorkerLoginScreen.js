import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import API_BASE from '../config';

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
      <View style={styles.headerCard}>
        <MaterialIcons name="engineering" size={48} color="#fff" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Worker Registration</Text>
        <Text style={styles.headerSub}>Join LocalFix — Free forever, no commission</Text>
      </View>

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
  container: { flex: 1, backgroundColor: '#f0f4f8', paddingHorizontal: 20 },
  headerCard: { backgroundColor: '#2d3748', borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 20 },
  headerIcon: { marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: '#a0aec0', marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#4a5568', marginBottom: 6, marginLeft: 2, marginTop: 12 },
  subLabel: { fontSize: 12, color: '#a0aec0', marginBottom: 8, marginLeft: 2 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1.5, borderColor: '#e2e8f0', color: '#2d3748' },
  phoneRow: { flexDirection: 'row', alignItems: 'stretch' },
  phonePrefix: { backgroundColor: '#edf2f7', borderTopLeftRadius: 12, borderBottomLeftRadius: 12, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#e2e8f0', borderRightWidth: 0 },
  phonePrefixText: { fontSize: 15, fontWeight: '600', color: '#4a5568' },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  skillChip: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: '#e2e8f0' },
  skillChipActive: { backgroundColor: '#3182ce', borderColor: '#3182ce' },
  skillText: { fontSize: 13, color: '#4a5568', fontWeight: '500' },
  skillTextActive: { color: '#fff' },
  registerButton: { backgroundColor: '#38a169', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  registerButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  footerText: { textAlign: 'center', fontSize: 12, color: '#a0aec0', marginBottom: 40 },
});
