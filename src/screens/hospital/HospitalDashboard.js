import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { hospitalAPI, authAPI, teamAPI } from '../../services/api';

export default function HospitalDashboard({ navigation }) {
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hospitalName, setHospitalName] = useState('Hospital');
    const [stats, setStats] = useState({
        totalDoctors: 0,
        totalPatients: 0,
        todayAppointments: 0,
        departments: 0,
    });

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);

            // Load user profile
            try {
                const profileRes = await authAPI.getCurrentUser();
                setHospitalName(profileRes.data?.name || profileRes.data?.full_name || 'Hospital');
            } catch (e) {
                // Use default name if API fails
                console.log('Using default hospital name');
            }

            // Try to load dashboard stats (may not exist yet)
            try {
                const dashboardRes = await hospitalAPI.getDashboard();
                if (dashboardRes.data) {
                    setStats(dashboardRes.data);
                }
            } catch (e) {
                console.log('Dashboard stats API not yet available on backend (404 expected). Returning 0 for stats.');
                setStats({
                    totalDoctors: 0,
                    totalPatients: 0,
                    todayAppointments: 0,
                    departments: 0,
                });
            }

        } catch (error) {
            console.log('Dashboard load info:', error.message);
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
            <View style={styles.contentContainer}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                    }
                >

                    {/* Greeting */}
                    <Text style={styles.greeting}>{getGreeting()}, {hospitalName}</Text>
                    <Text style={styles.dateText}>Today is {dateString}</Text>

                    {/* Stats Cards */}
                    <View style={styles.statsGrid}>
                        <TouchableOpacity
                            style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}
                            onPress={() => navigation.navigate('HospitalTeamScreen')}
                        >
                            <Ionicons name="medical" size={28} color="#2196F3" />
                            <Text style={styles.statNumber}>{stats.totalDoctors}</Text>
                            <Text style={styles.statLabel}>Doctors</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}
                            onPress={() => { }}
                        >
                            <Ionicons name="people" size={28} color="#4CAF50" />
                            <Text style={styles.statNumber}>{stats.totalPatients}</Text>
                            <Text style={styles.statLabel}>Patients</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}
                            onPress={() => navigation.navigate('HospitalScheduleScreen')}
                        >
                            <Ionicons name="calendar" size={28} color="#FF9800" />
                            <Text style={styles.statNumber}>{stats.todayAppointments}</Text>
                            <Text style={styles.statLabel}>Today's Appts</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}
                            onPress={() => navigation.navigate('HospitalDepartmentsScreen')}
                        >
                            <Ionicons name="grid" size={28} color="#9C27B0" />
                            <Text style={styles.statNumber}>{stats.departments}</Text>
                            <Text style={styles.statLabel}>Departments</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Quick Actions */}
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('HospitalInviteTeamScreen')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="person-add" size={24} color="#2196F3" />
                            </View>
                            <Text style={styles.actionLabel}>Add Team{'\n'}Member</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('HospitalDepartmentsScreen')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                                <Ionicons name="add-circle" size={24} color="#9C27B0" />
                            </View>
                            <Text style={styles.actionLabel}>Add{'\n'}Department</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('HospitalScheduleScreen')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="today" size={24} color="#FF9800" />
                            </View>
                            <Text style={styles.actionLabel}>View{'\n'}Schedule</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('HospitalSettingsScreen')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="settings" size={24} color="#4CAF50" />
                            </View>
                            <Text style={styles.actionLabel}>Hospital{'\n'}Settings</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Recent Activity */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <TouchableOpacity>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.activityCard, { alignItems: 'center', paddingVertical: 30 }]}>
                        <Ionicons name="time-outline" size={48} color="#DDD" />
                        <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>No recent activity to display.</Text>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    contentContainer: { flex: 1 },
    scrollContent: { padding: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, color: '#666', fontSize: 14 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    avatar: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },

    greeting: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
    dateText: { fontSize: 13, color: '#666', marginBottom: 25, marginTop: 5 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
    statCard: { width: '48%', padding: 15, borderRadius: 16, marginBottom: 12, alignItems: 'center' },
    statNumber: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 8 },
    statLabel: { fontSize: 13, color: '#666', marginTop: 4 },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 15 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    viewAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

    quickActions: { marginBottom: 25 },
    actionCard: { backgroundColor: 'white', borderRadius: 16, padding: 15, marginRight: 12, alignItems: 'center', width: 100, borderWidth: 1, borderColor: '#F0F0F0' },
    actionIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    actionLabel: { fontSize: 12, color: '#333', textAlign: 'center', fontWeight: '500' },

    activityCard: { backgroundColor: 'white', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#F0F0F0' },
    activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    activityIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    activityText: { flex: 1 },
    activityTitle: { fontSize: 14, fontWeight: '500', color: '#333' },
    activityTime: { fontSize: 12, color: '#999', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#F0F0F0' },
});
