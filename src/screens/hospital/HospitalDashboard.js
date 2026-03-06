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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { hospitalAPI, calendarAPI, authAPI } from '../../services/api';

const PALETTE = {
    blue: '#3B82F6', bluLight: '#EFF6FF',
    green: '#10B981', greenLight: '#F0FDF4',
    amber: '#F59E0B', amberLight: '#FFFBEB',
    purple: '#8B5CF6', purpleLight: '#EDE9FE',
    bg: '#F8FAFC', card: '#FFFFFF',
    text: '#0F172A', sub: '#64748B', border: '#E2E8F0',
};

export default function HospitalDashboard({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orgName, setOrgName] = useState('Hospital');
    const [orgId, setOrgId] = useState(null);
    const [stats, setStats] = useState({ doctors: 0, patients: 0, staff: 0, consultations: 0 });
    const [recentActivity, setRecentActivity] = useState([]);
    const [todayEvents, setTodayEvents] = useState([]);

    // Create Event Modal
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

            // 1. Profile
            try {
                const profileRes = await authAPI.getCurrentUser();
                const user = profileRes.data;
                setOrgName(user?.organization_id ? 'Hospital' : 'Hospital');
                setOrgId(user?.organization_id);
            } catch (e) { /* silent */ }

            // 2. Org info
            try {
                const orgRes = await hospitalAPI.getOrganization();
                if (orgRes.data?.name) setOrgName(orgRes.data.name);
                if (orgRes.data?.id) setOrgId(orgRes.data.id);
            } catch (e) { /* silent */ }

            // 3. Members count
            try {
                const membersRes = await hospitalAPI.getOrgMembers();
                const members = membersRes.data || [];
                const doctors = members.filter(m => m.role === 'doctor').length;
                const patients = members.filter(m => m.role === 'patient').length;
                const staff = members.length;
                setStats(prev => ({ ...prev, doctors, patients, staff }));
            } catch (e) { /* silent */ }

            // 4. Consultations for recent activity
            try {
                const consRes = await hospitalAPI.getConsultations({ limit: 10 });
                const consultations = consRes.data?.consultations || [];
                setStats(prev => ({ ...prev, consultations: consRes.data?.total || consultations.length }));
                setRecentActivity(consultations.slice(0, 5).map(c => ({
                    id: c.id,
                    type: 'consultation',
                    text: `Consultation: ${c.patientName || 'Patient'} with ${c.doctorName || 'Doctor'}`,
                    time: c.scheduledAt ? new Date(c.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
                    status: c.status,
                })));
            } catch (e) { /* silent */ }

            // 5. Today's events
            try {
                const today = new Date().toISOString().split('T')[0];
                const evRes = await calendarAPI.getDayAgenda(today);
                setTodayEvents((evRes.data?.events || []).slice(0, 4));
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
            Alert.alert('Missing Fields', 'Title, start time, and end time are required.');
            return;
        }
        setCreatingEvent(true);
        try {
            await calendarAPI.createEvent({
                title: eventTitle.trim(),
                description: eventDesc.trim(),
                start_time: new Date(eventStart).toISOString(),
                end_time: new Date(eventEnd).toISOString(),
                all_day: false,
                color: '#10B981',
                reminder_minutes: 30,
            });
            Alert.alert('✅ Event Created', `"${eventTitle}" has been added to the calendar.`);
            setShowCreateEvent(false);
            setEventTitle(''); setEventDesc(''); setEventStart(''); setEventEnd('');
            loadDashboard();
        } catch (e) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to create event.');
        } finally {
            setCreatingEvent(false);
        }
    };

    const today = new Date();
    const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PALETTE.blue} />
                    <Text style={styles.loadingText}>Loading dashboard…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PALETTE.blue]} />}
            >
                {/* ─── Header ─── */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{greeting}</Text>
                        <Text style={styles.orgName}>{orgName}</Text>
                        <Text style={styles.date}>{dateStr}</Text>
                    </View>
                    <TouchableOpacity style={styles.notifBtn} onPress={() => { }}>
                        <Ionicons name="notifications-outline" size={22} color={PALETTE.text} />
                    </TouchableOpacity>
                </View>

                {/* ─── Stats Grid ─── */}
                <View style={styles.statsGrid}>
                    {[
                        { label: 'Doctors', value: stats.doctors, icon: 'medical', color: PALETTE.blue, bg: PALETTE.bluLight, nav: 'HospitalDirectoryScreen' },
                        { label: 'Patients', value: stats.patients, icon: 'people', color: PALETTE.green, bg: PALETTE.greenLight, nav: 'HospitalPatientsScreen' },
                        { label: 'Staff', value: stats.staff, icon: 'person', color: PALETTE.purple, bg: PALETTE.purpleLight, nav: 'HospitalStaffScreen' },
                        { label: 'Consultations', value: stats.consultations, icon: 'calendar', color: PALETTE.amber, bg: PALETTE.amberLight, nav: 'HospitalAppointmentsScreen' },
                    ].map(stat => (
                        <TouchableOpacity
                            key={stat.label}
                            style={styles.statCard}
                            onPress={() => navigation.navigate(stat.nav)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
                                <Ionicons name={stat.icon} size={20} color={stat.color} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ─── Quick Actions ─── */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsRow}>
                    {[
                        { label: 'Invite\nDoctor', icon: 'person-add', color: PALETTE.blue, bg: PALETTE.bluLight, nav: 'HospitalInviteTeamScreen' },
                        { label: 'Directory', icon: 'grid', color: PALETTE.purple, bg: PALETTE.purpleLight, nav: 'HospitalDirectoryScreen' },
                        { label: 'Patients', icon: 'people', color: PALETTE.green, bg: PALETTE.greenLight, nav: 'HospitalPatientsScreen' },
                        { label: 'Staff', icon: 'briefcase', color: PALETTE.amber, bg: PALETTE.amberLight, nav: 'HospitalStaffScreen' },
                        { label: 'Calendar', icon: 'calendar', color: PALETTE.blue, bg: PALETTE.bluLight, nav: 'HospitalAppointmentsScreen' },
                        { label: 'Create\nEvent', icon: 'add-circle', color: PALETTE.green, bg: PALETTE.greenLight, onPress: () => setShowCreateEvent(true) },
                        { label: 'Settings', icon: 'settings', color: PALETTE.sub, bg: PALETTE.border, nav: 'HospitalSettingsScreen' },
                    ].map(a => (
                        <TouchableOpacity
                            key={a.label}
                            style={styles.actionCard}
                            onPress={a.onPress || (() => navigation.navigate(a.nav))}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                                <Ionicons name={a.icon} size={22} color={a.color} />
                            </View>
                            <Text style={styles.actionLabel}>{a.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ─── Today's Events ─── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Today's Events</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('HospitalAppointmentsScreen')}>
                        <Text style={styles.viewAll}>View All</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.card}>
                    {todayEvents.length === 0 ? (
                        <View style={styles.emptyRow}>
                            <Ionicons name="calendar-outline" size={32} color="#CBD5E1" />
                            <Text style={styles.emptyText}>No events scheduled today</Text>
                        </View>
                    ) : todayEvents.map((ev, i) => (
                        <View key={ev.id || i} style={[styles.eventRow, i < todayEvents.length - 1 && styles.divider]}>
                            <View style={[styles.eventDot, { backgroundColor: ev.color || PALETTE.blue }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.eventTitle}>{ev.title}</Text>
                                <Text style={styles.eventTime}>
                                    {ev.start_time ? new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    {ev.end_time ? ` – ${new Date(ev.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* ─── Recent Activity ─── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                </View>
                <View style={styles.card}>
                    {recentActivity.length === 0 ? (
                        <View style={styles.emptyRow}>
                            <Ionicons name="time-outline" size={32} color="#CBD5E1" />
                            <Text style={styles.emptyText}>No recent activity</Text>
                        </View>
                    ) : recentActivity.map((item, i) => (
                        <View key={item.id || i} style={[styles.activityRow, i < recentActivity.length - 1 && styles.divider]}>
                            <View style={[styles.activityDot, { backgroundColor: item.status === 'completed' ? PALETTE.green : PALETTE.blue }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.activityText}>{item.text}</Text>
                                <Text style={styles.activityTime}>{item.time}</Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: item.status === 'completed' ? PALETTE.greenLight : PALETTE.bluLight }]}>
                                <Text style={[styles.badgeText, { color: item.status === 'completed' ? PALETTE.green : PALETTE.blue }]}>
                                    {item.status || 'scheduled'}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ─── Create Event Modal ─── */}
            <Modal visible={showCreateEvent} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Event</Text>
                            <TouchableOpacity onPress={() => setShowCreateEvent(false)}>
                                <Ionicons name="close" size={22} color={PALETTE.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.fieldLabel}>Title *</Text>
                        <TextInput style={styles.fieldInput} placeholder="e.g. Weekly Staff Meeting" value={eventTitle} onChangeText={setEventTitle} placeholderTextColor="#94A3B8" />
                        <Text style={styles.fieldLabel}>Description</Text>
                        <TextInput style={styles.fieldInput} placeholder="Optional notes" value={eventDesc} onChangeText={setEventDesc} placeholderTextColor="#94A3B8" />
                        <Text style={styles.fieldLabel}>Start Time * (e.g. 2026-03-10 14:00)</Text>
                        <TextInput style={styles.fieldInput} placeholder="YYYY-MM-DD HH:MM" value={eventStart} onChangeText={setEventStart} placeholderTextColor="#94A3B8" />
                        <Text style={styles.fieldLabel}>End Time * (e.g. 2026-03-10 15:30)</Text>
                        <TextInput style={styles.fieldInput} placeholder="YYYY-MM-DD HH:MM" value={eventEnd} onChangeText={setEventEnd} placeholderTextColor="#94A3B8" />
                        <TouchableOpacity style={[styles.createBtn, creatingEvent && { opacity: 0.6 }]} onPress={handleCreateEvent} disabled={creatingEvent}>
                            {creatingEvent ? <ActivityIndicator color="white" /> : <Text style={styles.createBtnText}>Create Event</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PALETTE.bg },
    scroll: { padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: PALETTE.sub },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    greeting: { fontSize: 13, color: PALETTE.sub, fontWeight: '500' },
    orgName: { fontSize: 22, fontWeight: '800', color: PALETTE.text, marginTop: 2 },
    date: { fontSize: 12, color: PALETTE.sub, marginTop: 2 },
    notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: PALETTE.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: PALETTE.border },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
    statCard: { width: '47%', backgroundColor: PALETTE.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: PALETTE.border, alignItems: 'flex-start' },
    statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statValue: { fontSize: 28, fontWeight: '800', color: PALETTE.text },
    statLabel: { fontSize: 12, color: PALETTE.sub, fontWeight: '600', marginTop: 2 },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: PALETTE.text, marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
    viewAll: { fontSize: 13, color: PALETTE.blue, fontWeight: '700' },

    actionsRow: { marginBottom: 28 },
    actionCard: { backgroundColor: PALETTE.card, borderRadius: 16, padding: 14, marginRight: 10, alignItems: 'center', width: 90, borderWidth: 1, borderColor: PALETTE.border },
    actionIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    actionLabel: { fontSize: 11, color: PALETTE.text, textAlign: 'center', fontWeight: '600' },

    card: { backgroundColor: PALETTE.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: PALETTE.border, marginBottom: 20 },
    divider: { borderBottomWidth: 1, borderBottomColor: PALETTE.border, paddingBottom: 12, marginBottom: 12 },

    emptyRow: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyText: { color: PALETTE.sub, fontSize: 13 },

    eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    eventDot: { width: 10, height: 10, borderRadius: 5 },
    eventTitle: { fontSize: 14, fontWeight: '700', color: PALETTE.text },
    eventTime: { fontSize: 12, color: PALETTE.sub, marginTop: 2 },

    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    activityDot: { width: 8, height: 8, borderRadius: 4 },
    activityText: { fontSize: 13, fontWeight: '600', color: PALETTE.text, flex: 1 },
    activityTime: { fontSize: 11, color: PALETTE.sub, marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    badgeText: { fontSize: 10, fontWeight: '800' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: PALETTE.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: PALETTE.text },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: PALETTE.text, marginBottom: 6, marginTop: 12 },
    fieldInput: { backgroundColor: PALETTE.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: PALETTE.text, borderWidth: 1, borderColor: PALETTE.border },
    createBtn: { backgroundColor: PALETTE.blue, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    createBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
