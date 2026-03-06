import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '../../constants/theme';
import { doctorAPI } from '../../services/api';
import DoctorAIChatScreen from './DoctorAIChatScreen';

export default function DoctorPatientDetailScreen({ route, navigation }) {
  const [patient, setPatient] = useState(route.params?.patient || {});
  const { patientId, initialTab } = route.params || {};
  const [activeTab, setActiveTab] = useState(initialTab || 'Visits');
  const resolvedPatientId = patientId || patient?.id || patient?.patient_id;
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (resolvedPatientId) {
      loadPatientDetails();
    }
  }, [resolvedPatientId]);

  const loadPatientDetails = async () => {
    setLoading(true);
    const id = resolvedPatientId;
    if (!id) { setLoading(false); return; }

    try {
      // 1. Fetch patient profile details
      try {
        const profileRes = await doctorAPI.getPatientDetails(id);
        if (profileRes.data) {
          setPatient(profileRes.data);
        }
      } catch (err) {
        console.log('Error fetching patient profile:', err);
      }
      // Load visits/records
      try {
        const visitsResponse = await doctorAPI.getRecords(id);
        setVisits((visitsResponse.data || []).slice(0, 5)); // Top 5
      } catch (err) {
        console.log('No visits found');
        setVisits([]);
      }

      // Load documents
      try {
        const docsResponse = await doctorAPI.getPatientDocuments(id);
        const docsData = docsResponse.data?.documents || docsResponse.data;
        setDocuments(Array.isArray(docsData) ? docsData : []);
      } catch (err) {
        console.log('No documents found');
        setDocuments([]);
      }

      // Load pending and accepted appointments for this patient
      try {
        const apptsResponse = await doctorAPI.getAppointments();
        const allAppts = apptsResponse.data || [];

        const pendingForPatient = allAppts.filter(appt =>
          (appt.patient_id === id) && appt.status.toLowerCase() === 'pending'
        );
        setPendingAppointments(pendingForPatient);

        const upcomingForPatient = allAppts.filter(appt =>
          (appt.patient_id === id) && appt.status.toLowerCase() === 'accepted'
        );
        setUpcomingAppointments(upcomingForPatient);

      } catch (err) {
        console.log('No appointments found');
        setPendingAppointments([]);
        setUpcomingAppointments([]);
      }
    } catch (error) {
      console.error('Error loading patient details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient Profile</Text>
          <TouchableOpacity onPress={loadPatientDetails}>
            <Ionicons name="refresh-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#999" />
            </View>
          </View>
          <Text style={styles.patientName}>{patient?.full_name || patient?.name || 'Patient'}</Text>
          <Text style={styles.patientMeta}>MRN: {patient?.mrn || 'N/A'} - DOB: {patient?.date_of_birth || patient?.dob || (patient?.age ? `${patient.age} yrs` : 'N/A')}</Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Visits' && styles.activeTab]}
            onPress={() => setActiveTab('Visits')}
          >
            <Text style={[styles.tabText, activeTab === 'Visits' && styles.activeTabText]}>Visits</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'Documents' && styles.activeTab]}
            onPress={() => setActiveTab('Documents')}
          >
            <Text style={[styles.tabText, activeTab === 'Documents' && styles.activeTabText]}>Documents</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'AIChat' && styles.activeTab]}
            onPress={() => setActiveTab('AIChat')}
          >
            <Text style={[styles.tabText, activeTab === 'AIChat' && styles.activeTabText]}>AI Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Appointments Section */}
        {pendingAppointments.length > 0 && (
          <View style={styles.pendingContainer}>
            <Text style={styles.sectionLabel}>PENDING REQUESTS</Text>
            {pendingAppointments.map(appt => (
              <View key={appt.id} style={styles.pendingCard}>
                <View style={styles.pendingHeader}>
                  <Ionicons name="time" size={18} color="#F57C00" />
                  <Text style={styles.pendingDate}>
                    {new Date(appt.requested_date).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.pendingReason}>Reason: {appt.reason}</Text>

                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={[styles.pendingBtn, styles.approveBtn]}
                    onPress={async () => {
                      setProcessingId(appt.id);
                      try {
                        const approvalData = {
                          appointment_time: appt.requested_date,
                          doctor_notes: 'Approved via Profile',
                        };
                        await doctorAPI.approveAppointment(appt.id, approvalData);
                        loadPatientDetails();
                        alert('Appointment Approved');
                      } catch (e) {
                        alert('Approval failed');
                      } finally {
                        setProcessingId(null);
                      }
                    }}
                    disabled={processingId === appt.id}
                  >
                    <Text style={styles.approveBtnText}>
                      {processingId === appt.id ? 'Processing...' : 'Accept'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pendingBtn, styles.rejectBtn]}
                    onPress={async () => {
                      setProcessingId(appt.id);
                      try {
                        await doctorAPI.updateAppointmentStatus(
                          appt.id,
                          'declined',
                          'Unable to accommodate at this time.'
                        );
                        loadPatientDetails();
                        alert('Appointment Declined');
                      } catch (e) {
                        alert('Decline failed');
                      } finally {
                        setProcessingId(null);
                      }
                    }}
                    disabled={processingId === appt.id}
                  >
                    <Text style={styles.rejectBtnText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'Visits' ? (
            <VisitsView
              navigation={navigation}
              visits={visits}
              upcomingAppointments={upcomingAppointments}
              loading={loading}
              patient={patient}
            />
          ) : activeTab === 'Documents' ? (
            <DocumentsView
              documents={documents}
              loading={loading}
              patientId={resolvedPatientId}
              onUpload={() => navigation.navigate('DoctorQuickUploadScreen', { patient: patient })}
              onDeleteSuccess={loadPatientDetails}
            />
          ) : (
            <View style={{ flex: 1 }}>
              <DoctorAIChatScreen
                navigation={navigation}
                route={{ params: { patientId: resolvedPatientId } }}
                embedded={true}
              />
            </View>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

// --- SUB-COMPONENTS ---

function VisitsView({ navigation, visits, upcomingAppointments, loading, patient }) {
  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const visitsList = Array.isArray(visits) ? visits : [];
  const upcomingList = Array.isArray(upcomingAppointments) ? upcomingAppointments : [];

  if (visitsList.length === 0 && upcomingList.length === 0) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <Ionicons name="calendar-outline" size={50} color="#DDD" />
        <Text style={{ marginTop: 15, fontSize: 14, color: '#999' }}>No visits or upcoming appointments</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {upcomingList.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>APPOINTMENTS</Text>
          {upcomingList.map((appt, index) => {
            const isPassed = new Date(appt.requested_date) < new Date();
            const statusText = isPassed ? 'PASSED' : 'UPCOMING';

            return (
              <TouchableOpacity
                key={`up-${appt.id || index}`}
                style={[styles.visitCard, { borderColor: '#BBDEFB', backgroundColor: '#E3F2FD' }]}
                onPress={() => navigation.navigate('AppointmentDetail', {
                  appointment: { ...appt, patient_name: patient?.full_name || patient?.name },
                  role: 'doctor'
                })}
              >
                <View style={styles.visitHeader}>
                  <Text style={styles.visitDate}>
                    {new Date(appt.requested_date).toLocaleString()}
                  </Text>
                  {appt.join_url && !isPassed && (
                    <TouchableOpacity
                      style={[styles.viewBtn, { backgroundColor: '#1E88E5' }]}
                      onPress={() => WebBrowser.openBrowserAsync(appt.join_url)}
                    >
                      <Text style={[styles.viewBtnText, { color: 'white' }]}>Join Call</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.visitTitle}>{appt.reason || 'General Checkup'}</Text>
                <Text style={styles.visitDesc} numberOfLines={2}>
                  Status: {appt.status.toUpperCase()} ({statusText})
                </Text>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {visitsList.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 10 }]}>PAST CONSULTATIONS</Text>
          {visitsList.map((visit, index) => (
            <View key={`past-${visit.id || index}`} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <Text style={styles.visitDate}>
                  {visit.scheduled_at || visit.visit_date || visit.created_at || 'No date'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => navigation.navigate('DoctorPostVisitScreen', { patient, visit })}
                  >
                    <Text style={styles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.viewBtn, { backgroundColor: '#E8F5E9' }]}
                    onPress={() => navigation.navigate('DoctorPostVisitScreen', { patient, visit, showSoap: true })}
                  >
                    <Text style={[styles.viewBtnText, { color: '#2E7D32' }]}>SOAP</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.visitTitle}>{visit.visit_type || visit.reason || 'General Visit'}</Text>
              <Text style={styles.visitDesc} numberOfLines={3}>
                {visit.notes || visit.description || 'No description available'}
              </Text>
            </View>
          ))}
        </>
      )}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function DocumentsView({ documents, loading, patientId, onUpload, onDeleteSuccess }) {
  const [hr, setHr] = useState('');
  const [bp, setBp] = useState('');
  const [weight, setWeight] = useState('');
  const [savingVitals, setSavingVitals] = useState(false);
  const [loadingVitals, setLoadingVitals] = useState(true);
  const [lastVitals, setLastVitals] = useState({ hr: null, bp: null, weight: null });
  const [isVitalsExpanded, setIsVitalsExpanded] = useState(false);

  // Load last recorded vitals to pre-fill fields
  useEffect(() => {
    if (!patientId) return;
    const fetchVitals = async () => {
      setLoadingVitals(true);
      try {
        // Use the patients GET endpoint – works for doctors too
        const api = require('../../services/api').default;
        const res = await api.get(`/patients/${patientId}/health`, { params: { limit: 20 } });
        const metrics = Array.isArray(res.data) ? res.data : [];
        // Get most recent of each type
        const latest = {};
        metrics.forEach(m => {
          if (!latest[m.metric_type]) latest[m.metric_type] = m;
        });
        const lastHr = latest['heart_rate']?.value || '';
        const lastBp = latest['blood_pressure']?.value || '';
        const lastW = latest['weight']?.value || '';
        setHr(lastHr);
        setBp(lastBp);
        setWeight(lastW);
        setLastVitals({
          hr: latest['heart_rate'] ? `${latest['heart_rate'].value} bpm` : null,
          bp: latest['blood_pressure'] ? `${latest['blood_pressure'].value} mmHg` : null,
          weight: latest['weight'] ? `${latest['weight'].value} kg` : null,
          hrTime: latest['heart_rate']?.recorded_at,
          bpTime: latest['blood_pressure']?.recorded_at,
          wTime: latest['weight']?.recorded_at,
        });
      } catch (e) {
        console.log('Could not load vitals:', e.message);
      } finally {
        setLoadingVitals(false);
      }
    };
    fetchVitals();
  }, [patientId]);

  const formatTime = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const saveVitals = async () => {
    if (!hr && !bp && !weight) {
      Alert.alert('No Data', 'Please fill in at least one vital sign.');
      return;
    }
    if (!patientId) {
      Alert.alert('Error', 'Patient ID not found.');
      return;
    }
    setSavingVitals(true);
    const now = new Date().toISOString();
    const tasks = [];
    if (hr) tasks.push(doctorAPI.addHealthMetric(patientId, { metric_type: 'heart_rate', value: hr, unit: 'bpm', recorded_at: now }));
    if (bp) tasks.push(doctorAPI.addHealthMetric(patientId, { metric_type: 'blood_pressure', value: bp, unit: 'mmHg', recorded_at: now }));
    if (weight) tasks.push(doctorAPI.addHealthMetric(patientId, { metric_type: 'weight', value: weight, unit: 'kg', recorded_at: now }));

    try {
      await Promise.all(tasks);
      // Update last vitals display
      setLastVitals({
        hr: hr ? `${hr} bpm` : lastVitals.hr,
        bp: bp ? `${bp} mmHg` : lastVitals.bp,
        weight: weight ? `${weight} kg` : lastVitals.weight,
        hrTime: hr ? now : lastVitals.hrTime,
        bpTime: bp ? now : lastVitals.bpTime,
        wTime: weight ? now : lastVitals.wTime,
      });
      Alert.alert('✅ Saved', 'Vitals recorded successfully.');
    } catch (err) {
      console.error('Vitals save error:', err);
      Alert.alert('Error', 'Failed to save vitals. Please try again.');
    } finally {
      setSavingVitals(false);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const docsList = Array.isArray(documents) ? documents : [];

  const handleDeleteDoc = (docId) => {
    Alert.alert(
      "Delete Document",
      "Are you sure you want to delete this document?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await doctorAPI.deleteDocument(docId);
              Alert.alert('Success', 'Document deleted successfully');
              if (onDeleteSuccess) onDeleteSuccess();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete document');
            }
          }
        }
      ]
    );
  };

  const handleOpenDoc = async (doc) => {
    const url = doc.presigned_url || doc.file_url || doc.url;
    if (!url) { Alert.alert('Unavailable', 'Document URL is not available.'); return; }
    try { await WebBrowser.openBrowserAsync(url); }
    catch (e) { Alert.alert('Error', 'Could not open document.'); }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>

      {/* ══ VITALS CARD ══════════════════════════════════════════ */}
      <View style={styles.vitalsCard}>
        {/* Header - Now Touchable to Toggle */}
        <TouchableOpacity
          style={styles.vitalsCardHeader}
          onPress={() => setIsVitalsExpanded(!isVitalsExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.vitalsCardHeaderLeft}>
            <View style={styles.vitalsCardIconBox}>
              <Ionicons name="pulse" size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.vitalsCardTitle}>Record Vitals</Text>
              <Text style={styles.vitalsCardSub}>
                {loadingVitals ? 'Loading last readings...' : 'Current patient health metrics'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {loadingVitals && <ActivityIndicator size="small" color={COLORS.primary} />}
            <Ionicons
              name={isVitalsExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color="#666"
            />
          </View>
        </TouchableOpacity>

        {/* Collapsible Content */}
        {isVitalsExpanded && (
          <View>
            {/* Metric Tiles Row: HR + BP */}
            <View style={styles.vitalsRow}>

              {/* Heart Rate Tile */}
              <View style={[styles.vitalsTile, { borderColor: '#FFCDD2', backgroundColor: '#FFF8F8' }]}>
                <View style={styles.vitalsTileTop}>
                  <View style={[styles.vitalsTileIcon, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="heart" size={16} color="#E53935" />
                  </View>
                  <Text style={[styles.vitalsTileLabel, { color: '#E53935' }]}>Heart Rate</Text>
                </View>
                {lastVitals.hr && (
                  <View style={styles.vitalsLastRow}>
                    <Text style={styles.vitalsLastValue}>{lastVitals.hr}</Text>
                    {lastVitals.hrTime && (
                      <Text style={styles.vitalsLastTime}>{formatTime(lastVitals.hrTime)}</Text>
                    )}
                  </View>
                )}
                <View style={styles.vitalsInputWrap}>
                  <TextInput
                    style={styles.vitalsInput}
                    placeholder={lastVitals.hr ? lastVitals.hr.replace(' bpm', '') : '72'}
                    placeholderTextColor="#BDBDBD"
                    keyboardType="numeric"
                    value={hr}
                    onChangeText={setHr}
                  />
                  <Text style={styles.vitalsUnit}>bpm</Text>
                </View>
              </View>

              {/* Blood Pressure Tile */}
              <View style={[styles.vitalsTile, { borderColor: '#E1BEE7', backgroundColor: '#FDF7FF' }]}>
                <View style={styles.vitalsTileTop}>
                  <View style={[styles.vitalsTileIcon, { backgroundColor: '#F3E5F5' }]}>
                    <Ionicons name="fitness" size={16} color="#8E24AA" />
                  </View>
                  <Text style={[styles.vitalsTileLabel, { color: '#8E24AA' }]}>Blood Pressure</Text>
                </View>
                {lastVitals.bp && (
                  <View style={styles.vitalsLastRow}>
                    <Text style={styles.vitalsLastValue}>{lastVitals.bp}</Text>
                    {lastVitals.bpTime && (
                      <Text style={styles.vitalsLastTime}>{formatTime(lastVitals.bpTime)}</Text>
                    )}
                  </View>
                )}
                <View style={styles.vitalsInputWrap}>
                  <TextInput
                    style={styles.vitalsInput}
                    placeholder={lastVitals.bp ? lastVitals.bp.replace(' mmHg', '') : '120/80'}
                    placeholderTextColor="#BDBDBD"
                    value={bp}
                    onChangeText={setBp}
                  />
                  <Text style={styles.vitalsUnit}>mmHg</Text>
                </View>
              </View>

            </View>

            {/* Weight Tile (full width) */}
            <View style={[styles.vitalsTile, { borderColor: '#BBDEFB', backgroundColor: '#F7FBFF', marginTop: 10 }]}>
              <View style={styles.vitalsTileTop}>
                <View style={[styles.vitalsTileIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="barbell" size={16} color="#1976D2" />
                </View>
                <Text style={[styles.vitalsTileLabel, { color: '#1976D2' }]}>Weight</Text>
                {lastVitals.weight && (
                  <View style={[styles.vitalsLastRow, { marginLeft: 'auto' }]}>
                    <Text style={styles.vitalsLastValue}>{lastVitals.weight}</Text>
                    {lastVitals.wTime && (
                      <Text style={[styles.vitalsLastTime, { marginLeft: 6 }]}>{formatTime(lastVitals.wTime)}</Text>
                    )}
                  </View>
                )}
              </View>
              <View style={[styles.vitalsInputWrap, { width: '55%', marginTop: 10 }]}>
                <TextInput
                  style={styles.vitalsInput}
                  placeholder={lastVitals.weight ? lastVitals.weight.replace(' kg', '') : '70.5'}
                  placeholderTextColor="#BDBDBD"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
                <Text style={styles.vitalsUnit}>kg</Text>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.vitalsSaveBtn, savingVitals && { opacity: 0.7 }]}
              onPress={saveVitals}
              disabled={savingVitals}
            >
              {savingVitals
                ? <ActivityIndicator size="small" color="white" />
                : <Ionicons name="checkmark-circle" size={18} color="white" />
              }
              <Text style={styles.vitalsSaveBtnText}>
                {savingVitals ? 'Saving...' : 'Save Vitals'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Upload Button */}
      <TouchableOpacity style={styles.uploadDocBtn} onPress={onUpload}>
        <Ionicons name="cloud-upload-outline" size={18} color="white" />
        <Text style={styles.uploadDocBtnText}>Upload Document</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>UPLOADED DOCUMENTS</Text>

      {docsList.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="document-outline" size={50} color="#DDD" />
          <Text style={{ marginTop: 15, fontSize: 14, color: '#999' }}>No documents uploaded</Text>
        </View>
      ) : (
        docsList.map((doc, index) => (
          <DocumentItem
            key={doc.id || index}
            title={doc.title || doc.file_name || doc.filename || 'Document'}
            sub={`Uploaded ${doc.uploaded_at || doc.created_at || 'Unknown date'}`}
            category={doc.category}
            onPress={() => handleOpenDoc(doc)}
            onDelete={() => handleDeleteDoc(doc.id)}
          />
        ))
      )}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}


const DocumentItem = ({ title, sub, category, onPress, onDelete }) => (
  <View style={styles.docItemWrapper}>
    <TouchableOpacity style={[styles.docItem, { marginBottom: 0, flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]} onPress={onPress}>
      <View style={styles.pdfIcon}>
        <Ionicons name="document-text" size={24} color="#E53935" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.docTitle}>{title}</Text>
        <Text style={styles.docSub}>{sub}</Text>
        {category && (
          <Text style={styles.docCategory}>{category.replace(/_/g, ' ')}</Text>
        )}
      </View>
      <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
    </TouchableOpacity>
    <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
      <Ionicons name="trash-outline" size={20} color="#E53935" />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFC' },
  content: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },

  profileHeader: { alignItems: 'center', marginBottom: 25 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F0F2F5', justifyItems: 'center', alignItems: 'center', justifyContent: 'center' },
  patientName: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 },
  patientMeta: { fontSize: 13, color: '#999' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#E3E8ED', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { color: '#666', fontWeight: '500' },
  activeTabText: { color: COLORS.primary, fontWeight: 'bold' },
  tabContent: { flex: 1 },

  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 15, marginTop: 5, letterSpacing: 0.5, textTransform: 'uppercase' },

  visitCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  visitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  visitDate: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase' },
  viewBtn: { backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  viewBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold' },
  visitTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 6 },
  visitDesc: { fontSize: 13, color: '#555', lineHeight: 18 },

  uploadDocBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, marginBottom: 20, gap: 8 },
  uploadDocBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  docItemWrapper: { flexDirection: 'row', marginBottom: 10, borderRadius: 12, borderWidth: 1, borderColor: '#EEE', backgroundColor: 'white' },
  docItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  deleteBtn: { padding: 15, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderColor: '#EEE' },
  pdfIcon: { width: 40, height: 40, backgroundColor: '#FFEBEE', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  docTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  docSub: { fontSize: 12, color: '#999', marginTop: 2 },
  docCategory: { fontSize: 11, color: COLORS.primary, marginTop: 3, fontWeight: '600', textTransform: 'uppercase' },

  pendingContainer: { marginBottom: 20 },
  pendingCard: { backgroundColor: '#FFF3E0', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#FFE0B2', marginBottom: 10 },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pendingDate: { fontSize: 13, fontWeight: 'bold', color: '#E65100', marginLeft: 6 },
  pendingReason: { fontSize: 14, color: '#424242', marginBottom: 12 },
  pendingActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  pendingBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  approveBtn: { backgroundColor: '#4CAF50' },
  rejectBtn: { backgroundColor: '#EEEEEE' },
  approveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  rejectBtnText: { color: '#F44336', fontWeight: 'bold', fontSize: 14 },

  // ── Vitals Card ──────────────────────────────────────────────────────────
  vitalsCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  vitalsCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vitalsCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vitalsCardIconBox: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center', alignItems: 'center',
  },
  vitalsCardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  vitalsCardSub: { fontSize: 11, color: '#888', marginTop: 1 },

  vitalsRow: { flexDirection: 'row', gap: 10 },

  vitalsTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  vitalsTileTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  vitalsTileIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  vitalsTileLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  vitalsLastRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6, gap: 4 },
  vitalsLastValue: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  vitalsLastTime: { fontSize: 10, color: '#aaa', marginTop: 2 },

  vitalsInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#DDE1E7',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    marginTop: 10,
  },
  vitalsInput: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  vitalsUnit: { fontSize: 11, color: '#999', marginLeft: 4 },
  vitalsLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6 },
  vitalsField: { flex: 1 },

  vitalsSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 18,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  vitalsSaveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});