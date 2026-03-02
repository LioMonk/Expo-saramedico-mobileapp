import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { doctorAPI } from '../../services/api';

export default function DoctorPatientDetailScreen({ route, navigation }) {
  const { patient, patientId } = route.params || {};
  const [activeTab, setActiveTab] = useState('Visits');
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (patientId || patient?.id) {
      loadPatientDetails();
    }
  }, [patientId, patient?.id]);

  const loadPatientDetails = async () => {
    setLoading(true);
    const id = patientId || patient?.id;

    try {
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
          <Text style={styles.patientName}>{patient?.name || 'Unknown Patient'}</Text>
          <Text style={styles.patientMeta}>MRN: {patient?.mrn || 'N/A'} - DOB: {patient?.dob || 'N/A'}</Text>
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
          ) : (
            <DocumentsView documents={documents} loading={loading} />
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

// --- SUB-COMPONENTS ---

import * as WebBrowser from 'expo-web-browser';

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
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => navigation.navigate('DoctorPostVisitScreen', { patient, visit })}
                >
                  <Text style={styles.viewBtnText}>View</Text>
                </TouchableOpacity>
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

function DocumentsView({ documents, loading }) {
  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const docsList = Array.isArray(documents) ? documents : [];

  if (docsList.length === 0) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <Ionicons name="document-outline" size={50} color="#DDD" />
        <Text style={{ marginTop: 15, fontSize: 14, color: '#999' }}>No documents uploaded</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionLabel}>UPLOADED DOCUMENTS</Text>

      {docsList.map((doc, index) => (
        <DocumentItem
          key={doc.id || index}
          title={doc.title || doc.filename || 'Document'}
          sub={`Uploaded ${doc.uploaded_at || doc.created_at || 'Unknown date'}`}
        />
      ))}
    </ScrollView>
  );
}

const DocumentItem = ({ title, sub }) => (
  <TouchableOpacity style={styles.docItem}>
    <View style={styles.pdfIcon}>
      <Ionicons name="document-text" size={24} color="#E53935" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.docTitle}>{title}</Text>
      <Text style={styles.docSub}>{sub}</Text>
    </View>
    <Ionicons name="eye-outline" size={20} color="#999" />
  </TouchableOpacity>
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

  docItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  pdfIcon: { width: 40, height: 40, backgroundColor: '#FFEBEE', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  docTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  docSub: { fontSize: 12, color: '#999', marginTop: 2 },

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
});