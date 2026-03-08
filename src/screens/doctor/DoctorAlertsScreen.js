import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import DoctorBottomNavBar from '../../components/DoctorBottomNavBar';
import { notificationAPI } from '../../services/api';

export default function DoctorAlertsScreen({ navigation }) {
   const [notifications, setNotifications] = useState([]);
   const [loading, setLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);
   const [filter, setFilter] = useState('All');

   useEffect(() => {
      loadNotifications();
   }, []);

   const loadNotifications = async (isRefreshing = false) => {
      if (!isRefreshing) setLoading(true);
      try {
         const response = await notificationAPI.getNotifications({ limit: 50 });
         // The backend returns a flat array for /notifications
         const data = Array.isArray(response.data) ? response.data : (response.data?.notifications || []);
         setNotifications(data);
      } catch (error) {
         console.error('Failed to load doctor notifications:', error);
      } finally {
         setLoading(false);
         setRefreshing(false);
      }
   };

   const onRefresh = () => {
      setRefreshing(true);
      loadNotifications(true);
   };

   const handleMarkAsRead = async (id) => {
      try {
         await notificationAPI.markAsRead(id);
         setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      } catch (error) {
         console.error('Mark as read failed:', error);
      }
   };

   const handleNotificationPress = async (notif) => {
      // 1. Mark as read if unread
      if (!notif.is_read) {
         handleMarkAsRead(notif.id);
      }

      // 2. Determine navigation based on notification content/type
      const title = (notif.title || '').toLowerCase();
      const message = (notif.message || '').toLowerCase();
      const type = (notif.type || '').toLowerCase();

      // Appointment related
      if (title.includes('appointment') || message.includes('appointment') || type.includes('appointment')) {
         navigation.navigate('DoctorScheduleScreen');
         return;
      }

      // Task related
      if (title.includes('task') || message.includes('task') || type.includes('task')) {
         // Current tasks are visible on Dashboard, but let's navigate to Dashboard for now
         // as there isn't a dedicated TaskList screen yet
         navigation.navigate('DoctorDashboard');
         return;
      }

      // Patient related
      if (title.includes('patient') || message.includes('patient') || type.includes('patient')) {
         // If we have a patient ID in the notification (assuming it might be there)
         const patientId = notif.patient_id || notif.metadata?.patient_id;
         if (patientId) {
            navigation.navigate('DoctorPatientDetailScreen', { patientId });
         } else {
            navigation.navigate('DoctorPatientDirectoryScreen');
         }
         return;
      }

      // AI/Insights related
      if (title.includes('ai') || title.includes('insight') || type.includes('insight') || type.includes('ai')) {
         navigation.navigate('DoctorAIChatListScreen');
         return;
      }

      // Vitals/Health related
      if (title.includes('vital') || message.includes('vital') || title.includes('health') || message.includes('health')) {
         const patientId = notif.patient_id || notif.metadata?.patient_id;
         if (patientId) {
            navigation.navigate('DoctorPatientDetailScreen', { patientId, initialTab: 'Vitals' });
         } else {
            navigation.navigate('DoctorPatientDirectoryScreen');
         }
         return;
      }

      // Document/Record related
      if (title.includes('document') || message.includes('document') || title.includes('record') || message.includes('record') || title.includes('upload')) {
         const patientId = notif.patient_id || notif.metadata?.patient_id;
         if (patientId) {
            navigation.navigate('DoctorPatientDetailScreen', { patientId, initialTab: 'Documents' });
         } else {
            navigation.navigate('DoctorUploadScreen');
         }
         return;
      }

      // Lab/SOAP/Notes related
      if (title.includes('lab') || title.includes('soap') || title.includes('note')) {
         const patientId = notif.patient_id || notif.metadata?.patient_id;
         if (patientId) {
            navigation.navigate('DoctorPatientDetailScreen', { patientId, initialTab: 'Visits' });
         } else {
            navigation.navigate('DoctorDashboard');
         }
         return;
      }

      // Fallback: Dashboard
      navigation.navigate('DoctorDashboard');
   };

   const formatTime = (ts) => {
      const date = new Date(ts);
      const diff = Date.now() - date.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return date.toLocaleDateString();
   };

   const filteredNotifs = notifications.filter(n => {
      if (filter === 'All') return true;
      if (filter === 'Urgent') return n.type?.toLowerCase().includes('critical') || n.type?.toLowerCase().includes('urgent');
      if (filter === 'Insights') return n.type?.toLowerCase().includes('ai') || n.type?.toLowerCase().includes('insight');
      if (filter === 'Patient') return n.type?.toLowerCase().includes('patient') || n.message?.toLowerCase().includes('patient');
      return true;
   });

   return (
      <SafeAreaView style={styles.container}>
         <View style={styles.content}>
            <View style={styles.header}>
               <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color="#333" />
               </TouchableOpacity>
               <Text style={styles.headerTitle}>Notifications</Text>
               <View style={{ width: 24 }} />
            </View>

            {/* Filters */}
            <View style={styles.filterRow}>
               {['All', 'Urgent', 'Insights', 'Patient'].map(f => (
                  <TouchableOpacity
                     key={f}
                     onPress={() => setFilter(f)}
                     style={[styles.chip, filter === f && styles.chipActive]}
                  >
                     <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
                  </TouchableOpacity>
               ))}
            </View>

            {loading && !refreshing ? (
               <View style={styles.center}>
                  <ActivityIndicator color={COLORS.primary} size="large" />
               </View>
            ) : (
               <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 100 }}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color={COLORS.primary} />}
               >
                  {filteredNotifs.length === 0 ? (
                     <View style={styles.empty}>
                        <Ionicons name="notifications-off-outline" size={60} color="#DDD" />
                        <Text style={styles.emptyText}>No notifications</Text>
                     </View>
                  ) : (
                     filteredNotifs.map((notif, index) => (
                        <TouchableOpacity
                           key={notif.id || index}
                           style={[styles.notifItem, notif.type?.toLowerCase().includes('critical') && styles.urgentItem, !notif.is_read && styles.unreadItem]}
                           onPress={() => handleNotificationPress(notif)}
                        >
                           <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                 <Text style={styles.notifTitle}>{notif.title}</Text>
                                 <Text style={[styles.timeText, notif.type?.toLowerCase().includes('critical') && { color: '#F44336' }]}>
                                    {formatTime(notif.created_at)}
                                 </Text>
                              </View>
                              <Text style={styles.notifBody}>{notif.message}</Text>
                           </View>
                        </TouchableOpacity>
                     ))
                  )}
               </ScrollView>
            )}

            <DoctorBottomNavBar
               activeTab="Alerts"
               navigation={navigation}
               onFabPress={() => { }}
            />
         </View>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: 'white' },
   content: { flex: 1, padding: 20, paddingBottom: 0 },
   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
   headerTitle: { fontSize: 18, fontWeight: 'bold' },
   filterRow: { flexDirection: 'row', marginBottom: 20 },
   chip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
   chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
   chipText: { color: '#666', fontSize: 13 },
   chipTextActive: { color: 'white', fontWeight: 'bold' },
   sectionHeader: { fontSize: 12, color: '#999', marginBottom: 10, marginTop: 10, textTransform: 'uppercase' },
   notifItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
   unreadItem: { borderLeftWidth: 4, borderLeftColor: COLORS.primary, paddingLeft: 10 },
   urgentItem: { backgroundColor: '#FFEBEE', marginHorizontal: -20, paddingHorizontal: 20, borderBottomWidth: 0 },
   notifTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
   notifBody: { fontSize: 13, color: '#666', lineHeight: 20 },
   timeText: { fontSize: 11, color: '#999' },
   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
   empty: { alignItems: 'center', marginTop: 100 },
   emptyText: { color: '#999', marginTop: 10, fontSize: 16 }
});