import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import BottomNavBar from '../../components/BottomNavBar';
import Sidebar from '../../components/Sidebar';
import { patientAPI, authAPI, notificationAPI } from '../../services/api';

const { width } = Dimensions.get('window');

export default function PatientDashboard({ navigation }) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [nextAppointment, setNextAppointment] = useState(null);
  const [recentVisits, setRecentVisits] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

      // Fetch patient profile
      const profileRes = await authAPI.getCurrentUser().catch(() => ({ data: { full_name: 'Patient' } }));
      const fullName = profileRes.data?.name || profileRes.data?.full_name || 'Patient';
      setPatientName(fullName);

      // Fetch next appointment
      try {
        const appointmentsRes = await patientAPI.getMyAppointments();
        const appointments = appointmentsRes.data || [];
        const now = new Date();

        // Include today's appointments that are upcoming or recently passed (within 2 hours)
        const upcoming = appointments
          .map(apt => ({
            ...apt,
            sortDate: new Date(apt.appointment_date || apt.requested_date || apt.scheduled_at)
          }))
          .filter(apt => {
            if (isNaN(apt.sortDate.getTime())) return false;
            // Show if it's in the future or started in the last 2 hours
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            return apt.sortDate >= twoHoursAgo && (apt.status === 'accepted' || apt.status === 'pending');
          })
          .sort((a, b) => a.sortDate - b.sortDate);

        setNextAppointment(upcoming.length > 0 ? upcoming[0] : null);
      } catch (err) {
        setNextAppointment(null);
      }

      // Fetch last visits
      try {
        const consultationsRes = await patientAPI.getMyConsultations(5).catch(() => ({ data: [] }));
        const consultations = consultationsRes.data?.consultations || consultationsRes.data || [];
        setRecentVisits(Array.isArray(consultations) ? consultations : []);
      } catch (err) {
        setRecentVisits([]);
      }

      // Fetch unread notifications count
      try {
        const notifRes = await notificationAPI.getNotifications({ is_read: false, limit: 1 });
        setUnreadCount(notifRes.data?.total || 0);
      } catch (err) {
        setUnreadCount(0);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getTodayDate = () => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  const formatAMPM = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return 'N/A';
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your healthy dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Sidebar
        isVisible={isSidebarVisible}
        onClose={() => setIsSidebarVisible(false)}
        navigation={navigation}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setIsSidebarVisible(true)} style={styles.menuBtn}>
            <Ionicons name="menu-outline" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.nameText}>{patientName.split(' ')[0]}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('PatientNotificationsScreen')}
          >
            <Ionicons name="notifications-outline" size={26} color="#1A1A1A" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifCount}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('PatientSettingsScreen')}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <Text style={styles.todayText}>{getTodayDate()}</Text>

        {/* Up Next Section - Premium Design */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Appointment</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ScheduleScreen')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {nextAppointment ? (
          <TouchableOpacity
            style={styles.appointmentCard}
            onPress={() => navigation.navigate('ScheduleScreen')}
            activeOpacity={0.9}
          >
            <View style={styles.appointmentContent}>
              <View style={styles.appointmentLogo}>
                <Ionicons name="videocam" size={24} color="white" />
              </View>
              <View style={styles.appointmentDetails}>
                <View style={styles.appointmentTopRow}>
                  <Text style={styles.appointmentDoctor}>Dr. {nextAppointment.doctor?.full_name || 'Specialist'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: nextAppointment.status === 'accepted' ? '#E8F5E9' : '#FFF3E0' }]}>
                    <Text style={[styles.statusText, { color: nextAppointment.status === 'accepted' ? '#4CAF50' : '#FF9800' }]}>
                      {nextAppointment.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.appointmentReason} numberOfLines={1}>{nextAppointment.reason || 'Medical Consultation'}</Text>
                <View style={styles.appointmentTimeRow}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.appointmentTimeText}>
                    {nextAppointment.sortDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} • {formatAMPM(nextAppointment.sortDate)}
                  </Text>
                </View>
              </View>
            </View>
            {nextAppointment.status === 'accepted' && (
              <TouchableOpacity
                style={styles.joinBtnDashboard}
                onPress={() => navigation.navigate('VideoCallScreen', { appointment: nextAppointment, role: 'patient' })}
              >
                <Text style={styles.joinBtnTextDashboard}>Join Call</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyAptCard}>
            <View style={styles.emptyAptIcon}>
              <Ionicons name="calendar-outline" size={32} color="#AAA" />
            </View>
            <View style={styles.emptyAptTextContainer}>
              <Text style={styles.emptyAptTitle}>No upcoming appointments</Text>
              <Text style={styles.emptyAptSub}>Stay proactive about your health.</Text>
            </View>
            <TouchableOpacity
              style={styles.bookNowBtn}
              onPress={() => navigation.navigate('ScheduleScreen')}
            >
              <Text style={styles.bookNowText}>Book</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {[
            { id: 'book', label: 'Book Appointment', icon: 'calendar', color: '#448AFF', bg: '#E3F2FD', screen: 'ScheduleScreen' },
            { id: 'records', label: 'Medical Records', icon: 'document-text', color: '#FF9800', bg: '#FFF3E0', screen: 'MedicalRecordsScreen' },
            { id: 'messages', label: 'Chat with Doctor', icon: 'chatbubbles', color: '#9C27B0', bg: '#F3E5F5', screen: 'MessagesScreen' },
            { id: 'health', label: 'Health Vitals', icon: 'heart', color: '#F44336', bg: '#FFEBEE', screen: 'HealthMetrics' }
          ].map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, { backgroundColor: action.bg }]}
              onPress={() => navigation.navigate(action.screen)}
            >
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
                <Ionicons name={action.icon} size={26} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Visits</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MedicalRecordsScreen')}>
            <Text style={styles.seeAllText}>History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentActivityContainer}>
          {recentVisits.length > 0 ? (
            recentVisits.slice(0, 3).map((visit, index) => (
              <TouchableOpacity
                key={visit.id || index}
                style={styles.activityItem}
                onPress={() => navigation.navigate('MedicalRecordsScreen')}
              >
                <View style={styles.activityIcon}>
                  <Ionicons name="medical" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityUser}>Dr. {visit.doctor_name || visit.doctor?.full_name || 'Specialist'}</Text>
                  <Text style={styles.activityType}>{visit.status?.toUpperCase() || 'COMPLETED'}</Text>
                </View>
                <Text style={styles.activityTime}>
                  {new Date(visit.created_at || visit.scheduled_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>No recent visits recorded</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNavBar navigation={navigation} activeTab="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 20, color: '#666', fontSize: 16, fontWeight: '500' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: { marginRight: 15 },
  greetingContainer: { justifyContent: 'center' },
  greetingText: { fontSize: 14, color: '#888', fontWeight: '500' },
  nameText: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },

  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { padding: 8, marginRight: 5, position: 'relative' },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FF5252',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white'
  },
  notifCount: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 5
  },

  scrollContent: { padding: 20, paddingBottom: 100 },
  todayText: { fontSize: 13, color: COLORS.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', color: '#1A1A1A' },
  seeAllText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  // Appointment Card
  appointmentCard: {
    backgroundColor: '#000', // Premium dark card
    borderRadius: 24,
    padding: 20,
    marginBottom: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15
  },
  appointmentContent: { flexDirection: 'row', alignItems: 'center' },
  appointmentLogo: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  appointmentDetails: { flex: 1 },
  appointmentTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  appointmentDoctor: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },
  appointmentReason: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  appointmentTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appointmentTimeText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  joinBtnDashboard: {
    backgroundColor: COLORS.primary,
    marginTop: 15,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  joinBtnTextDashboard: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  // Empty Appointment
  emptyAptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#CCC'
  },
  emptyAptIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E4E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  emptyAptTextContainer: { flex: 1 },
  emptyAptTitle: { fontSize: 15, fontWeight: 'bold', color: '#444' },
  emptyAptSub: { fontSize: 13, color: '#888', marginTop: 2 },
  bookNowBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  bookNowText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 30
  },
  actionCard: {
    width: (width - 55) / 2,
    padding: 20,
    borderRadius: 24,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 120
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15
  },
  actionLabel: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A', lineHeight: 20 },

  // Recent Activity
  recentActivityContainer: {
    backgroundColor: '#F9FAFC',
    borderRadius: 20,
    padding: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5
  },
  activityIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  activityInfo: { flex: 1 },
  activityUser: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A' },
  activityType: { fontSize: 11, color: '#888', fontWeight: '700', marginTop: 2 },
  activityTime: { fontSize: 12, color: '#AAA', fontWeight: '500' },
  emptyActivity: { padding: 30, alignItems: 'center' },
  emptyActivityText: { color: '#AAA', fontSize: 14 }
});