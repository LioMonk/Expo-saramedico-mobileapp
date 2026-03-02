import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import AdminBottomNavBar from '../../components/AdminBottomNavBar';
import AdminSidebar from '../../components/AdminSidebar';
import { authAPI, adminAPI } from '../../services/api';

export default function AdminDashboard({ navigation }) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    activeDoctors: 0,
    pendingApprovals: 0,
    recentActivity: []
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Load admin profile
      try {
        const profileRes = await authAPI.getCurrentUser();
        const fullName = profileRes.data?.full_name || '';
        setAdminName(fullName || 'Admin');
      } catch (e) {
        console.log('Using default admin name');
      }

      // Load dashboard overview data
      try {
        const overviewRes = await adminAPI.getOverview();
        setDashboardData({
          totalUsers: overviewRes.data?.total_users || 0,
          activeDoctors: overviewRes.data?.active_doctors || 0,
          pendingApprovals: overviewRes.data?.pending_approvals || 0,
          recentActivity: overviewRes.data?.recent_activity || []
        });
      } catch (e) {
        console.log('Dashboard overview error:', e.message);
        // Keep default values if API fails
      }

    } catch (error) {
      console.log('Dashboard load:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AdminSidebar
        isVisible={isSidebarVisible}
        onClose={() => setIsSidebarVisible(false)}
        navigation={navigation}
      />

      <View style={styles.contentContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        >

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setIsSidebarVisible(true)}>
              <Ionicons name="menu-outline" size={28} color="#333" />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => navigation.navigate('AdminMessagesScreen')}>
                <Ionicons name="notifications-outline" size={24} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('AdminSettingsScreen')}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={18} color="#FFF" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.greeting}>{getGreeting()}, {adminName}</Text>
          <Text style={styles.dateText}>Today is {dateString}</Text>

          {/* Search Bar */}
          <TouchableOpacity
            style={styles.searchContainer}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('AdminSearchScreen')}
          >
            <Ionicons name="search-outline" size={20} color="#999" />
            <Text style={styles.searchPlaceholder}>Search doctors, hospitals, users...</Text>
          </TouchableOpacity>

          {/* Quick Action Buttons */}
          <View style={styles.quickActionGrid}>
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: '#E3F2FD' }]}
              onPress={() => navigation.navigate('AdminAccountManagementScreen')}
            >
              <Ionicons name="people" size={28} color="#2196F3" />
              <Text style={styles.quickActionLabel}>Manage Users</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: '#E8F5E9' }]}
              onPress={() => navigation.navigate('AdminDoctorsScreen')}
            >
              <Ionicons name="medical" size={28} color="#4CAF50" />
              <Text style={styles.quickActionLabel}>Doctors</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: '#FFF3E0' }]}
              onPress={() => navigation.navigate('AdminInviteMemberScreen')}
            >
              <Ionicons name="person-add" size={28} color="#FF9800" />
              <Text style={styles.quickActionLabel}>Invite User</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: '#F3E5F5' }]}
              onPress={() => navigation.navigate('AdminOrganizationsScreen')}
            >
              <Ionicons name="business" size={28} color="#9C27B0" />
              <Text style={styles.quickActionLabel}>Hospitals</Text>
            </TouchableOpacity>
          </View>

          {/* Alerts Section */}
          <Text style={styles.sectionTitle}>Recent Alerts</Text>
          {dashboardData.pendingApprovals > 0 ? (
            <View style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Ionicons name="alert-circle" size={20} color="#FF9800" />
                <Text style={styles.alertTitle}>New Registration Pending</Text>
              </View>
              <Text style={styles.alertBody}>
                {dashboardData.pendingApprovals} new doctor account{dashboardData.pendingApprovals !== 1 ? 's are' : ' is'} waiting for approval
              </Text>
            </View>
          ) : (
            <View style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.alertTitle}>All Clear</Text>
              </View>
              <Text style={styles.alertBody}>No pending approvals at this time</Text>
            </View>
          )}

          {/* Recent Activity */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AdminAccountManagementScreen')}>
              <Text style={styles.linkText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {dashboardData.recentActivity.length > 0 ? (
              dashboardData.recentActivity.slice(0, 3).map((activity, index) => {
                // Parse timestamp if exists
                let timeStr = 'Recently';
                if (activity.timestamp) {
                  const dateObj = new Date(activity.timestamp);
                  timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                return (
                  <ActivityItem
                    key={index}
                    name={activity.user_name || 'Unknown User'}
                    time={timeStr}
                    desc={activity.event_description || 'Activity'}
                    color={activity.color || '#90CAF9'}
                    icon={activity.icon || 'information-circle'}
                  />
                );
              })
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Ionicons name="time-outline" size={32} color="#ccc" />
                <Text style={{ color: '#999', marginTop: 10, fontSize: 14 }}>No recent activity</Text>
              </View>
            )}
          </View>



          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      <AdminBottomNavBar navigation={navigation} activeTab="Home" />
    </SafeAreaView>
  );
}

const ActivityItem = ({ name, time, desc, color, icon }) => (
  <View style={styles.activityItem}>
    <View style={[styles.activityAvatar, { backgroundColor: color }]}>
      <Ionicons name={icon} size={18} color="#FFF" />
    </View>
    <View style={styles.activityInfo}>
      <Text style={styles.actName}>{name}</Text>
      <Text style={styles.actDesc}><Ionicons name="time-outline" size={10} /> {time} • {desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFC' },
  contentContainer: { flex: 1 },
  scrollContent: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, color: '#666', fontSize: 14 },

  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatar: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  greeting: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  dateText: { fontSize: 13, color: '#666', marginBottom: 20, marginTop: 5 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#EEE', marginBottom: 25 },
  searchPlaceholder: { flex: 1, marginLeft: 10, color: '#999', fontSize: 14 },

  quickActionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
  quickActionCard: { width: '48%', padding: 20, borderRadius: 16, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 10 },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  linkText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },

  alertCard: { backgroundColor: '#FFF8E1', padding: 15, borderRadius: 12, marginBottom: 25, borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  alertTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A1A1A', marginLeft: 8 },
  alertBody: { fontSize: 13, color: '#666' },

  card: { backgroundColor: 'white', borderRadius: 16, padding: 15, marginBottom: 25, borderWidth: 1, borderColor: '#F0F0F0' },
  activityItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  activityAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  activityInfo: { flex: 1 },
  actName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  actDesc: { fontSize: 12, color: '#666', marginTop: 2 },

  quickActions: { marginBottom: 25 },
  actionCard: { backgroundColor: 'white', borderRadius: 16, padding: 15, marginRight: 12, alignItems: 'center', width: 100, borderWidth: 1, borderColor: '#F0F0F0' },
  actionIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionLabel: { fontSize: 12, color: '#333', textAlign: 'center', fontWeight: '500' },
});