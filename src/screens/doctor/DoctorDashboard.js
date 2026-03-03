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
               const aptDate = new Date(apt.scheduled_at || apt.appointment_date);
               aptDate.setHours(0, 0, 0, 0);
               return aptDate.getTime() === today.getTime();
            });

            setTodayAppointmentCount(todaysAppointments.length);

            // Get upcoming appointments (future appointments sorted by date)
            const now = new Date();
            const upcoming = appointments
               .filter(apt => new Date(apt.scheduled_at || apt.appointment_date) > now)
               .sort((a, b) => new Date(a.scheduled_at || a.appointment_date) - new Date(b.scheduled_at || b.appointment_date))
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
            const patients = patientsResponse.data?.patients || patientsResponse.data || [];

            // Sort by last visit and take top 3
            const sorted = patients
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
                  <QuickActionItem icon="chatbubbles" label="AI Assistant" color="#9C27B0" bg="#F3E5F5" onPress={() => navigation.navigate('DoctorAIChatScreen')} />
                  <QuickActionItem icon="document-text" label="Upload Doc" color="#2196F3" bg="#E3F2FD" onPress={openUpload} />
               </View>

               {/* Up Next */}
               <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Up Next</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('DoctorScheduleScreen')}>
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
                                    {new Date(upcomingAppointments[0].scheduled_at || upcomingAppointments[0].appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
   container: { flex: 1, backgroundColor: '#F9FAFC' },
   contentContainer: { flex: 1 },
   scrollContent: { padding: 20 },
   header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
   headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
   avatar: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#DDD' },
   greeting: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
   subGreeting: { fontSize: 13, color: '#666', marginBottom: 20, marginTop: 4 },

   // Search Container as Touchable
   searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#EEE', marginBottom: 25 },
   placeholderText: { flex: 1, marginLeft: 10, color: '#999' }, // Replaced Input with Text

   sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 15 },
   quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
   quickItem: { alignItems: 'center', width: 75 },
   quickIconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
   quickLabel: { fontSize: 11, color: '#333', textAlign: 'center' },
   sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
   linkText: { color: '#2196F3', fontWeight: '600', fontSize: 13 },
   apptCard: { backgroundColor: 'white', borderRadius: 16, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
   apptRow: { flexDirection: 'row', marginBottom: 15 },
   blueLine: { width: 4, backgroundColor: '#2196F3', borderRadius: 2, marginRight: 15, height: '100%' },
   patientName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
   timeText: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
   tag: { backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
   tagText: { fontSize: 10, color: '#2196F3', fontWeight: 'bold' },
   reasonText: { fontSize: 12, color: '#666' },
   ampmText: { fontSize: 12, color: '#999' },
   btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
   startBtn: { flex: 1, backgroundColor: '#2196F3', paddingVertical: 10, borderRadius: 8, marginRight: 10, alignItems: 'center' },
   startBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
   detailsBtn: { flex: 1, backgroundColor: '#F5F5F5', paddingVertical: 10, borderRadius: 8, marginLeft: 10, alignItems: 'center' },
   detailsBtnText: { color: '#333', fontWeight: 'bold', fontSize: 13 },
   recentCard: { backgroundColor: 'white', borderRadius: 16, padding: 15 },
   recentItem: { flexDirection: 'row', alignItems: 'center' },
   recentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#90CAF9', marginRight: 12 },
   recentName: { flex: 1, fontSize: 14, fontWeight: 'bold' },
   statusBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
   statusText: { color: '#2E7D32', fontSize: 11, fontWeight: 'bold' },
   modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
   modalTransparentLayer: { flex: 1 },
   modalContent: { backgroundColor: '#F9FAFC', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, alignItems: 'center' },
   dragHandle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, marginBottom: 20 },
   modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 5 },
   modalSub: { fontSize: 13, color: '#666', marginBottom: 25 },
   modalItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', width: '100%', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
   modalIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
   modalItemTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A1A1A' },
   modalItemSub: { fontSize: 11, color: '#666', marginTop: 2 },
   closeBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1A2A3A', justifyContent: 'center', alignItems: 'center', marginTop: 10 }
});