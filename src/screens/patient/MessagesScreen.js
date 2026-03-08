import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BottomNavBar from '../../components/BottomNavBar';
import { notificationAPI } from '../../services/api';
import { COLORS } from '../../constants/theme';

export default function MessagesScreen({ navigation }) {
   const [notifications, setNotifications] = useState([]);
   const [loading, setLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);

   useEffect(() => {
      loadMessages();
   }, []);

   const loadMessages = async (isRefreshing = false) => {
      if (!isRefreshing) setLoading(true);
      try {
         const response = await notificationAPI.getNotifications({ limit: 20 });
         const data = Array.isArray(response.data) ? response.data : (response.data?.notifications || []);
         setNotifications(data);
      } catch (error) {
         console.error('Failed to load messages:', error);
      } finally {
         setLoading(false);
         setRefreshing(false);
      }
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

   const onRefresh = () => {
      setRefreshing(true);
      loadMessages(true);
   };

   return (
      <SafeAreaView style={styles.container}>
         <View style={styles.contentContainer}>
            <View style={styles.header}>
               <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color="#333" />
               </TouchableOpacity>
               <Text style={styles.headerTitle}>Messages & Alerts</Text>
               <View style={{ width: 24 }} />
            </View>

            {loading && !refreshing ? (
               <View style={styles.loading}>
                  <ActivityIndicator color={COLORS.primary} />
               </View>
            ) : (
               <ScrollView
                  showsVerticalScrollIndicator={false}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color={COLORS.primary} />}
               >
                  {notifications.length === 0 ? (
                     <View style={styles.empty}>
                        <Ionicons name="chatbubbles-outline" size={60} color="#DDD" />
                        <Text style={styles.emptyText}>No messages yet</Text>
                     </View>
                  ) : (
                     <>
                        <Text style={styles.sectionHeader}>RECENT UPDATES</Text>
                        {notifications.map((notif, index) => (
                           <View key={notif.id || index} style={[styles.messageItem, !notif.is_read && styles.unreadItem]}>
                              <View style={{ flex: 1 }}>
                                 <Text style={styles.msgTitle}>{notif.title}</Text>
                                 <Text style={styles.msgBody}>{notif.message}</Text>
                              </View>
                              <Text style={styles.timeText}>{formatTime(notif.created_at)}</Text>
                           </View>
                        ))}
                     </>
                  )}
               </ScrollView>
            )}
         </View>

         <BottomNavBar navigation={navigation} activeTab="Messages" />
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: 'white' },
   contentContainer: { flex: 1, padding: 20 },
   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
   headerTitle: { fontSize: 18, fontWeight: 'bold' },
   sectionHeader: { fontSize: 12, color: '#999', marginBottom: 10, marginTop: 10, textTransform: 'uppercase' },
   messageItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
   unreadItem: { backgroundColor: '#F0F9FF', marginHorizontal: -20, paddingHorizontal: 20 },
   msgTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
   msgBody: { fontSize: 13, color: '#666', lineHeight: 18 },
   timeText: { fontSize: 11, color: '#999', marginLeft: 10 },
   loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
   empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
   emptyText: { fontSize: 16, color: '#999', marginTop: 10 }
});