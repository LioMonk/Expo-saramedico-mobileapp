import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, Modal
} from 'react-native';
import { Menu, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as DocumentPicker from 'expo-document-picker';
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
  const [showPendingRequests, setShowPendingRequests] = useState(true);
  const [menuVisible, setMenuVisible] = useState({}); // To track visibility per appointment

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
              <Ionicons name="person" size={50} color={COLORS.primary} />
            </View>
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={styles.patientName} numberOfLines={1}>{patient?.full_name || patient?.name || 'Patient'}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>MRN: {patient?.mrn || 'N/A'}</Text>
              </View>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.metaText}>{patient?.date_of_birth || patient?.dob || (patient?.age ? `${patient.age} yrs` : 'DOB N/A')}</Text>
            </View>
          </View>
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
            <Text style={[styles.tabText, activeTab === 'Documents' && styles.activeTabText]}>Docs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'AIChat' && styles.activeTab]}
            onPress={() => setActiveTab('AIChat')}
          >
            <Text style={[styles.tabText, activeTab === 'AIChat' && styles.activeTabText]}>AI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'Vitals' && styles.activeTab]}
            onPress={() => setActiveTab('Vitals')}
          >
            <Text style={[styles.tabText, activeTab === 'Vitals' && styles.activeTabText]}>Vitals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Timeline' && styles.activeTab]}
            onPress={() => setActiveTab('Timeline')}
          >
            <Text style={[styles.tabText, activeTab === 'Timeline' && styles.activeTabText]}>Time</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.quickVitalsBtn}
          onPress={() => setActiveTab('Vitals')}
        >
          <Ionicons name="pulse" size={18} color="white" />
          <Text style={styles.quickVitalsText}>Update Vitals</Text>
        </TouchableOpacity>
        {/* Pending Appointments Section */}
        {pendingAppointments.length > 0 && (
          <View style={styles.pendingContainer}>
            <TouchableOpacity
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}
              onPress={() => setShowPendingRequests(!showPendingRequests)}
            >
              <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>PENDING REQUESTS</Text>
              <Ionicons name={showPendingRequests ? "chevron-up" : "chevron-down"} size={20} color="#666" />
            </TouchableOpacity>

            {showPendingRequests && pendingAppointments.map(appt => (
              <View key={appt.id} style={styles.pendingCard}>
                <View style={styles.pendingHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="time" size={18} color="#F57C00" />
                    <Text style={styles.pendingDate} numberOfLines={1}>
                      {new Date(appt.requested_date).toLocaleString()}
                    </Text>
                  </View>

                  <Menu
                    visible={menuVisible[appt.id] || false}
                    onDismiss={() => setMenuVisible(prev => ({ ...prev, [appt.id]: false }))}
                    anchor={
                      <TouchableOpacity
                        onPress={() => setMenuVisible(prev => ({ ...prev, [appt.id]: true }))}
                        style={{ padding: 5 }}
                      >
                        <Ionicons name="ellipsis-vertical" size={20} color="#666" />
                      </TouchableOpacity>
                    }
                  >
                    <Menu.Item
                      onPress={async () => {
                        setMenuVisible(prev => ({ ...prev, [appt.id]: false }));
                        setProcessingId(appt.id);
                        try {
                          const approvalData = {
                            appointment_time: appt.requested_date,
                            doctor_notes: 'Approved via Profile',
                          };
                          await doctorAPI.approveAppointment(appt.id, approvalData);
                          loadPatientDetails();
                          Alert.alert('Success', 'Appointment Approved');
                        } catch (e) {
                          Alert.alert('Error', 'Approval failed');
                        } finally {
                          setProcessingId(null);
                        }
                      }}
                      title="Accept Appointment"
                      leadingIcon="check"
                    />
                    <Divider />
                    <Menu.Item
                      onPress={async () => {
                        setMenuVisible(prev => ({ ...prev, [appt.id]: false }));
                        setProcessingId(appt.id);
                        try {
                          await doctorAPI.updateAppointmentStatus(
                            appt.id,
                            'declined',
                            'Unable to accommodate at this time.'
                          );
                          loadPatientDetails();
                          Alert.alert('Success', 'Appointment Declined');
                        } catch (e) {
                          Alert.alert('Error', 'Decline failed');
                        } finally {
                          setProcessingId(null);
                        }
                      }}
                      title="Decline Request"
                      leadingIcon="close"
                      titleStyle={{ color: '#D32F2F' }}
                    />
                  </Menu>
                </View>
                <Text style={styles.pendingReason} numberOfLines={1}>Reason: {appt.reason}</Text>

                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={[styles.pendingBtn, styles.approveBtn, { flex: 1 }]}
                    onPress={async () => {
                      setProcessingId(appt.id);
                      try {
                        const approvalData = {
                          appointment_time: appt.requested_date,
                          doctor_notes: 'Approved via Profile',
                        };
                        await doctorAPI.approveAppointment(appt.id, approvalData);
                        loadPatientDetails();
                        Alert.alert('Success', 'Appointment Approved');
                      } catch (e) {
                        Alert.alert('Error', 'Approval failed');
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
          ) : activeTab === 'Vitals' ? (
            <VitalsView patientId={resolvedPatientId} />
          ) : activeTab === 'Timeline' ? (
            <TimelineView patientId={resolvedPatientId} />
          ) : (
            <View style={{ flex: 1 }}>
              <DoctorAIChatScreen
                navigation={navigation}
                patientId={resolvedPatientId}
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
                  appointment: { ...appt, patient_name: patient?.full_name || patient?.name || 'Patient' },
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

/* ─────────────────────────────────────────────────────────
   VITALS VIEW  — Full parity with web PatientVitals.jsx
   History table + Add/Edit form with metric-type selector
───────────────────────────────────────────────────────── */
function VitalsView({ patientId }) {
  // History
  const [allMetrics, setAllMetrics] = useState([]);
  const [loadingVitals, setLoadingVitals] = useState(true);
  // Form
  const [metricType, setMetricType] = useState('heart_rate');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('bpm');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  // Metric picker modal
  const [showPicker, setShowPicker] = useState(false);

  const METRIC_OPTIONS = [
    { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', placeholder: 'e.g. 72', icon: 'heart', color: '#E53935', bg: '#FFEBEE' },
    { key: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', placeholder: 'e.g. 120/80', icon: 'fitness', color: '#8E24AA', bg: '#F3E5F5' },
    { key: 'weight', label: 'Weight', unit: 'kg', placeholder: 'e.g. 65.5', icon: 'barbell', color: '#1976D2', bg: '#E3F2FD' },
    { key: 'temperature', label: 'Temperature', unit: '°C', placeholder: 'e.g. 37.0', icon: 'thermometer', color: '#F57C00', bg: '#FBE9E7' },
    { key: 'respiratory_rate', label: 'Respiratory Rate', unit: 'breaths/min', placeholder: 'e.g. 16', icon: 'cloud', color: '#00897B', bg: '#E0F2F1' },
    { key: 'oxygen_saturation', label: 'Oxygen Saturation', unit: '%', placeholder: 'e.g. 98', icon: 'water', color: '#0288D1', bg: '#E1F5FE' },
  ];

  const selectedMetric = METRIC_OPTIONS.find(m => m.key === metricType) || METRIC_OPTIONS[0];

  useEffect(() => {
    if (!editingId) setUnit(selectedMetric.unit);
  }, [metricType]);

  useEffect(() => {
    if (patientId) loadVitals();
  }, [patientId]);

  const loadVitals = async () => {
    setLoadingVitals(true);
    try {
      const api = require('../../services/api').default;
      const res = await api.get(`/patients/${patientId}/health`, { params: { limit: 50 } });
      const metrics = Array.isArray(res.data) ? res.data : [];
      setAllMetrics(metrics.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at)));
    } catch (e) {
      console.log('Could not load vitals:', e.message);
    } finally {
      setLoadingVitals(false);
    }
  };

  const formatMetricName = (type) =>
    type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const handleEdit = (metric) => {
    setEditingId(metric.id);
    setMetricType(metric.metric_type);
    setValue(String(metric.value));
    setUnit(metric.unit);
    setNotes(metric.notes || '');
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setMetricType('heart_rate');
    setValue('');
    setUnit('bpm');
    setNotes('');
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!value.trim()) { Alert.alert('Missing Value', 'Please enter a value.'); return; }
    setSubmitting(true);
    setError(null);
    const payload = {
      metric_type: metricType,
      value: value.trim(),
      unit,
      notes,
      recorded_at: new Date().toISOString()
    };
    try {
      if (editingId) {
        await doctorAPI.updateHealthMetric(patientId, editingId, payload);
      } else {
        await doctorAPI.addHealthMetric(patientId, payload);
      }
      handleCancelEdit();
      await loadVitals();
      Alert.alert('✅ Saved', editingId ? 'Metric updated successfully.' : 'Metric added successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save metric.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={vstyles.header}>
        <Text style={vstyles.title}>Patient Health Metrics</Text>
        <TouchableOpacity style={vstyles.addBtn} onPress={() => { setShowForm(true); setEditingId(null); }}>
          <Ionicons name="add" size={18} color="white" />
          <Text style={vstyles.addBtnText}>Add Metric</Text>
        </TouchableOpacity>
      </View>

      {error && <View style={vstyles.errorBox}><Text style={vstyles.errorText}>{error}</Text></View>}

      {/* ── History Table ─────────────── */}
      <View style={vstyles.tableCard}>
        {/* Table Header */}
        <View style={vstyles.tableHeader}>
          <Text style={[vstyles.thCell, { flex: 1.4 }]}>METRIC</Text>
          <Text style={[vstyles.thCell, { flex: 1 }]}>VALUE</Text>
          <Text style={[vstyles.thCell, { flex: 1 }]}>DATE</Text>
          <Text style={[vstyles.thCell, { flex: 0.6, textAlign: 'right' }]}>ACTION</Text>
        </View>

        {loadingVitals ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : allMetrics.length === 0 ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <Ionicons name="pulse-outline" size={40} color="#CBD5E1" />
            <Text style={{ color: '#94A3B8', marginTop: 10, fontSize: 13 }}>No health metrics recorded yet.</Text>
          </View>
        ) : (
          allMetrics.map((m, i) => {
            const meta = METRIC_OPTIONS.find(o => o.key === m.metric_type);
            return (
              <View key={m.id || i} style={[vstyles.tableRow, i % 2 === 0 ? {} : { backgroundColor: '#FAFBFC' }]}>
                <View style={[{ flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                  {meta && (
                    <View style={[vstyles.metaIcon, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={11} color={meta.color} />
                    </View>
                  )}
                  <Text style={vstyles.tdMetric} numberOfLines={1}>{formatMetricName(m.metric_type)}</Text>
                </View>
                <Text style={[vstyles.tdCell, { flex: 1, fontWeight: '700', color: '#0F172A' }]}>{m.value} {m.unit}</Text>
                <Text style={[vstyles.tdCell, { flex: 1, color: '#64748B' }]}>
                  {new Date(m.recorded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </Text>
                <TouchableOpacity onPress={() => handleEdit(m)} style={[{ flex: 0.6, alignItems: 'flex-end' }]}>
                  <Text style={vstyles.editLink}>Edit</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* ── Add / Edit Form ────────────── */}
      {showForm && (
        <View style={vstyles.formCard}>
          <Text style={vstyles.formTitle}>{editingId ? 'Edit Metric' : 'Add New Metric'}</Text>

          {/* Metric Type Selector */}
          <Text style={vstyles.label}>Metric Type</Text>
          <TouchableOpacity style={vstyles.typeSelector} onPress={() => setShowPicker(true)}>
            <View style={[vstyles.selectorIcon, { backgroundColor: selectedMetric.bg }]}>
              <Ionicons name={selectedMetric.icon} size={14} color={selectedMetric.color} />
            </View>
            <Text style={vstyles.selectorText}>{selectedMetric.label}</Text>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Value + Unit */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={vstyles.label}>Value</Text>
              <TextInput
                style={vstyles.input}
                value={value}
                onChangeText={setValue}
                placeholder={selectedMetric.placeholder}
                placeholderTextColor="#BDBDBD"
                keyboardType={metricType === 'blood_pressure' ? 'default' : 'numeric'}
              />
            </View>
            <View style={{ width: 80 }}>
              <Text style={vstyles.label}>Unit</Text>
              <TextInput
                style={vstyles.input}
                value={unit}
                onChangeText={setUnit}
                placeholderTextColor="#BDBDBD"
              />
            </View>
          </View>

          {/* Notes */}
          <Text style={[vstyles.label, { marginTop: 12 }]}>Notes (Optional)</Text>
          <TextInput
            style={[vstyles.input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional observations..."
            placeholderTextColor="#BDBDBD"
            multiline
          />

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              style={[vstyles.formBtn, { flex: 1, backgroundColor: COLORS.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color="white" />
                : <Text style={vstyles.formBtnText}>{editingId ? 'Update Metric' : 'Add Metric'}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[vstyles.formBtn, { paddingHorizontal: 16, backgroundColor: '#F1F5F9' }]}
              onPress={handleCancelEdit}
              disabled={submitting}
            >
              <Text style={[vstyles.formBtnText, { color: '#64748B' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Metric Type Picker Modal */}
      <Modal transparent visible={showPicker} animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={vstyles.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={vstyles.pickerSheet}>
            <Text style={vstyles.pickerTitle}>Select Metric Type</Text>
            {METRIC_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[vstyles.pickerOption, metricType === opt.key && vstyles.pickerSelectedOption]}
                onPress={() => { setMetricType(opt.key); setUnit(opt.unit); setShowPicker(false); }}
              >
                <View style={[vstyles.selectorIcon, { backgroundColor: opt.bg }]}>
                  <Ionicons name={opt.icon} size={14} color={opt.color} />
                </View>
                <Text style={[vstyles.pickerOptionText, metricType === opt.key && { color: COLORS.primary, fontWeight: '700' }]}>
                  {opt.label}
                </Text>
                {metricType === opt.key && <Ionicons name="checkmark" size={16} color={COLORS.primary} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}



function TimelineView({ patientId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) loadTimeline();
  }, [patientId]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      // Fetch documents
      const docsRes = await doctorAPI.getPatientDocuments(patientId).catch(() => ({ data: [] }));
      const docsData = docsRes.data?.documents || docsRes.data || [];
      const docs = Array.isArray(docsData) ? docsData : [];

      // Fetch appointments
      const apptsRes = await doctorAPI.getAppointments().catch(() => ({ data: [] }));
      const allAppts = Array.isArray(apptsRes.data) ? apptsRes.data : [];
      const myAppts = allAppts.filter(a => a.patient_id === patientId);

      // Fetch health metrics (vitals)
      const api = require('../../services/api').default;
      const vitalsRes = await api.get(`/patients/${patientId}/health`, { params: { limit: 20 } }).catch(() => ({ data: [] }));
      const vitals = Array.isArray(vitalsRes.data) ? vitalsRes.data : [];

      const timelineData = [];

      docs.forEach(doc => {
        timelineData.push({
          dateObj: new Date(doc.uploaded_at || doc.created_at),
          title: doc.file_name || doc.title || 'Medical Document',
          desc: `Category: ${doc.category || 'General'}\nUploaded by: Doctor`,
          type: 'document',
          icon: 'document'
        });
      });

      myAppts.forEach(appt => {
        timelineData.push({
          dateObj: new Date(appt.requested_date || appt.created_at),
          title: 'Consultation Appointment',
          desc: `Status: ${appt.status}\nReason: ${appt.reason}`,
          type: 'appointment',
          icon: 'medical'
        });
      });

      vitals.forEach(v => {
        timelineData.push({
          dateObj: new Date(v.recorded_at),
          title: `Vital Update: ${v.metric_type.replace(/_/g, ' ')}`,
          desc: `Value: ${v.value} ${v.unit}`,
          type: 'vital',
          icon: 'pulse'
        });
      });

      // Sort descending
      timelineData.sort((a, b) => b.dateObj - a.dateObj);

      // Format date
      const formatted = timelineData.map(item => ({
        date: item.dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        title: item.title,
        desc: item.desc,
        icon: item.icon,
        type: item.type
      }));

      setEvents(formatted);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Ionicons name="git-branch-outline" size={50} color="#DDD" />
        <Text style={{ marginTop: 15, fontSize: 14, color: '#999' }}>No history found for this patient.</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ paddingTop: 10 }}>
      {events.map((e, i) => (
        <View key={i} style={styles.timelineItem}>
          <View style={styles.timelineLeft}>
            <View style={[styles.dot, { backgroundColor: e.type === 'vital' ? '#FF5252' : e.type === 'document' ? '#4CAF50' : COLORS.primary }]} />
            {i !== events.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.timelineCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={[styles.timeDate, { color: e.type === 'vital' ? '#FF5252' : e.type === 'document' ? '#4CAF50' : COLORS.primary }]}>{e.date} • {e.time}</Text>
              <Ionicons name={e.icon === 'medical' ? 'medkit' : e.icon === 'document' ? 'document-text' : 'pulse'} size={14} color="#CCC" />
            </View>
            <Text style={styles.timeTitle}>{e.title}</Text>
            <Text style={styles.timeDesc}>{e.desc}</Text>
          </View>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ─────────────────────────────────────────────────────────
   DOCUMENTS VIEW — Full parity with web DocumentsList.jsx
   Includes: Inline upload, Process with AI, file-type icons,
   AI status badges, View & Delete
───────────────────────────────────────────────────────── */
const FILE_CONFIGS = {
  pdf: { color: '#EF4444', bg: '#FEF2F2', icon: 'document-text', label: 'PDF' },
  doc: { color: '#2563EB', bg: '#EFF6FF', icon: 'document', label: 'DOC' },
  docx: { color: '#2563EB', bg: '#EFF6FF', icon: 'document', label: 'DOCX' },
  png: { color: '#16A34A', bg: '#F0FDF4', icon: 'image', label: 'PNG' },
  jpg: { color: '#16A34A', bg: '#F0FDF4', icon: 'image', label: 'JPG' },
  jpeg: { color: '#16A34A', bg: '#F0FDF4', icon: 'image', label: 'JPEG' },
  dicom: { color: '#7C3AED', bg: '#F5F3FF', icon: 'scan', label: 'DCM' },
  txt: { color: '#64748B', bg: '#F8FAFC', icon: 'document', label: 'TXT' },
};

function getDocExt(doc) {
  const name = doc.file_name || doc.title || doc.url || '';
  const m = name.match(/\.([a-zA-Z0-9]+)(\?|$)/);
  return m ? m[1].toLowerCase() : 'file';
}

function DocumentsView({ documents, loading, patientId, onDeleteSuccess }) {
  const [docsList, setDocsList] = useState(Array.isArray(documents) ? documents : []);
  const [uploading, setUploading] = useState(false);
  const [processingIds, setProcessingIds] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // Sync with parent-passed documents
  useEffect(() => {
    setDocsList(Array.isArray(documents) ? documents : []);
  }, [documents]);

  const refreshDocs = async () => {
    try {
      const res = await doctorAPI.getPatientDocuments(patientId);
      const data = res.data?.documents || res.data?.items || res.data;
      setDocsList(Array.isArray(data) ? data : []);
    } catch (_) { }
  };

  const handleInlineUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'text/plain'],
        copyToCacheDirectory: true
      });
      if (result.canceled) return;
      const file = result.assets?.[0] || result;
      setUploading(true);
      setUploadError('');
      try {
        await doctorAPI.uploadPatientDocument(patientId, file.uri, file.name || 'document', file.mimeType || file.type);
        await refreshDocs();
        if (onDeleteSuccess) onDeleteSuccess();
        Alert.alert('✅ Uploaded', 'Document uploaded successfully.');
      } catch (err) {
        setUploadError(err.message || 'Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    } catch (err) {
      console.error('DocumentPicker error:', err);
    }
  };

  const handleProcessWithAI = async (doc) => {
    if (processingIds[doc.id]) return;
    setProcessingIds(prev => ({ ...prev, [doc.id]: 'processing' }));
    // Simulate AI processing (RAG system handles automatically)
    setTimeout(() => {
      setProcessingIds(prev => ({ ...prev, [doc.id]: 'completed' }));
    }, 2000);
  };

  const handleOpenDoc = async (doc) => {
    const url = doc.presigned_url || doc.downloadUrl || doc.file_url || doc.url;
    if (!url) { Alert.alert('Unavailable', 'Document URL is not available yet.'); return; }
    try { await WebBrowser.openBrowserAsync(url); }
    catch (e) { Alert.alert('Error', 'Could not open document.'); }
  };

  const handleDeleteDoc = (doc) => {
    Alert.alert(
      'Delete Document',
      `Delete "${doc.title || doc.file_name || 'this document'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeletingId(doc.id);
            try {
              await doctorAPI.deleteDocument(doc.id);
              await refreshDocs();
              if (onDeleteSuccess) onDeleteSuccess();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete document.');
            } finally {
              setDeletingId(null);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Upload Button */}
      <View style={dstyles.topBar}>
        <Text style={dstyles.docTitle2}>Patient Documents</Text>
        <TouchableOpacity style={dstyles.uploadBtn} onPress={handleInlineUpload} disabled={uploading}>
          {uploading
            ? <ActivityIndicator size="small" color="white" />
            : <><Ionicons name="cloud-upload-outline" size={16} color="white" /><Text style={dstyles.uploadBtnText}>Upload</Text></>
          }
        </TouchableOpacity>
      </View>

      {uploadError ? <View style={dstyles.errorBox}><Text style={dstyles.errorText}>{uploadError}</Text></View> : null}

      {docsList.length === 0 ? (
        <View style={{ padding: 50, alignItems: 'center' }}>
          <Ionicons name="document-outline" size={50} color="#CBD5E1" />
          <Text style={{ marginTop: 14, fontSize: 15, fontWeight: '600', color: '#64748B' }}>No documents yet</Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>Upload a medical record to get started.</Text>
        </View>
      ) : (
        docsList.map((doc, i) => {
          const ext = getDocExt(doc);
          const cfg = FILE_CONFIGS[ext] || { color: '#64748B', bg: '#F8FAFC', icon: 'document', label: ext.toUpperCase() };
          const hasUrl = !!(doc.presigned_url || doc.downloadUrl || doc.file_url || doc.url);
          const aiStatus = processingIds[doc.id];
          const isProcessing = aiStatus === 'processing';
          const isAIDone = aiStatus === 'completed';

          return (
            <View key={doc.id || i} style={dstyles.docCard}>
              {/* File Icon */}
              <View style={[dstyles.fileIcon, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                <Text style={[dstyles.extLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </View>

              {/* Info */}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={dstyles.docName} numberOfLines={2}>{doc.title || doc.file_name || 'Untitled'}</Text>
                <Text style={dstyles.docMeta}>
                  {doc.category?.replace(/_/g, ' ') || ext}
                  {(doc.uploaded_at || doc.created_at) ? ` • ${new Date(doc.uploaded_at || doc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}` : ''}
                </Text>

                {/* AI Status Badge */}
                {isProcessing && (
                  <View style={[dstyles.badge, { backgroundColor: '#FEF9C3' }]}>
                    <Text style={[dstyles.badgeText, { color: '#854D0E' }]}>⏳ Processing...</Text>
                  </View>
                )}
                {isAIDone && (
                  <View style={[dstyles.badge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[dstyles.badgeText, { color: '#166534' }]}>✓ AI Processed</Text>
                  </View>
                )}
                {!hasUrl && !isProcessing && !isAIDone && (
                  <View style={[dstyles.badge, { backgroundColor: '#FFF7ED' }]}>
                    <Text style={[dstyles.badgeText, { color: '#C2410C' }]}>⏳ Awaiting upload...</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={dstyles.docActions}>
                {/* Process with AI */}
                {!isAIDone && !isProcessing && (
                  <TouchableOpacity
                    style={dstyles.aiBtn}
                    onPress={() => handleProcessWithAI(doc)}
                  >
                    <Ionicons name="sparkles" size={12} color="white" />
                    <Text style={dstyles.aiBtnText}>AI</Text>
                  </TouchableOpacity>
                )}

                {/* View btn */}
                <TouchableOpacity
                  style={[dstyles.viewDocBtn, !hasUrl && { opacity: 0.4 }]}
                  onPress={() => handleOpenDoc(doc)}
                  disabled={!hasUrl}
                >
                  <Text style={dstyles.viewDocBtnText}>View →</Text>
                </TouchableOpacity>

                {/* Delete btn */}
                <TouchableOpacity
                  style={dstyles.deleteDocBtn}
                  onPress={() => handleDeleteDoc(doc)}
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id
                    ? <ActivityIndicator size="small" color="#EF4444" />
                    : <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  }
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFC' },
  content: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },

  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, backgroundColor: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  avatarContainer: { marginRight: 16 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0F7FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E3F2FD' },
  profileTextContainer: { flex: 1 },
  patientName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  metaBadgeText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  metaText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { color: '#9CA3AF', fontWeight: '600', fontSize: 13 },
  activeTabText: { color: COLORS.primary, fontWeight: '800' },
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

  // Timeline Styles
  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', width: 30 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginTop: 18 },
  line: { width: 2, backgroundColor: '#EEE', flex: 1, marginTop: 0 },
  timelineCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#F0F0F0' },
  timeDate: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  timeTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  timeDesc: { fontSize: 12, color: '#6B7280', lineHeight: 18 },

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
  quickVitalsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  quickVitalsText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});

// ─── Vitals View Styles (new table-based layout) ──────────────────────────────
const vstyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

  errorBox: { padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10, marginBottom: 12 },
  errorText: { color: '#EF4444', fontSize: 13 },

  tableCard: { borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginBottom: 16, backgroundColor: 'white' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  thCell: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tdMetric: { fontSize: 12, fontWeight: '600', color: '#0F172A', flexShrink: 1 },
  tdCell: { fontSize: 13 },
  metaIcon: { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  editLink: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },

  formCard: { backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 16 },
  formTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
  typeSelector: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12 },
  selectorIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  selectorText: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '500' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1E293B' },
  formBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  formBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  pickerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  pickerOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerSelectedOption: { backgroundColor: '#F0F7FF', borderRadius: 10, paddingHorizontal: 8 },
  pickerOptionText: { fontSize: 15, color: '#334155', fontWeight: '500', flex: 1 },
});

// ─── Documents View Styles (new card layout with AI) ──────────────────────────
const dstyles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  docTitle2: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#359AFF', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  uploadBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

  errorBox: { padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10, marginBottom: 12 },
  errorText: { color: '#EF4444', fontSize: 13 },

  docCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9', padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  fileIcon: { width: 50, height: 56, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  extLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginTop: 3, textTransform: 'uppercase' },
  docName: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  docMeta: { fontSize: 11, color: '#94A3B8', marginBottom: 6 },

  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  docActions: { flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 8 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, background: 'transparent', backgroundColor: '#764BA2' },
  aiBtnText: { color: 'white', fontSize: 11, fontWeight: '700' },
  viewDocBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#F1F5F9', borderRadius: 7, borderWidth: 1, borderColor: '#E2E8F0' },
  viewDocBtnText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  deleteDocBtn: { padding: 6, backgroundColor: '#FEF2F2', borderRadius: 7, borderWidth: 1, borderColor: '#FECACA', width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
});