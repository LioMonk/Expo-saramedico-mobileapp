import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import DoctorBottomNavBar from '../../components/DoctorBottomNavBar';
import { doctorAPI, permissionsAPI } from '../../services/api';

export default function DoctorPatientDirectoryScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Action Menu State
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedActionPatient, setSelectedActionPatient] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = patients.filter(p =>
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.mrn && p.mrn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  }, [searchQuery, patients]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await doctorAPI.getPatients();
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

  const openActionMenu = (patient) => {
    setSelectedActionPatient(patient);
    setShowActionModal(true);
  };

  const handleAction = async (actionType) => {
    const p = selectedActionPatient;
    if (!p) return;

    setActionLoading(true);
    try {
      if (actionType === 'documents') {
        setShowActionModal(false);
        navigation.navigate('DoctorPatientDetailScreen', { patientId: p.id, patient: p, initialTab: 'Documents' });
      } else if (actionType === 'request') {
        const payload = {
          patient_id: p.id,
          access_level: "read_analyze",
          ai_access_permission: true,
        };
        await permissionsAPI.requestAccess(payload);
        Alert.alert('Request Sent', 'Access request has been sent to the patient.');
        setShowActionModal(false);
      } else if (actionType === 'check') {
        const res = await permissionsAPI.checkAccess(p.id);
        const hasAccess = res.data?.has_access ?? res.data?.access ?? res.data?.allowed ?? false;
        Alert.alert('Permission Status', hasAccess ? `✅ You have active access to ${p.name}'s records.` : `🔒 You do not have active access to ${p.name}'s records.`);
        setShowActionModal(false);
      } else if (actionType === 'revoke') {
        await permissionsAPI.revokeDoctorAccess('me', p.id).catch(e => {
          console.log("Revoke fallback", e);
        });
        Alert.alert('Access Revoked', `You have revoked your access to ${p.name}.`);
        setShowActionModal(false);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const calcAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Patient Directory</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Search & Add Button */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              placeholder="Search by name, email, or MRN..."
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
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          {searchQuery ? `Search Results (${filteredPatients.length})` : `All Patients (${filteredPatients.length})`}
        </Text>

        {/* Patient List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading patients...</Text>
          </View>
        ) : filteredPatients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>No patients found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or onboard a new patient.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {filteredPatients.map((p, i) => {
              const age = calcAge(p.dob || p.date_of_birth);
              const mrnStr = p.mrn || p.medical_record_number || 'N/A';
              const lastVisitStr = p.lastVisit || p.last_visit || 'N/A';

              return (
                <TouchableOpacity
                  key={p.id || i}
                  style={styles.card}
                  onPress={() => handlePatientPress(p)}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={styles.nameText} numberOfLines={1}>{p.name || 'Unknown Patient'}</Text>
                      {/* Status Badge */}
                      {p.statusTag || p.status ? (
                        <View style={[styles.badge, { backgroundColor: p.statusClass === 'pending' ? '#FEF3C7' : '#DCFCE7' }]}>
                          <Text style={[styles.badgeText, { color: p.statusClass === 'pending' ? '#D97706' : '#16A34A' }]}>
                            {p.statusTag || p.status}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => openActionMenu(p)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cardGrid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>DOB / AGE</Text>
                      <Text style={styles.gridValue}>{p.dob || 'N/A'} {age !== null ? `(${age}y)` : ''}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>MRN</Text>
                      <Text style={styles.gridValue}>{mrnStr}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>LAST VISIT</Text>
                      <Text style={styles.gridValue}>{lastVisitStr}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Action Bottom Sheet Modal */}
        <Modal
          visible={showActionModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => !actionLoading && setShowActionModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => !actionLoading && setShowActionModal(false)}
          >
            <View style={styles.actionSheet}>
              {actionLoading ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={{ marginTop: 15, color: '#64748B', fontWeight: '500' }}>Processing request...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>{selectedActionPatient?.name}</Text>
                    <Text style={styles.sheetSubtitle}>{selectedActionPatient?.mrn || 'N/A'}</Text>
                  </View>

                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('documents')}>
                    <Ionicons name="folder-outline" size={20} color="#334155" />
                    <Text style={styles.actionText}>View Documents</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('request')}>
                    <Ionicons name="mail-outline" size={20} color="#334155" />
                    <Text style={styles.actionText}>Request Access</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('check')}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#334155" />
                    <Text style={styles.actionText}>Check Permission</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, { borderBottomWidth: 0 }]} onPress={() => handleAction('revoke')}>
                    <Ionicons name="ban-outline" size={20} color="#EF4444" />
                    <Text style={[styles.actionText, { color: '#EF4444' }]}>Revoke Access</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelActionBtn} onPress={() => setShowActionModal(false)}>
                    <Text style={styles.cancelActionText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, padding: 20, paddingBottom: 0 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginBottom: 12, fontWeight: '500' },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, height: 48, borderWidth: 1, borderColor: '#E2E8F0' },
  input: { flex: 1, marginLeft: 10, fontSize: 14, color: '#334155' },

  addBtn: { width: 48, height: 48, backgroundColor: COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },

  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  nameText: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginRight: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '47%' },
  gridLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 4 },
  gridValue: { fontSize: 13, color: '#475569', fontWeight: '500' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 15, fontSize: 14, color: '#64748B' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { marginTop: 15, fontSize: 16, fontWeight: '600', color: '#64748B' },
  emptySubtext: { marginTop: 8, fontSize: 13, color: '#94A3B8', textAlign: 'center' },

  // Action Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  actionSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
  sheetHeader: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: '#64748B' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  actionText: { fontSize: 15, fontWeight: '600', color: '#334155', marginLeft: 12 },
  cancelActionBtn: { marginTop: 16, backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelActionText: { fontSize: 15, fontWeight: '700', color: '#64748B' }
});