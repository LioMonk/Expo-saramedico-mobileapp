import React, { useState, useEffect } from 'react';
import {
   View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Image, Modal, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import DoctorBottomNavBar from '../../components/DoctorBottomNavBar';
import DoctorSidebar from '../../components/DoctorSidebar';
import { doctorAPI, getUserData, taskAPI } from '../../services/api';
import { fixUserUrls } from '../../services/urlFixer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DoctorDashboard({ navigation }) {
   const [modalVisible, setModalVisible] = useState(false);
   const [showTaskModal, setShowTaskModal] = useState(false);
   const [isSidebarVisible, setIsSidebarVisible] = useState(false);
   const [doctorName, setDoctorName] = useState('');
   const [doctorAvatar, setDoctorAvatar] = useState(null);
   const [todayAppointmentCount, setTodayAppointmentCount] = useState(0);
   const [loading, setLoading] = useState(true);
   const [recentPatients, setRecentPatients] = useState([]);
   const [upcomingAppointments, setUpcomingAppointments] = useState([]);
   const [recentConsultations, setRecentConsultations] = useState([]);
   const [metrics, setMetrics] = useState({
      pending_notes: 0,
      urgent_notes: 0,
      cleared_today: 0,
      scheduled_today: 0
   });
   const [doctorStatus, setDoctorStatus] = useState('active');
   const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

   useFocusEffect(
      React.useCallback(() => {
         loadDashboardData();
      }, [])
   );

   const loadDashboardData = async () => {
      setLoading(true);
      try {
         // Fetch doctor profile
         const rawData = await getUserData();
         const userData = fixUserUrls(rawData);
         setDoctorName(userData.full_name || 'Doctor');
         setDoctorAvatar(userData.avatar || userData.avatar_url || null);

         // Fetch recent patients & All Patients for mapping
         let patientMap = {};
         try {
            const patientsResponse = await doctorAPI.getPatients();
            const allPatients = patientsResponse.data?.all_patients || [];
            allPatients.forEach(p => {
               if (p.id) patientMap[p.id] = p.name || p.full_name;
            });

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

         // Fetch recent consultations (SOAP Notes)
         try {
            const consultsRes = await doctorAPI.getRecords(); // Fetches /consultations
            const cData = consultsRes.data?.consultations || consultsRes.data?.items || consultsRes.data || [];
            if (Array.isArray(cData)) {
               // Filter for those with SOAP or marked completed
               const recentWithSoap = cData
                  .sort((a, b) => new Date(b.scheduledAt || b.date) - new Date(a.scheduledAt || a.date))
                  .slice(0, 3);
               setRecentConsultations(recentWithSoap);
            }
         } catch (err) {
            console.log('No consultations found');
         }

         // Fetch appointments from real API
         try {
            const appointmentsRes = await doctorAPI.getAppointments();
            const apptsData = appointmentsRes.data || appointmentsRes;
            const appointmentsArray = Array.isArray(apptsData) ? apptsData :
               (apptsData.appointments || apptsData.items || apptsData.data || []);

            const appointments = appointmentsArray.map(apt => ({
               ...apt,
               patient_name: apt.patient_name || patientMap[apt.patient_id]
            }));

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todaysAppointments = appointments.filter(apt => {
               const dateStr = apt.scheduled_at || apt.appointment_date || apt.requested_at || apt.requested_date;
               if (!dateStr) return false;
               const aptDate = new Date(dateStr);
               const startOfApt = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());
               return startOfApt.getTime() === today.getTime();
            });

            setTodayAppointmentCount(todaysAppointments.length);

            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const upcoming = appointments
               .filter(apt => {
                  const dateStr = apt.scheduled_at || apt.appointment_date || apt.requested_at || apt.requested_date;
                  if (!dateStr) return false;
                  const aptDate = new Date(dateStr);
                  return aptDate >= startOfToday && apt.status !== 'completed' && apt.status !== 'cancelled';
               })
               .sort((a, b) => {
                  const dateA = new Date(a.scheduled_at || a.appointment_date || a.requested_at || a.requested_date);
                  const dateB = new Date(b.scheduled_at || b.appointment_date || b.requested_at || b.requested_date);
                  return dateA - dateB;
               })
               .slice(0, 5);

            setUpcomingAppointments(upcoming);
         } catch (err) {
            console.log('No appointments found');
            setTodayAppointmentCount(0);
            setUpcomingAppointments([]);
         }

         // Fetch dashboard metrics
         try {
            const [metricsRes, tasksRes] = await Promise.all([
               doctorAPI.getDashboardMetrics(),
               taskAPI.getTasks()
            ]);

            const tasks = tasksRes.data || [];
            const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

            if (metricsRes.data) {
               setMetrics({
                  ...metricsRes.data,
                  scheduled_today: todayAppointmentCount,
                  cleared_today: metricsRes.data.patients_today || 0,
                  urgent_notes: urgentTasks || metricsRes.data.urgent_notes
               });
            }
         } catch (err) {
            console.log('No dashboard metrics found');
            setMetrics(prev => ({ ...prev, scheduled_today: todayAppointmentCount }));
         }

         try {
            const status = await AsyncStorage.getItem('doctor_status') || 'active';
            setDoctorStatus(status);
         } catch (err) {
            console.log('Error fetching local status');
         }

      } catch (error) {
         console.error('Error loading dashboard data:', error);
      } finally {
         setLoading(false);
      }
   };

   const openNewMeet = () => { setModalVisible(false); navigation.navigate('DoctorLiveConsultScreen'); };
   const openAddPatient = () => { setModalVisible(false); navigation.navigate('DoctorAddPatientScreen'); };
   const openUpload = () => { setModalVisible(false); navigation.navigate('DoctorUploadScreen'); };

   const [taskForm, setTaskForm] = useState({ title: '', description: '', due_date: new Date(), priority: 'normal', status: 'pending' });
   const [showDatePicker, setShowDatePicker] = useState(false);
   const [showPriorityPicker, setShowPriorityPicker] = useState(false);
   const [showStatusPicker, setShowStatusPicker] = useState(false);

   const handleCreateTask = async () => {
      if (!taskForm.title) return alert('Title is required');
      try {
         await taskAPI.createTask({
            title: taskForm.title,
            description: taskForm.description,
            due_date: taskForm.due_date.toISOString(),
            priority: taskForm.priority,
            status: taskForm.status
         });
         setShowTaskModal(false);
         setTaskForm({ title: '', description: '', due_date: new Date(), priority: 'normal', status: 'pending' });
         alert('Task created successfully');
      } catch (err) {
         console.error('Error creating task:', err);
         alert('Failed to create task');
      }
   };

   const handleStatusToggle = async () => {
      const newStatus = doctorStatus === 'active' ? 'inactive' : 'active';
      setIsUpdatingStatus(true);
      try {
         await doctorAPI.setStatus(newStatus);
         setDoctorStatus(newStatus);
         await AsyncStorage.setItem('doctor_status', newStatus);
      } catch (err) {
         console.error('Error updating status:', err);
         alert('Failed to update status');
      } finally {
         setIsUpdatingStatus(false);
      }
   };

   return (
      <SafeAreaView style={styles.container}>

         <DoctorSidebar
            isVisible={isSidebarVisible}
            onClose={() => setIsSidebarVisible(false)}
            navigation={navigation}
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
                        {doctorAvatar ? (
                           <Image source={{ uri: doctorAvatar }} style={styles.avatar} />
                        ) : (
                           <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center' }]}>
                              <Ionicons name="person" size={20} color="#3B82F6" />
                           </View>
                        )}
                     </TouchableOpacity>
                  </View>
               </View>

               {/* Greeting — above search bar */}
               <Text style={styles.greeting}>Good {getTimeOfDay()}, Dr. {doctorName}</Text>
               <View style={styles.statusRow}>
                  <Text style={styles.subGreeting}>
                     You have <Text style={{ fontWeight: 'bold' }}>{metrics.scheduled_today || todayAppointmentCount} {metrics.scheduled_today === 1 || todayAppointmentCount === 1 ? 'appointment' : 'appointments'}</Text> today
                  </Text>
                  <TouchableOpacity
                     style={[
                        styles.statusToggle,
                        { backgroundColor: doctorStatus === 'active' ? '#ECFDF5' : '#F1F5F9' }
                     ]}
                     onPress={handleStatusToggle}
                     disabled={isUpdatingStatus}
                  >
                     <View style={[
                        styles.statusDot,
                        { backgroundColor: doctorStatus === 'active' ? '#10B981' : '#94A3B8' }
                     ]} />
                     <Text style={[
                        styles.statusToggleText,
                        { color: doctorStatus === 'active' ? '#059669' : '#64748B' }
                     ]}>
                        {doctorStatus === 'active' ? 'Active' : 'Inactive'}
                     </Text>
                  </TouchableOpacity>
               </View>

               {/* Search bar — below greeting */}
               <TouchableOpacity
                  style={styles.searchContainer}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('DoctorSearchScreen')}
               >
                  <Ionicons name="search-outline" size={20} color="#999" />
                  <Text style={styles.placeholderText}>Search patients, reports, notes...</Text>
               </TouchableOpacity>

               {/* Dashboard Metrics Grid */}
               <View style={styles.metricsGrid}>
                  <View style={[styles.metricCard, { backgroundColor: '#EFF6FF' }]}>
                     <View style={[styles.summaryIcon, { backgroundColor: '#DBEAFE' }]}>
                        <Ionicons name="clipboard-outline" size={20} color="#3B82F6" />
                     </View>
                     <Text style={styles.metricLabel}>Pending Review</Text>
                     <Text style={styles.metricValue}>{metrics.pending_notes || 0}</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: '#FEF2F2' }]}>
                     <View style={[styles.summaryIcon, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="warning-outline" size={20} color="#EF4444" />
                     </View>
                     <Text style={styles.metricLabel}>High Urgency</Text>
                     <Text style={styles.metricValue}>{metrics.urgent_notes || 0}</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: '#F0FDF4' }]}>
                     <View style={[styles.summaryIcon, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#16A34A" />
                     </View>
                     <Text style={styles.metricLabel}>Cleared Today</Text>
                     <Text style={styles.metricValue}>{metrics.cleared_today || 0}</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: '#FFF7ED' }]}>
                     <View style={[styles.summaryIcon, { backgroundColor: '#FFEDD5' }]}>
                        <Ionicons name="people-outline" size={20} color="#F97316" />
                     </View>
                     <Text style={styles.metricLabel}>Today's Total Meetings</Text>
                     <Text style={styles.metricValue}>{metrics.scheduled_today || 0}</Text>
                  </View>
               </View>

               {/* Quick Actions */}
               <Text style={styles.sectionTitle}>Quick Actions</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 35 }}>
                  <View style={styles.quickRowScroll}>
                     <QuickActionItem icon="videocam" label="New Meet" color="#2196F3" bg="#E3F2FD" onPress={openNewMeet} />
                     <QuickActionItem icon="person-add" label="Add Patient" color="#2196F3" bg="#E3F2FD" onPress={openAddPatient} />
                     <QuickActionItem icon="checkmark-circle" label="Create Task" color="#FF9800" bg="#FFF3E0" onPress={() => setShowTaskModal(true)} />
                     <QuickActionItem icon="sparkles" label="AI Assistant" color="#9C27B0" bg="#F3E5F5" onPress={() => navigation.navigate('DoctorAIChatListScreen')} />
                     <QuickActionItem icon="document-text" label="Upload Doc" color="#2196F3" bg="#E3F2FD" onPress={openUpload} />
                  </View>
               </ScrollView>

               {/* Up Next */}
               <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('DoctorScheduleScreen', { viewMode: 'calendar' })}>
                     <Text style={styles.linkText}>View Calendar</Text>
                  </TouchableOpacity>
               </View>

               <View style={{ marginBottom: 20 }}>
                  {upcomingAppointments.length > 0 ? (
                     upcomingAppointments.slice(0, 3).map((appt, idx) => (
                        <View key={appt.id || idx} style={[styles.apptCard, { marginBottom: 15 }]}>
                           <View style={styles.apptRow}>
                              <View style={styles.blueLine} />
                              <View style={{ flex: 1 }}>
                                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Text style={styles.patientName} numberOfLines={1}>{appt.patient?.full_name || appt.patient_name || 'Patient'}</Text>
                                    <Text style={styles.timeText}>
                                       {new Date(appt.scheduled_at || appt.appointment_date || appt.requested_at || appt.requested_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                 </View>
                                 <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <View style={styles.tag}><Text style={styles.tagText}>{appt.status || 'Scheduled'}</Text></View>
                                    <Text style={styles.reasonText} numberOfLines={1}>{appt.reason || 'Visit'}</Text>
                                 </View>
                              </View>
                           </View>
                           <View style={styles.btnRow}>
                              {(appt.meet_link || appt.meetLink || appt.join_url || appt.joinUrl) ? (
                                 <TouchableOpacity
                                    style={[styles.startBtn, { backgroundColor: '#10B981', flex: 1.5 }]}
                                    onPress={() => navigation.navigate('VideoCallScreen', {
                                       appointment: appt,
                                       role: 'doctor'
                                    })}
                                 >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                       <Ionicons name="videocam" size={16} color="white" />
                                       <Text style={styles.startBtnText}>Join Room</Text>
                                    </View>
                                 </TouchableOpacity>
                              ) : (
                                 <TouchableOpacity
                                    style={styles.startBtn}
                                    onPress={() => navigation.navigate('DoctorPatientDetailScreen', { patient: appt.patient, patientId: appt.patient_id })}
                                 >
                                    <Text style={styles.startBtnText}>Start Visit</Text>
                                 </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                 style={styles.detailsBtn}
                                 onPress={() => navigation.navigate('DoctorQuickUploadScreen', { patient: appt.patient })}
                              >
                                 <Text style={styles.detailsBtnText}>Upload Doc</Text>
                              </TouchableOpacity>
                           </View>
                        </View>
                     ))
                  ) : (
                     <View style={styles.apptCard}>
                        <View style={{ padding: 20, alignItems: 'center' }}>
                           <Text style={{ color: '#999' }}>No upcoming appointments</Text>
                        </View>
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
                  recentPatients.map((patient) => {
                     const name = patient.name || patient.fullName || patient.full_name || 'Patient';
                     return (
                        <TouchableOpacity
                           key={patient.id}
                           style={styles.recentCard}
                           onPress={() => navigation.navigate('DoctorPatientDetailScreen', { patient, patientId: patient.id })}
                        >
                           <View style={styles.recentItem}>
                              <View style={[styles.recentAvatar, { backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center' }]}>
                                 <Ionicons name="person" size={16} color={COLORS.primary} />
                              </View>
                              <Text style={styles.recentName}>{name}</Text>
                              <View style={styles.statusBadge}>
                                 <Text style={styles.statusText}>• {patient.statusTag || 'Active'}</Text>
                              </View>
                           </View>
                        </TouchableOpacity>
                     )
                  })
               ) : (
                  <View style={styles.recentCard}>
                     <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#999' }}>No recent patients</Text>
                     </View>
                  </View>
               )}

               {/* Recent SOAP Notes */}
               <View style={[styles.sectionHeader, { marginTop: 25 }]}>
                  <Text style={styles.sectionTitle}>Recent SOAP Notes</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('DoctorPatientDirectoryScreen')}>
                     <Text style={styles.linkText}>View History</Text>
                  </TouchableOpacity>
               </View>

               {recentConsultations.length > 0 ? (
                  recentConsultations.map((consult) => (
                     <TouchableOpacity
                        key={consult.id}
                        style={styles.recentCard}
                        onPress={() => navigation.navigate('DoctorSoapViewScreen', { consultationId: consult.id, consultation: consult })}
                     >
                        <View style={styles.recentItem}>
                           <View style={[styles.recentAvatar, { backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center' }]}>
                              <Ionicons name="document-text" size={18} color="#9C27B0" />
                           </View>
                           <View style={{ flex: 1 }}>
                              <Text style={styles.recentName}>{consult.patient_name || consult.patient?.full_name || 'Patient Record'}</Text>
                              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                                 {new Date(consult.scheduledAt || consult.date).toLocaleDateString()} • {consult.chiefComplaint || consult.reason || 'General Visit'}
                              </Text>
                           </View>
                           <View style={[styles.statusBadge, { backgroundColor: consult.aiStatus === 'completed' ? '#ECFDF5' : '#EFF6FF' }]}>
                              <Text style={[styles.statusText, { color: consult.aiStatus === 'completed' ? '#059669' : COLORS.primary }]}>
                                 {consult.aiStatus === 'completed' ? 'SOAP READY' : 'PROCESSING'}
                              </Text>
                           </View>
                        </View>
                     </TouchableOpacity>
                  ))
               ) : (
                  <View style={styles.recentCard}>
                     <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#999' }}>No recent SOAP notes</Text>
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
         </View >

         {/* Quick Actions Modal */}
         < Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)
         }>
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
         </Modal >


         {/* Create Task Modal */}
         <Modal animationType="slide" transparent={true} visible={showTaskModal} onRequestClose={() => setShowTaskModal(false)}>
            <View style={styles.modalOverlay}>
               <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
                  <View style={styles.modalContent}>
                     <View style={styles.dragHandle} />
                     <Text style={styles.modalTitle}>Create Task</Text>

                     <TextInput
                        style={styles.input}
                        placeholder="Title *"
                        placeholderTextColor="#9CA3AF"
                        value={taskForm.title}
                        onChangeText={(t) => setTaskForm({ ...taskForm, title: t })}
                     />
                     <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                        placeholder="Description"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        value={taskForm.description}
                        onChangeText={(t) => setTaskForm({ ...taskForm, description: t })}
                     />

                     <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, zIndex: 3000 }}>
                        <TouchableOpacity
                           style={[styles.input, { flex: 1, marginRight: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                           onPress={() => setShowDatePicker(true)}
                        >
                           <Text style={{ color: '#374151' }}>{taskForm.due_date.toLocaleDateString()}</Text>
                           <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                        </TouchableOpacity>

                        <View style={{ flex: 1, marginLeft: 5 }}>
                           <TouchableOpacity
                              style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }]}
                              onPress={() => {
                                 setShowPriorityPicker(!showPriorityPicker);
                                 setShowStatusPicker(false);
                              }}
                           >
                              <Text style={{ color: '#374151' }}>{taskForm.priority.charAt(0).toUpperCase() + taskForm.priority.slice(1)}</Text>
                              <Ionicons name={showPriorityPicker ? "chevron-up" : "chevron-down"} size={18} color="#6B7280" />
                           </TouchableOpacity>
                           {showPriorityPicker && (
                              <View style={styles.taskDropdownMenu}>
                                 <TouchableOpacity style={styles.taskDropdownItem} onPress={() => { setTaskForm({ ...taskForm, priority: 'normal' }); setShowPriorityPicker(false); }}>
                                    <Text style={styles.taskDropdownItemText}>Normal</Text>
                                 </TouchableOpacity>
                                 <TouchableOpacity style={styles.taskDropdownItem} onPress={() => { setTaskForm({ ...taskForm, priority: 'urgent' }); setShowPriorityPicker(false); }}>
                                    <Text style={[styles.taskDropdownItemText, { color: '#EF4444', fontWeight: 'bold' }]}>Urgent</Text>
                                 </TouchableOpacity>
                              </View>
                           )}
                        </View>
                     </View>

                     <View style={{ width: '100%', marginBottom: 15, zIndex: 2000 }}>
                        <TouchableOpacity
                           style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }]}
                           onPress={() => {
                              setShowStatusPicker(!showStatusPicker);
                              setShowPriorityPicker(false);
                           }}
                        >
                           <Text style={{ color: '#374151' }}>Status: {taskForm.status.charAt(0).toUpperCase() + taskForm.status.slice(1)}</Text>
                           <Ionicons name={showStatusPicker ? "chevron-up" : "chevron-down"} size={18} color="#6B7280" />
                        </TouchableOpacity>
                        {showStatusPicker && (
                           <View style={styles.taskDropdownMenu}>
                              <TouchableOpacity style={styles.taskDropdownItem} onPress={() => { setTaskForm({ ...taskForm, status: 'pending' }); setShowStatusPicker(false); }}>
                                 <Text style={styles.taskDropdownItemText}>Pending</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.taskDropdownItem} onPress={() => { setTaskForm({ ...taskForm, status: 'completed' }); setShowStatusPicker(false); }}>
                                 <Text style={styles.taskDropdownItemText}>Completed</Text>
                              </TouchableOpacity>
                           </View>
                        )}
                     </View>

                     {showDatePicker && (
                        <DateTimePicker
                           value={taskForm.due_date}
                           mode="date"
                           display="default"
                           onChange={(e, d) => {
                              setShowDatePicker(false);
                              if (d) setTaskForm({ ...taskForm, due_date: d });
                           }}
                        />
                     )}

                     <View style={{ width: '100%', marginTop: 10 }}>
                        <TouchableOpacity style={styles.startBtn} onPress={handleCreateTask}>
                           <Text style={styles.startBtnText}>Save Task</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.detailsBtn, { marginTop: 12 }]} onPress={() => setShowTaskModal(false)}>
                           <Text style={styles.detailsBtnText}>Cancel</Text>
                        </TouchableOpacity>
                     </View>
                  </View>
               </ScrollView>
            </View>
         </Modal>

      </SafeAreaView >
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
   greeting: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginTop: 4 },
   subGreeting: { fontSize: 14, color: '#6B7280', marginTop: 6 },
   statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
   statusToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' },
   statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
   statusToggleText: { fontSize: 13, fontWeight: '700' },

   searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 54,
      marginBottom: 25,
      borderWidth: 1,
      borderColor: '#F3F4F6'
   },
   placeholderText: { flex: 1, marginLeft: 12, color: '#9CA3AF', fontSize: 15 },

   sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 18 },
   quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 35 },
   quickRowScroll: { flexDirection: 'row', gap: 15, paddingRight: 20 },
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
   input: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, fontSize: 15, width: '100%', marginBottom: 15 },

   sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
   linkText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },

   metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
   metricCard: { width: '48%', padding: 16, borderRadius: 20, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
   summaryIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
   metricLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
   metricValue: { fontSize: 28, fontWeight: '800', color: '#111827' },

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
   closeBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', marginTop: 15, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10 },
   taskDropdownMenu: {
      position: 'absolute',
      top: 55,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
      zIndex: 5000
   },
   taskDropdownItem: {
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6'
   },
   taskDropdownItemText: {
      fontSize: 15,
      color: '#374151',
      fontWeight: '500'
   }
});