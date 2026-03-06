import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  FlatList, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { doctorAPI } from '../../services/api';

/**
 * DoctorUploadScreen
 * Step 1: Select a patient → then navigate to DoctorQuickUploadScreen
 */
export default function DoctorUploadScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (search.trim()) {
      setFiltered(patients.filter(p =>
        (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.mrn || '').toLowerCase().includes(search.toLowerCase())
      ));
    } else {
      setFiltered(patients);
    }
  }, [search, patients]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await doctorAPI.getPatients();
      const data = response.data?.all_patients || response.data?.patients || (Array.isArray(response.data) ? response.data : []) || [];
      setPatients(data);
      setFiltered(data);
    } catch (error) {
      console.error('Error loading patients:', error);
      Alert.alert('Error', 'Could not load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient) => {
    navigation.navigate('DoctorQuickUploadScreen', { patient });
  };

  const renderPatient = ({ item }) => (
    <TouchableOpacity style={styles.patientRow} onPress={() => handleSelectPatient(item)}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.name || item.full_name || 'Unknown'}</Text>
        <Text style={styles.patientMeta}>MRN: {item.mrn || 'N/A'} · DOB: {item.dob || 'N/A'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload Document</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Instruction */}
        <View style={styles.instructionBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.instructionText}>
            Select a patient to upload a document for
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or MRN..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Patient List */}
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading patients...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={60} color="#DDD" />
            <Text style={styles.emptyText}>
              {search ? 'No patients found' : 'No patients yet'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderPatient}
            keyExtractor={(item, i) => item.id || String(i)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFC' },
  content: { flex: 1, padding: 20 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },

  instructionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#E3F2FD', borderRadius: 12, padding: 14, marginBottom: 18
  },
  instructionText: { flex: 1, fontSize: 14, color: '#1565C0', lineHeight: 20 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15,
    height: 50, borderWidth: 1, borderColor: '#EEE', marginBottom: 16
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },

  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#999' },

  patientRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 12,
    padding: 15, borderWidth: 1, borderColor: '#EEE'
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#E3F2FD', justifyContent: 'center',
    alignItems: 'center', marginRight: 14
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  patientMeta: { fontSize: 12, color: '#888', marginTop: 3 },
  separator: { height: 10 },
});