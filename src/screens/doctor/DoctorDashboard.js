import React, { useState, useEffect } from 'react';
import {
   View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Image, Modal, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import DoctorBottomNavBar from '../../components/DoctorBottomNavBar';
import DoctorNewMeetModal from './DoctorNewMeetModal';
import DoctorSidebar from '../../components/DoctorSidebar';
import { doctorAPI, getUserData } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function DoctorDashboard({ navigation }) {
   const [modalVisible, setModalVisible] = useState(false);
   const [showMeetModal, setShowMeetModal] = useState(false);
   const [isSidebarVisible, setIsSidebarVisible] = useState(false);
   const [doctorName, setDoctorName] = useState('');
   const [todayAppointmentCount, setTodayAppointmentCount] = useState(0);
   const [loading, setLoading] = useState(true);
   const [upcomingAppointments, setUpcomingAppointments] = useState([]);
   const [recentPatients, setRecentPatients] = useState([]);

   useFocusEffect(
      React.useCallback(() => {
         loadDashboardData();
      }, [])
   );

   const loadDashboardData = async () => {
      setLoading(true);
      try {
         // Fetch doctor profile
         const userData = await getUserData();
         setDoctorName(userData.full_name || 'Doctor');

         // Fetch appointments from real API
         try {
            const appointmentsResponse = await doctorAPI.getAppointments();
            const appointments = appointmentsResponse.data || [];

            // Filter for today's appointments
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todaysAppointments = appointments.filter(apt => {
               const dateStr = apt.scheduled_at || apt.appointment_date || apt.requested_at || apt.requested_date;
               if (!dateStr) return false;
               const aptDate = new Date(dateStr);
               aptDate.setHours(0, 0, 0, 0);
               return aptDate.getTime() === today.getTime();
            });

            setTodayAppointmentCount(todaysAppointments.length);

            // Get upcoming appointments (future appointments sorted by date)
            const now = new Date();
            const upcoming = appointments
               .filter(apt => {
                  const dateStr = apt.scheduled_at || apt.appointment_date || apt.requested_at || apt.requested_date;
                  if (!dateStr) return false;
                  return new Date(dateStr) > now;
               })
               .sort((a, b) => {
                  const dateA = new Date(a.scheduled_at || a.appointment_date || a.requested_at || a.requested_date);
                  const dateB = new Date(b.scheduled_at || b.appointment_date || b.requested_at || b.requested_date);
                  return dateA - dateB;
               })
               .slice(0, 5); // Top 5

            setUpcomingAppointments(upcoming);
         } catch (err) {
            console.log('No appointments found');
            setTodayAppointmentCount(0);
            setUpcomingAppointments([]);
         }

         // Fetch recent patients
         try {
            const patientsResponse = await doctorAPI.getPatients();
            // API returns { all_patients: [...], recent_patients: [...] }
            const patients = patientsResponse.data?.all_patients
               || patientsResponse.data?.patients
               || (Array.isArray(patientsResponse.data) ? patientsResponse.data : [])
               || [];

            // Sort by last visit and take top 3
            const sorted = [...patients]
               .sort((a, b) => {
                  const dateA = new Date(a.lastVisit || a.last_visit || a.updated_at || 0);
                  const dateB = new Date(b.lastVisit || b.last_visit || b.updated_at || 0);
                  return dateB - dateA;
               })
               .slice(0, 3);

            setRecentPatients(sorted);
         } catch (err) {
            console.log('No patients found');
            setRecentPatients([]);
         }

      } catch (error) {
         console.error('Error loading dashboard data:', error);
      } finally {
         setLoading(false);
      }
   };

   const openNewMeet = () => { setModalVisible(false); setShowMeetModal(true); };
   const openAddPatient = () => { setModalVisible(false); navigation.navigate('DoctorAddPatientScreen'); };
   const openUpload = () => { setModalVisible(false); navigation.navigate('DoctorUploadScreen'); };
   const openDictateNotes = () => { setModalVisible(false); navigation.navigate('DoctorDictateNotesScreen'); };

   return (
      <SafeAreaView style={styles.container}>

         <DoctorSidebar
            isVisible={isSidebarVisible}
            onClose={() => setIsSidebarVisible(false)}
            navigation={navigation}
            onStartMeet={() => setShowMeetModal(true)}
         />

         <View style={styles.contentContainer}>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

               {/* Header */}
               <View style={styles.header}>
                  <TouchableOpacity onPress={() => setIsSidebarVisible(true)}>
                     <Ionicons name="menu-outline" size={28} color="#333" />
                  </TouchableOpacity>
                  <View style={styles.headerRight}>
                     <TouchableOpacity onPress={() => navigation.navigate('DoctorAlertsScreen')}>
                        <Ionicons name="notifications" size={24} color="#333" />
                     </TouchableOpacity>
                     <TouchableOpacity onPress={() => navigation.navigate('DoctorSettingsScreen')}>
                        <View style={styles.avatar} />
                     </TouchableOpacity>
                  </View>
               </View>

               <Text style={styles.greeting}>Good {getTimeOfDay()}, Dr. {doctorName}</Text>
               <Text style={styles.subGreeting}>You have <Text style={{ fontWeight: 'bold' }}>{todayAppointmentCount} {todayAppointmentCount === 1 ? 'appointment' : 'appointments'}</Text> today</Text>

               {/* LINKED SEARCH BAR */}
               <TouchableOpacity
                  style={styles.searchContainer}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('DoctorSearchScreen')}
               >
                  <Ionicons name="search-outline" size={20} color="#999" />
                  <Text style={styles.placeholderText}>Search patients, reports, notes...</Text>
               </TouchableOpacity>

               {/* Quick Actions */}
               <Text style={styles.sectionTitle}>Quick Actions</Text>
               <View style={styles.quickRow}>
                  <QuickActionItem icon="videocam" label="New Meet" color="#2196F3" bg="#E3F2FD" onPress={openNewMeet} />
                  <QuickActionItem icon="person-add" label="Add Patient" color="#2196F3" bg="#E3F2FD" onPress={openAddPatient} />
                  <QuickActionItem icon="sparkles" label="AI Assistant" color="#9C27B0" bg="#F3E5F5" onPress={() => navigation.navigate('DoctorAIChatListScreen')} />
                  <QuickActionItem icon="document-text" label="Upload Doc" color="#2196F3" bg="#E3F2FD" onPress={openUpload} />
               </View>

               {/* Up Next */}
               <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Up Next</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('DoctorScheduleScreen', { viewMode: 'calendar' })}>
                     <Text style={styles.linkText}>View Calendar</Text>
                  </TouchableOpacity>
               </View>

               <View style={styles.apptCard}>
                  {upcomingAppointments.length > 0 ? (
                     <>
                        <View style={styles.apptRow}>
                           <View style={styles.blueLine} />
                           <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                 <Text style={styles.patientName}>{upcomingAppointments[0].patient?.full_name || upcomingAppointments[0].patient_name || 'Patient'}</Text>
                                 <Text style={styles.timeText}>
                                    {new Date(upcomingAppointments[0].scheduled_at || upcomingAppointments[0].appointment_date || upcomingAppointments[0].requested_at || upcomingAppointments[0].requested_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </Text>
                              </View>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={styles.tag}><Text style={styles.tagText}>{upcomingAppointments[0].status || 'Scheduled'}</Text></View>
                                    <Text style={styles.reasonText}>{upcomingAppointments[0].reason || 'Visit'}</Text>
                                 </View>
                              </View>
                           </View>
                        </View>
                        <View style={styles.btnRow}>
                           <TouchableOpacity
                              style={styles.startBtn}
                              onPress={() => navigation.navigate('DoctorPatientDetailScreen', { patient: upcomingAppointments[0].patient, patientId: upcomingAppointments[0].patient_id })}
                           >
                              <Text style={styles.startBtnText}>Start Visit</Text>
                           </TouchableOpacity>
                           <TouchableOpacity
                              style={styles.detailsBtn}
                              onPress={() => navigation.navigate('DoctorQuickUploadScreen', { patient: upcomingAppointments[0].patient })}
                           >
                              <Text style={styles.detailsBtnText}>Upload Doc</Text>
                           </TouchableOpacity>
                        </View>
                     </>
                  ) : (
                     <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#999' }}>No upcoming appointments</Text>
                     </View>
                  )}
               </View>

               {/* Recent Patients */}
               <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Patients</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('DoctorPatientDirectoryScreen')}>
                     <Text style={styles.linkText}>View All</Text>
                  </TouchableOpacity>
               </View>

               {recentPatients.length > 0 ? (
                  recentPatients.map((patient) => (
                     <TouchableOpacity
                        key={patient.id}
                        style={styles.recentCard}
                        onPress={() => navigation.navigate('DoctorPatientDetailScreen', { patient, patientId: patient.id })}
                     >
                        <View style={styles.recentItem}>
                           <View style={[styles.recentAvatar, { backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center' }]}>
                              <Ionicons name="person" size={16} color={COLORS.primary} />
                           </View>
                           <Text style={styles.recentName}>{patient.name}</Text>
                           <View style={styles.statusBadge}>
                              <Text style={styles.statusText}>• {patient.statusTag || 'Active'}</Text>
                           </View>
                        </View>
                     </TouchableOpacity>
                  ))
               ) : (
                  <View style={styles.recentCard}>
                     <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#999' }}>No recent patients</Text>
                     </View>
                  </View>
               )}
               <View style={{ height: 100 }} />
            </ScrollView>

            <DoctorBottomNavBar
               activeTab="Home"
               onFabPress={() => setModalVisible(true)}
               navigation={navigation}
            />
         </View>

         {/* Quick Actions Modal */}
         <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
               <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                  <View style={styles.modalTransparentLayer} />
               </TouchableWithoutFeedback>
               <View style={styles.modalContent}>
                  <View style={styles.dragHandle} />
                  <Text style={styles.modalTitle}>Quick Actions</Text>
                  <Text style={styles.modalSub}>Select an action to proceed</Text>
                  <TouchableOpacity style={styles.modalItem} onPress={openNewMeet}>
                     <View style={styles.modalIconBox}><Ionicons name="videocam" size={24} color="#2196F3" /></View>
                     <View style={{ flex: 1 }}><Text style={styles.modalItemTitle}>Start New Meet</Text><Text style={styles.modalItemSub}>Begin a new session with a patient</Text></View>
                     <Ionicons name="chevron-forward" size={20} color="#CCC" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalItem} onPress={openAddPatient}>
                     <View style={styles.modalIconBox}><Ionicons name="person-add" size={24} color="#2196F3" /></View>
                     <View style={{ flex: 1 }}><Text style={styles.modalItemTitle}>Add Patient</Text><Text style={styles.modalItemSub}>Manually add a new Patient</Text></View>
                     <Ionicons name="chevron-forward" size={20} color="#CCC" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalItem} onPress={openDictateNotes}>
                     <View style={styles.modalIconBox}><Ionicons name="mic" size={24} color="#2196F3" /></View>
                     <View style={{ flex: 1 }}><Text style={styles.modalItemTitle}>Dictate Notes</Text><Text style={styles.modalItemSub}>Voice notes with transcription</Text></View>
                     <Ionicons name="chevron-forward" size={20} color="#CCC" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalItem} onPress={openUpload}>
                     <View style={styles.modalIconBox}><Ionicons name="document-text" size={24} color="#2196F3" /></View>
                     <View style={{ flex: 1 }}><Text style={styles.modalItemTitle}>Upload Documents</Text><Text style={styles.modalItemSub}>Scan or import medical files</Text></View>
                     <Ionicons name="chevron-forward" size={20} color="#CCC" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalItem} onPress={() => { setModalVisible(false); navigation.navigate('DoctorAIChatListScreen'); }}>
                     <View style={[styles.modalIconBox, { backgroundColor: '#F3E5F5' }]}><Ionicons name="sparkles" size={24} color="#9C27B0" /></View>
                     <View style={{ flex: 1 }}><Text style={styles.modalItemTitle}>AI Assistant</Text><Text style={styles.modalItemSub}>Focused clinical conversation</Text></View>
                     <Ionicons name="chevron-forward" size={20} color="#CCC" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                     <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
               </View>
            </View>
         </Modal>

         <DoctorNewMeetModal visible={showMeetModal} onClose={() => setShowMeetModal(false)} navigation={navigation} />
      </SafeAreaView>
   );
}

