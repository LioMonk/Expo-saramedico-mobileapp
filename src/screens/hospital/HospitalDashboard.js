import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    Image,
    Platform,
    StatusBar,
    Dimensions
} from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { hospitalAPI, calendarAPI, authAPI } from '../../services/api';

const { width } = Dimensions.get('window');

const PALETTE = {
    blue: '#2563EB',
    blueLight: '#DBEAFE',
    indigo: '#4F46E5',
    indigoLight: '#E0E7FF',
    emerald: '#059669',
    emeraldLight: '#D1FAE5',
    amber: '#D97706',
    amberLight: '#FEF3C7',
    rose: '#E11D48',
    roseLight: '#FFE4E6',
    bg: '#F1F5F9',
    card: '#FFFFFF',
    text: '#0F172A',
    sub: '#64748B',
    border: '#E2E8F0',
};

export default function HospitalDashboard({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orgName, setOrgName] = useState('Hospital');
    const [hospitalAvatar, setHospitalAvatar] = useState(null);
    const [orgId, setOrgId] = useState(null);
    const [stats, setStats] = useState({ doctors: 0, patients: 0, staff: 0, consultations: 0 });
    const [recentActivity, setRecentActivity] = useState([]);
    const [todayEvents, setTodayEvents] = useState([]);

    const [showCreateEvent, setShowCreateEvent] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDesc, setEventDesc] = useState('');
    const [eventStart, setEventStart] = useState('');
    const [eventEnd, setEventEnd] = useState('');
    const [creatingEvent, setCreatingEvent] = useState(false);

    useEffect(() => { loadDashboard(); }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);

            // 1. Fetch Basic Identity
            try {
                const profileRes = await authAPI.getCurrentUser();
                const user = profileRes.data;
                setOrgName(user?.name || user?.full_name || 'Hospital Admin');
                setHospitalAvatar(user?.avatar || user?.avatar_url || null);
                setOrgId(user?.role); // store role in orgId temporarily for access check
            } catch (e) { /* silent fallback */ }

            // 2. Fetch Real Metrics (Aggregated from members and appointments)
            try {
                const [membersRes, apptsRes, overRes] = await Promise.all([
                    hospitalAPI.getOrgMembers().catch(() => ({ data: [] })),
                    hospitalAPI.getAppointments({ date: new Date().toISOString().split('T')[0] }).catch(() => ({ data: { events: [] } })),
                    hospitalAPI.getOverview().catch(() => ({ data: {} }))
                ]);

                const members = membersRes.data || [];
                const dCount = members.filter(m => m.role === 'doctor').length;
                const pCount = members.filter(m => m.role === 'patient').length;
                const sCount = members.filter(m => m.role !== 'patient').length;

                // Get appointments count (either from specific appts call or overview)
                const agenda = Array.isArray(apptsRes.data) ? apptsRes.data : (apptsRes.data?.events || []);
                const todayAppts = Math.max(agenda.length, overRes.data?.metrics?.todayAppointments || 0);

                setStats({
                    doctors: dCount,
                    patients: pCount,
                    staff: sCount,
                    consultations: todayAppts
                });

                // Set recent activity from overview or fallback
                const overview = overRes.data || {};
                if (overview.recentActivities?.length > 0) {
                    setRecentActivity(overview.recentActivities.slice(0, 5).map((c, i) => ({
                        id: c.activityId || `act-${i}`,
                        text: c.subject || 'System Event',
                        time: c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
                        status: c.status || 'completed',
                    })));
                } else {
                    // Fallback to audit logs or consultations
                    try {
                        const logsRes = await hospitalAPI.getAuditLogs({ limit: 5 });
                        const logs = logsRes.data?.logs || [];
                        setRecentActivity(logs.slice(0, 5).map(l => ({
                            id: l.id,
                            text: l.action || 'Admin Action',
                            time: l.timestamp ? new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
                            status: 'logged'
                        })));
                    } catch (err) { /* silent */ }
                }

                // Organization name from actual org data
                try {
                    const orgRes = await hospitalAPI.getOrganization();
                    if (orgRes.data?.name) setOrgName(orgRes.data.name);
                } catch (e) { /* silent */ }

            } catch (e) {
                console.warn('Metrics aggregation failed:', e.message);
            }

            // 3. Today's Agenda
            try {
                const today = new Date().toISOString().split('T')[0];
                const evRes = await calendarAPI.getDayAgenda(today);
                setTodayEvents((evRes.data?.events || []).slice(0, 3));
            } catch (e) { /* silent */ }

        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadDashboard();
        setRefreshing(false);
    }, []);

    const handleCreateEvent = async () => {
        if (!eventTitle.trim() || !eventStart.trim() || !eventEnd.trim()) {
            Alert.alert('Missing Fields', 'Required fields are missing.');
            return;
        }
        setCreatingEvent(true);
        try {
            await calendarAPI.createEvent({
                title: eventTitle.trim(),
                description: eventDesc.trim(),
                start_time: new Date(eventStart).toISOString(),
                end_time: new Date(eventEnd).toISOString(),
            });
            Alert.alert('Success', 'Event created.');
            setShowCreateEvent(false);
            loadDashboard();
        } catch (e) {
            Alert.alert('Error', 'Failed to create event.');
        } finally {
            setCreatingEvent(false);
        }
    };

    const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={PALETTE.blue} />
                <Text style={styles.loadingText}>Syncing hospital data…</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PALETTE.blue]} />}
            >
                {/* ─── Header Section ─── */}
                <View style={styles.headerNode}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.iconBox}>
                            <Ionicons name="grid" size={20} color={PALETTE.blue} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.avatarNode} onPress={() => {
                            if (orgId === 'admin') {
                                navigation.navigate('HospitalSettingsScreen');
                            } else {
                                Alert.alert('Access Denied', 'Only administrators can access system settings.');
                            }
                        }}>
                            {hospitalAvatar ? (
                                <Image source={{ uri: hospitalAvatar }} style={styles.avatarImg} />
                            ) : (
                                <View style={styles.avatarCircle}>
                                    <Ionicons name="business" size={20} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                    <View style={styles.welcomeRow}>
                        <View style={{ flex: 1, paddingRight: 15 }}>
                            <Text style={styles.hospitalBrand} numberOfLines={1}>Clinical Dashboard</Text>
                            <View style={styles.greetRow}>
                                <Text style={styles.greetText}>{greeting}{orgName && orgName !== 'Hospital Admin' ? `, ${orgName}` : ''}. Your clinical queue is {stats.consultations > 0 ? `active with ${stats.consultations} events` : 'clear'}.</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('HospitalNotificationsScreen')}>
                            <Ionicons name="notifications" size={22} color={PALETTE.text} />
                            <View style={styles.badgeDot} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─── Main Overview ─── */}
                <View style={[styles.featuredCard, { backgroundColor: PALETTE.blue }]}>
                    <View style={styles.featuredContent}>
                        <View>
                            <Text style={styles.featLabel}>Appointments Today</Text>
                            <Text style={styles.featValue}>{stats.consultations}</Text>
                        </View>
                        <View style={styles.featIconBox}>
                            <Ionicons name="calendar-outline" size={32} color="white" style={{ opacity: 0.3 }} />
                        </View>
                    </View>
                    <View style={styles.featFooter}>
                        <TouchableOpacity style={styles.featBtn} onPress={() => navigation.navigate('HospitalAppointmentsScreen')}>
                            <Text style={styles.featBtnText}>View Schedule</Text>
                            <Ionicons name="arrow-forward" size={14} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─── Core Metrics ─── */}
                <View style={styles.metricGrid}>
                    {[
                        { label: 'Doctors', val: stats.doctors, icon: 'medical', color: PALETTE.indigo, bg: PALETTE.indigoLight, nav: 'HospitalDirectoryScreen' },
                        { label: 'Patients', val: stats.patients, icon: 'people', color: PALETTE.emerald, bg: PALETTE.emeraldLight, nav: 'HospitalPatientsScreen' },
                        { label: 'Staff', val: stats.staff, icon: 'shirt', color: PALETTE.rose, bg: PALETTE.roseLight, nav: 'HospitalStaffScreen' },
                    ].map(m => (
                        <TouchableOpacity key={m.label} style={styles.metricCard} onPress={() => navigation.navigate(m.nav)}>
                            <View style={[styles.mIconBox, { backgroundColor: m.bg }]}>
                                <Ionicons name={m.icon} size={18} color={m.color} />
                            </View>
                            <Text style={styles.mValue}>{m.val}</Text>
                            <Text style={styles.mLabel}>{m.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ─── Quick Access ─── */}
                <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionStrip}>
                    {[
                        { label: 'Departments', icon: 'layers-outline', color: '#9C27B0', bg: '#F3E5F5', nav: 'HospitalDepartmentsScreen' },
                        { label: 'Onboard Dr', icon: 'person-add-outline', color: '#3B82F6', bg: '#EFF6FF', nav: 'HospitalCreateDoctorScreen' },
                        { label: 'Invite Staff', icon: 'mail-open-outline', color: '#64748B', bg: '#F1F5F9', nav: 'HospitalInviteTeamScreen' },
                        { label: 'New Event', icon: 'calendar-outline', color: '#10B981', bg: '#F0FDF4', onPress: () => setShowCreateEvent(true) },
                    ].map(a => (
                        <TouchableOpacity key={a.label} style={styles.stripItem} onPress={a.onPress || (() => navigation.navigate(a.nav))}>
                            <View style={[styles.stripIcon, { backgroundColor: a.bg }]}>
                                <Ionicons name={a.icon} size={22} color={a.color} />
                            </View>
                            <Text style={styles.stripLabel}>{a.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ─── Today's Agenda ─── */}
                <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>Daily Agenda</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('HospitalAppointmentsScreen')}>
                        <Text style={styles.viewLink}>View Full</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.agendaBox}>
                    {todayEvents.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-clear-outline" size={32} color="#CBD5E1" style={{ marginBottom: 10 }} />
                            <Text style={styles.emptyText}>No events on your radar today.</Text>
                        </View>
                    ) : todayEvents.map((ev, i) => (
                        <View key={ev.id || i} style={[styles.agendaItem, i < todayEvents.length - 1 && styles.itemDivider]}>
                            <View style={[styles.agendaIcon, { backgroundColor: (ev.color || PALETTE.blue) + '15' }]}>
                                <Ionicons name="time-outline" size={18} color={ev.color || PALETTE.blue} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.agendaEvent}>{ev.title}</Text>
                                <Text style={styles.agendaTime}>
                                    {ev.start_time ? new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All Day'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                        </View>
                    ))}
                </View>

                {/* ─── Recent Logs ─── */}
                <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                </View>
                <View style={styles.logBox}>
                    {recentActivity.map((log, i) => (
                        <View key={log.id || i} style={[styles.logItem, i < recentActivity.length - 1 && styles.itemDivider]}>
                            <View style={styles.logMarker} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.logText} numberOfLines={1}>{log.text}</Text>
                                <Text style={styles.logTime}>{log.time}</Text>
                            </View>
                            <View style={styles.badgeLabel}>
                                <Text style={styles.badgeLabelText}>{log.status}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Modal remains same logic but with polished UI */}
            <Modal visible={showCreateEvent} animationType="fade" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalTop}>
                            <Text style={styles.modalTitle}>New Event</Text>
                            <TouchableOpacity onPress={() => setShowCreateEvent(false)}>
                                <Ionicons name="close" size={24} color={PALETTE.text} />
                            </TouchableOpacity>
                        </View>
                        <TextInput style={styles.mInput} placeholder="Event Title" value={eventTitle} onChangeText={setEventTitle} placeholderTextColor="#94A3B8" />
                        <TextInput style={[styles.mInput, { height: 80 }]} placeholder="Summary" value={eventDesc} onChangeText={setEventDesc} multiline placeholderTextColor="#94A3B8" />
                        <TextInput style={styles.mInput} placeholder="Starts (YYYY-MM-DD HH:MM)" value={eventStart} onChangeText={setEventStart} placeholderTextColor="#94A3B8" />
                        <TextInput style={styles.mInput} placeholder="Ends (YYYY-MM-DD HH:MM)" value={eventEnd} onChangeText={setEventEnd} placeholderTextColor="#94A3B8" />
                        <TouchableOpacity style={styles.modalAction} onPress={handleCreateEvent}>
                            {creatingEvent ? <ActivityIndicator color="white" /> : <Text style={styles.modalActionText}>Confirm Event</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PALETTE.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: PALETTE.sub, fontSize: 13, fontWeight: '700' },
    scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },

    headerNode: { marginBottom: 25, paddingTop: Platform.OS === 'ios' ? 45 : 15 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: PALETTE.border },
    avatarNode: { width: 44, height: 44, borderRadius: 14, backgroundColor: PALETTE.blue, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%' },
    avatarCircle: { flex: 1, backgroundColor: PALETTE.blue, justifyContent: 'center', alignItems: 'center' },
    welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    greetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
    greetText: { fontSize: 13, color: PALETTE.sub, fontWeight: '500', marginTop: 4 },
    hospitalBrand: { fontSize: 24, fontWeight: '900', color: PALETTE.text, letterSpacing: -0.5 },
    bellBtn: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: PALETTE.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    badgeDot: { position: 'absolute', top: 14, right: 14, width: 10, height: 10, borderRadius: 5, backgroundColor: PALETTE.rose, borderWidth: 2, borderColor: 'white' },

    featuredCard: { borderRadius: 24, padding: 24, marginBottom: 25, shadowColor: PALETTE.blue, shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
    featuredContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    featLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
    featValue: { fontSize: 38, fontWeight: '900', color: 'white', marginTop: 4 },
    featIconBox: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    featFooter: { marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15 },
    featBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    featBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },

    metricGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    metricCard: { width: (width - 60) / 3, backgroundColor: 'white', borderRadius: 22, padding: 15, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
    mIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    mValue: { fontSize: 18, fontWeight: '900', color: PALETTE.text },
    mLabel: { fontSize: 11, color: PALETTE.sub, fontWeight: '700', marginTop: 2 },

    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: PALETTE.text },
    viewLink: { fontSize: 13, color: PALETTE.blue, fontWeight: '700' },

    actionStrip: { gap: 12, paddingBottom: 10, paddingRight: 40 },
    stripItem: { width: 100, alignItems: 'center', backgroundColor: 'white', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: PALETTE.border },
    stripIcon: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    stripLabel: { fontSize: 10, fontWeight: '800', color: PALETTE.text, textAlign: 'center' },

    agendaBox: { backgroundColor: 'white', borderRadius: 24, padding: 18, marginBottom: 30, borderWidth: 1, borderColor: PALETTE.border, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10 },
    agendaItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 14 },
    agendaIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    agendaEvent: { fontSize: 14, fontWeight: '800', color: PALETTE.text },
    agendaTime: { fontSize: 12, color: PALETTE.sub, fontWeight: '600', marginTop: 1 },
    itemDivider: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    emptyState: { paddingVertical: 20, alignItems: 'center' },
    emptyText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

    logBox: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 40, borderWidth: 1, borderColor: PALETTE.border },
    logItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    logMarker: { width: 6, height: 6, borderRadius: 3, backgroundColor: PALETTE.border },
    logText: { fontSize: 13, fontWeight: '600', color: PALETTE.text, flex: 1 },
    logTime: { fontSize: 11, color: PALETTE.sub, marginTop: 2 },
    badgeLabel: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F1F5F9' },
    badgeLabelText: { fontSize: 10, fontWeight: '800', color: PALETTE.sub, textTransform: 'uppercase' },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalSheet: { backgroundColor: 'white', borderRadius: 32, padding: 25 },
    modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: PALETTE.text },
    mInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 14, color: PALETTE.text, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 15 },
    modalAction: { backgroundColor: PALETTE.blue, borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginTop: 10 },
    modalActionText: { color: 'white', fontSize: 16, fontWeight: '900' },
});
