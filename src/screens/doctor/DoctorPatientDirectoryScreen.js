import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import DoctorBottomNavBar from '../../components/DoctorBottomNavBar';
import { doctorAPI } from '../../services/api';

export default function DoctorPatientDirectoryScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = patients.filter(p =>
        p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.mrn && p.mrn.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPatients(filtered);
    } else {
      // Show top 10 recent patients when no search
      setFilteredPatients(patients.slice(0, 10));
    }
  }, [searchQuery, patients]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await doctorAPI.getPatients();
      // API returns { all_patients: [...], recent_patients: [...] }
      const patientsData = response.data?.all_patients
        || response.data?.patients
        || (Array.isArray(response.data) ? response.data : [])
        || [];

      // Sort by last visit (most recent first)
      const sorted = [...patientsData].sort((a, b) => {
        const dateA = new Date(a.lastVisit || a.last_visit || 0);
        const dateB = new Date(b.lastVisit || b.last_visit || 0);
        return dateB - dateA;
      });

      setPatients(sorted);
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientPress = (patient) => {
    navigation.navigate('DoctorPatientDetailScreen', {
      patientId: patient.id,
      patient: patient
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="menu-outline" size={28} color="#333" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 15 }}>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorAlertsScreen')}>
              <Ionicons name="notifications" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorSettingsScreen')}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={18} color="#666" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title}>Patient Directory</Text>

        {/* Search & Add Button */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              placeholder="Search patients by name or MRN..."
              placeholderTextColor="#999"
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Add Patient Button */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('DoctorAddPatientScreen')}
          >
            <Ionicons name="person-add" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {searchQuery ? `Search Results (${filteredPatients.length})` : 'Recent Patients (10)'}
        </Text>

        {/* List Header */}
        <View style={styles.listHeader}>
          <Text style={[styles.headerText, { flex: 2 }]}>NAME</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>DOB</Text>
          <Text style={[styles.headerText, { flex: 1, textAlign: 'right', marginRight: 20 }]}>MRN</Text>
        </View>

        {/* Patient List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading patients...</Text>
          </View>
        ) : filteredPatients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#DDD" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No patients found' : 'No patients yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Add your first patient to get started'}
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {filteredPatients.map((p, i) => (
              <TouchableOpacity
                key={p.id || i}
                style={styles.row}
                onPress={() => handlePatientPress(p)}
              >
                <View style={{ flex: 2 }}>
                  <Text style={styles.nameText}>{p.name}</Text>
                  <Text style={[styles.statusText, { color: p.statusColor || COLORS.primary }]}>
                    {p.statusTag || p.status_tag || p.status || 'Active'}
                  </Text>
                </View>
                <Text style={[styles.dateText, { flex: 1 }]}>{p.dob || 'N/A'}</Text>
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Text style={styles.mrnText}>{p.mrn || 'N/A'}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#CCC" style={{ marginLeft: 10 }} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Bottom Navigation */}
        <DoctorBottomNavBar
          navigation={navigation}
          activeTab="Patients"
          onFabPress={() => navigation.navigate('DoctorAddPatientScreen')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFC' },
  content: { flex: 1, padding: 20, paddingBottom: 0 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 10 },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#EEE' },
  input: { flex: 1, marginLeft: 10, fontSize: 14, color: '#333' },

  addBtn: { width: 50, height: 50, backgroundColor: COLORS.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },

  listHeader: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 10 },
  headerText: { fontSize: 11, fontWeight: 'bold', color: '#999', letterSpacing: 0.5 },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  nameText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  statusText: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  dateText: { fontSize: 13, color: '#666' },
  mrnText: { fontSize: 13, color: '#666' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 15, fontSize: 14, color: '#666' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { marginTop: 15, fontSize: 16, fontWeight: '600', color: '#666' },
  emptySubtext: { marginTop: 8, fontSize: 13, color: '#999' }
});