// Helper function to get time of day greeting
const getTimeOfDay = () => {
   const hour = new Date().getHours();
   if (hour < 12) return 'Morning';
   if (hour < 17) return 'Afternoon';
   return 'Evening';
};

const QuickActionItem = ({ icon, label, color, bg, onPress }) => (
   <TouchableOpacity style={styles.quickItem} onPress={onPress}>
      <View style={[styles.quickIconBox, { backgroundColor: bg }]}>
         <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
   </TouchableOpacity>
);

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: '#FFFFFF' },
   contentContainer: { flex: 1 },
   scrollContent: { padding: 20 },
   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
   headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
   avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE' },
   greeting: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
   subGreeting: { fontSize: 14, color: '#6B7280', marginBottom: 25, marginTop: 6 },

   searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 54,
      marginBottom: 30,
      borderWidth: 1,
      borderColor: '#F3F4F6'
   },
   placeholderText: { flex: 1, marginLeft: 12, color: '#9CA3AF', fontSize: 15 },

   sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 18 },
   quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 35 },
   quickItem: { alignItems: 'center', width: 80 },
   quickIconBox: {
      width: 56,
      height: 56,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2
   },
   quickLabel: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },

   sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
   linkText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },

   apptCard: {
      backgroundColor: 'white',
      borderRadius: 24,
      padding: 20,
      marginBottom: 30,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
      borderWidth: 1,
      borderColor: '#F3F4F6'
   },
   apptRow: { flexDirection: 'row', marginBottom: 20 },
   blueLine: { width: 4, backgroundColor: COLORS.primary, borderRadius: 2, marginRight: 16, height: '100%' },
   patientName: { fontSize: 18, fontWeight: '700', color: '#111827' },
   timeText: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
   tag: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
   tagText: { fontSize: 11, color: COLORS.primary, fontWeight: '700', textTransform: 'uppercase' },
   reasonText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
   btnRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
   startBtn: { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
   startBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
   detailsBtn: { flex: 1, backgroundColor: '#F9FAFC', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
   detailsBtnText: { color: '#374151', fontWeight: 'bold', fontSize: 14 },

   recentCard: { backgroundColor: '#F9FAFC', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
   recentItem: { flexDirection: 'row', alignItems: 'center' },
   recentAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#DBEAFE', marginRight: 14, justifyContent: 'center', alignItems: 'center' },
   recentName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1F2937' },
   statusBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
   statusText: { color: '#059669', fontSize: 11, fontWeight: '700' },

   modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
   modalTransparentLayer: { flex: 1 },
   modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20 },
   dragHandle: { width: 40, height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 25 },
   modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
   modalSub: { fontSize: 14, color: '#6B7280', marginBottom: 30 },
   modalItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', width: '100%', padding: 18, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 5 },
   modalIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
   modalItemTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
   modalItemSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
   closeBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', marginTop: 15, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10 }
});