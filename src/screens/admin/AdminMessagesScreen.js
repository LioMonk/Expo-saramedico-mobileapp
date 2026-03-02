import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AdminBottomNavBar from '../../components/AdminBottomNavBar';
import { adminAPI } from '../../services/api';

export default function AdminMessagesScreen({ navigation }) {
   const [notifications, setNotifications] = useState([]);
   const [loading, setLoading] = useState(true);

   const loadNotifications = async () => {
      try {
         const overviewRes = await adminAPI.getOverview();
         const activities = overviewRes.data?.recent_activity || [];

         const formatted = activities.map(act => ({
            id: act.id,
            title: act.event_description,
            body: act.user_name,
            time: act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
            isUrgent: act.status !== 'completed'
         }));
         setNotifications(formatted);
      } catch (err) {
         console.log("Error fetching admin notifications:", err);
      } finally {
         setLoading(false);
      }
   };

   // Real-time polling
   useEffect(() => {
      loadNotifications();
      const interval = setInterval(() => {
         loadNotifications();
      }, 10000); // 10 seconds
      return () => clearInterval(interval);
   }, []);

   return (
      <SafeAreaView style={styles.container}>
         <View style={styles.contentContainer}>
            <View style={styles.header}>
               <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
               <Text style={styles.headerTitle}>Notifications</Text>
               <View style={{ width: 24 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
               <Text style={styles.sectionHeader}>RECENT ACTIVITY (Real-time)</Text>

               {loading && notifications.length === 0 ? (
                  <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>Loading notifications...</Text>
               ) : notifications.length === 0 ? (
                  <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No new notifications</Text>
               ) : (
                  notifications.map((notif, index) => (
                     <View key={notif.id || index} style={[styles.messageItem, notif.isUrgent && styles.urgentItem]}>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.msgTitle}>{notif.title || 'System Alert'}</Text>
                           <Text style={styles.msgBody}>{notif.body}</Text>
                        </View>
                        <Text style={[styles.timeText, notif.isUrgent && { color: '#F44336' }]}>{notif.time}</Text>
                     </View>
                  ))
               )}
            </ScrollView>
         </View>
         <AdminBottomNavBar navigation={navigation} activeTab="Messages" />
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: 'white' },
   contentContainer: { flex: 1, padding: 20 },
   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
   headerTitle: { fontSize: 18, fontWeight: 'bold' },
   sectionHeader: { fontSize: 12, color: '#999', marginBottom: 10, marginTop: 10 },
   messageItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
   urgentItem: { backgroundColor: '#FFEBEE', marginHorizontal: -20, paddingHorizontal: 20, borderBottomWidth: 0 },
   msgTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
   msgBody: { fontSize: 13, color: '#666' },
   timeText: { fontSize: 11, color: '#999', marginLeft: 10 },
});