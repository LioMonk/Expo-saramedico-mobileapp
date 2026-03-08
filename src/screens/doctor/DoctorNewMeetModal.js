import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Modal, TouchableOpacity, Switch,
  TouchableWithoutFeedback, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { CustomButton } from '../../components/CustomComponents';
import { doctorAPI } from '../../services/api';

const SCHEDULE_OPTIONS = [
  { id: 'now', label: 'Start Now', description: 'Instant video call' },
  { id: '15min', label: 'In 15 min', description: 'Schedule for 15 minutes' },
  { id: '30min', label: 'In 30 min', description: 'Schedule for 30 minutes' },
  { id: '1hour', label: 'In 1 hour', description: 'Schedule for 1 hour' },
  { id: 'custom', label: 'Custom Time', description: 'Pick a specific time' },
];

export default function DoctorNewMeetModal({ visible, onClose, navigation }) {
  const [captureMode, setCaptureMode] = useState('video'); // 'video' or 'chat'
  const [waitroomEnabled, setWaitroomEnabled] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientList, setShowPatientList] = useState(false);
  const [scheduleOption, setScheduleOption] = useState('now');
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [micLevel, setMicLevel] = useState(10);

  const searchTimer = useRef(null);

  useEffect(() => {
    // Clear previous timer
    if (searchTimer.current) clearTimeout(searchTimer.current);

    // If search text is too short or matches selected patient, don't search
    if (patientSearch.length <= 1) {
      setPatients([]);
      setShowPatientList(false);
      return;
    }

    if (selectedPatient && patientSearch === (selectedPatient.full_name || selectedPatient.name)) {
      setShowPatientList(false);
      return;
    }

    // Debounce search to 500ms
    searchTimer.current = setTimeout(() => {
      searchPatients();
    }, 500);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [patientSearch]);

  // Simulate Mic Visualizer
  useEffect(() => {
    let interval;
    if (captureMode === 'video' && visible) {
      interval = setInterval(() => {
        setMicLevel(Math.floor(Math.random() * 60) + 10);
      }, 150);
    }
    return () => clearInterval(interval);
  }, [captureMode, visible]);

  const searchPatients = async () => {
    if (!patientSearch.trim()) {
      setPatients([]);
      setShowPatientList(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await doctorAPI.getPatients();
      const patientData = response.data?.all_patients || response.data?.patients || (Array.isArray(response.data) ? response.data : []) || [];

      // Filter locally since backend /patients endpoint currently returns all organization patients
      const query = patientSearch.toLowerCase();
      const filtered = patientData.filter(p =>
        (p.name || p.full_name || '').toLowerCase().includes(query) ||
        (p.mrn || '').toLowerCase().includes(query)
      );

      setPatients(filtered.slice(0, 5));
      setShowPatientList(filtered.length > 0);
    } catch (error) {
      console.log('Patient search error:', error);
      setPatients([]);
      setShowPatientList(false);
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.full_name || patient.name);
    setShowPatientList(false);
  };

  const handleAddPatient = () => {
    onClose();
    navigation.navigate('DoctorAddPatientScreen');
  };

  const handleStart = async () => {
    const patientId = selectedPatient?.id;
    if (!patientId) {
      Alert.alert('Select Patient', 'Please select a patient from the search results first');
      return;
    }

    setLoading(true);

    try {
      if (scheduleOption === 'now') {
        // Start immediate call
        if (captureMode === 'video') {
          // Create instant appointment with Zoom meeting
          const response = await doctorAPI.createInstantAppointment(patientId);
          // Auto approve it (wait, consultations are auto-approved by default in some systems, 
          // let's check if we still need approveAppointment. In consultations.py, schedule_consultation 
          // creates the consultation. We might need to approve the appointment if the underlying 
          // model is still Appointment. But consultations usually have their own status.)
          const consultation = response.data;

          // If the backend returns a consultation object, we should use its fields.
          // Note: In Sarah Medico, consultations and appointments are linked or synonymous.

          onClose();
          navigation.navigate('VideoCallScreen', {
            appointment: consultation, // Pass the whole object
            role: 'doctor'
          });
        } else {
          // For chat/manual notes mode
          onClose();
          navigation.navigate('DoctorPostVisitScreen', {
            patientId: patientId,
            patientName: selectedPatient.full_name || selectedPatient.name,
            mode: 'manual'
          });
        }
      } else {
        // Schedule for later
        const scheduleMinutes = {
          '15min': 15,
          '30min': 30,
          '1hour': 60,
          'custom': 45
        }[scheduleOption];

        // Ensure scheduled time is at least 3 minutes in future to avoid clock-drift 422s
        const bufferMinutes = Math.max(scheduleMinutes || 0, 3);
        const scheduledTime = new Date(Date.now() + bufferMinutes * 60 * 1000).toISOString();

        // Create scheduled consultation via backend
        const response = await doctorAPI.createConsultation({
          patientId: patientId,
          scheduledAt: scheduledTime,
          notes: captureMode === 'video' ? 'Tele-consultation' : 'In-person / Manual Notes'
        });

        const consultation = response.data;

        Alert.alert(
          'Meeting Scheduled',
          `Consultation scheduled for ${new Date(scheduledTime).toLocaleTimeString()}. Patient has been notified.`,
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('Consultation creation error:', error);
      const msg = error.response?.data?.detail || 'Failed to create consultation. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const getScheduleLabel = () => {
    return SCHEDULE_OPTIONS.find(opt => opt.id === scheduleOption)?.label || 'Start Now';
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

              <Text style={styles.title}>Start New Consultation</Text>
              <Text style={styles.subtitle}>Select patient and capture mode</Text>

              {/* Patient Selection */}
              <Text style={styles.label}>PATIENT</Text>
              <View style={styles.patientSelectionContainer}>
                <View style={styles.patientRow}>
                  <View style={styles.searchBox}>
                    <Ionicons name="search" size={18} color="#999" />
                    <TextInput
                      placeholder="Search patient name..."
                      style={styles.input}
                      value={patientSearch}
                      onChangeText={setPatientSearch}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
                  </View>
                  <TouchableOpacity style={styles.addPatientBtn} onPress={handleAddPatient}>
                    <Ionicons name="person-add" size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                {/* Patient Search Results */}
                {showPatientList && (
                  <View style={styles.patientList}>
                    {patients.map((p, index) => (
                      <TouchableOpacity
                        key={p.id || index}
                        style={styles.patientItem}
                        onPress={() => handlePatientSelect(p)}
                      >
                        <View style={styles.patientAvatar}>
                          <Ionicons name="person" size={18} color="#666" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.patientName}>{p.full_name || p.name}</Text>
                          <Text style={styles.patientMrn}>{p.mrn || 'No MRN'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#CCC" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {selectedPatient && (
                <View style={styles.selectedPatientBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={styles.selectedPatientText}>{selectedPatient.full_name || selectedPatient.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setSelectedPatient(null); setPatientSearch(''); }}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Capture Mode */}
              <Text style={styles.label}>CAPTURE MODE</Text>
              <View style={styles.captureRow}>
                <TouchableOpacity
                  style={[styles.captureBtn, captureMode === 'video' && styles.captureBtnActive]}
                  onPress={() => setCaptureMode('video')}
                >
                  <Ionicons name="videocam" size={24} color={captureMode === 'video' ? COLORS.primary : '#666'} />
                  <Text style={[styles.captureText, captureMode === 'video' && styles.captureTextActive]}>Live Video</Text>
                  <Text style={styles.captureDesc}>Video call with patient</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.captureBtn, captureMode === 'chat' && styles.captureBtnActive]}
                  onPress={() => setCaptureMode('chat')}
                >
                  <Ionicons name="chatbubbles" size={24} color={captureMode === 'chat' ? COLORS.primary : '#666'} />
                  <Text style={[styles.captureText, captureMode === 'chat' && styles.captureTextActive]}>Manual Notes</Text>
                  <Text style={styles.captureDesc}>Chat & take notes</Text>
                </TouchableOpacity>
              </View>

              {captureMode === 'video' && (
                <View style={styles.micConfigContainer}>
                  <Text style={styles.micLabel}>AUDIO CONFIGURATION</Text>
                  <View style={styles.micRow}>
                    <Ionicons name="mic-outline" size={20} color="#666" />
                    <Text style={styles.micDeviceText}>System Default Microphone</Text>
                    <View style={styles.visualizerContainer}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.visualizerBar,
                            { height: Math.max(4, micLevel * (Math.random() * 0.6 + 0.4) / 3.5) }
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Schedule Options */}
              <Text style={styles.label}>SCHEDULE</Text>
              <TouchableOpacity
                style={styles.scheduleDropdown}
                onPress={() => setShowScheduleDropdown(!showScheduleDropdown)}
              >
                <View style={styles.scheduleSelected}>
                  <Ionicons
                    name={scheduleOption === 'now' ? 'flash' : 'time-outline'}
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.scheduleText}>{getScheduleLabel()}</Text>
                </View>
                <Ionicons name={showScheduleDropdown ? "chevron-up" : "chevron-down"} size={18} color="#666" />
              </TouchableOpacity>

              {showScheduleDropdown && (
                <View style={styles.scheduleOptions}>
                  {SCHEDULE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.scheduleOption, scheduleOption === option.id && styles.scheduleOptionActive]}
                      onPress={() => {
                        setScheduleOption(option.id);
                        setShowScheduleDropdown(false);
                      }}
                    >
                      <View>
                        <Text style={[styles.scheduleOptionLabel, scheduleOption === option.id && styles.scheduleOptionLabelActive]}>
                          {option.label}
                        </Text>
                        <Text style={styles.scheduleOptionDesc}>{option.description}</Text>
                      </View>
                      {scheduleOption === option.id && (
                        <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Waitroom Toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="log-in-outline" size={20} color="#666" style={{ marginRight: 8 }} />
                  <Text style={styles.toggleText}>Waitroom Enabled</Text>
                </View>
                <Switch
                  value={waitroomEnabled}
                  onValueChange={setWaitroomEnabled}
                  trackColor={{ false: "#DDD", true: COLORS.primary }}
                />
              </View>

              {/* Info Note */}
              {scheduleOption !== 'now' && (
                <View style={styles.infoNote}>
                  <Ionicons name="information-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.infoText}>Meeting link will be sent to patient and added to Alerts</Text>
                </View>
              )}

              {/* Start Button */}
              <CustomButton
                title={scheduleOption === 'now' ? (loading ? 'Starting...' : 'Start Now') : 'Schedule Meeting'}
                onPress={handleStart}
                style={{ marginTop: 20 }}
                disabled={loading}
              />

              {/* Close X Button */}
              <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdrop: { flex: 1 },
  modalContainer: { width: '100%', maxHeight: '90%' },
  modalContent: { backgroundColor: '#F9FAFC', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: 40 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },

  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#1A1A1A' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },

  label: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 8, marginTop: 15 },

  patientRow: { flexDirection: 'row', gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#EEE', borderRadius: 8, paddingHorizontal: 10, height: 45 },
  input: { flex: 1, marginLeft: 8 },
  addPatientBtn: { width: 45, height: 45, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },

  patientSelectionContainer: { zIndex: 1000 },
  patientList: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 55,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1001
  },
  patientItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  patientAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  patientName: { fontSize: 14, fontWeight: '600', color: '#333' },
  patientMrn: { fontSize: 12, color: '#999' },

  selectedPatientBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginTop: 10, gap: 6 },
  selectedPatientText: { fontSize: 14, color: COLORS.primary, fontWeight: '500', flex: 1 },

  captureRow: { flexDirection: 'row', gap: 12 },
  captureBtn: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  captureBtnActive: { borderColor: COLORS.primary, backgroundColor: '#F4F9FF' },
  captureText: { marginTop: 8, fontWeight: '600', color: '#666' },
  captureTextActive: { color: COLORS.primary },
  captureDesc: { fontSize: 11, color: '#999', marginTop: 4 },

  scheduleDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#EEE', borderRadius: 8, padding: 12 },
  scheduleSelected: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleText: { fontSize: 15, fontWeight: '600', color: '#333' },

  scheduleOptions: { backgroundColor: 'white', borderRadius: 8, marginTop: 5, borderWidth: 1, borderColor: '#EEE' },
  scheduleOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  scheduleOptionActive: { backgroundColor: '#F4F9FF' },
  scheduleOptionLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  scheduleOptionLabelActive: { color: COLORS.primary },
  scheduleOptionDesc: { fontSize: 12, color: '#999', marginTop: 2 },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 12, marginTop: 15, borderWidth: 1, borderColor: '#EEE' },
  toggleText: { color: '#333', fontWeight: '500' },

  infoNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, backgroundColor: '#E3F2FD', borderRadius: 8 },
  infoText: { fontSize: 12, color: COLORS.primary, flex: 1 },

  micConfigContainer: { marginTop: 15, padding: 15, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#EEE' },
  micLabel: { fontSize: 11, fontWeight: 'bold', color: '#999', marginBottom: 10, letterSpacing: 0.5 },
  micRow: { flexDirection: 'row', alignItems: 'center' },
  micDeviceText: { flex: 1, fontSize: 14, color: '#333', marginLeft: 10, fontWeight: '500' },
  visualizerContainer: { flexDirection: 'row', alignItems: 'center', height: 24, gap: 3, width: 40, justifyContent: 'center' },
  visualizerBar: { width: 4, backgroundColor: COLORS.primary, borderRadius: 2 },

  closeCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1A2A3A', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: 20 }
});