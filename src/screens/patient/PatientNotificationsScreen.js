import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { patientAPI, permissionsAPI, notificationAPI } from '../../services/api';
import ErrorHandler from '../../services/errorHandler';

export default function PatientNotificationsScreen({ navigation }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    /**
     * SMART NOTIFICATION FETCHING 
     * Consolidates real notifications (if backend ready) with synthetic notifications 
     * from other active modules (Permissions, Appointments).
     */
    const loadNotifications = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);

            // 1. Fetch real notifications from the restricted endpoint
            const response = await notificationAPI.getNotifications({ is_read: false, limit: 50 });
            const backendNotifs = response.data?.notifications || [];

            // 2. Fetch pending AI permissions (Synthetic Source 1)
            const pendingPermissionsRes = await permissionsAPI.getPendingRequests().catch(() => ({ data: [] }));
            const pendingPermissions = pendingPermissionsRes.data || [];

            // 3. Fetch recent appointments for status updates (Synthetic Source 2)
            const appointmentsRes = await patientAPI.getMyAppointments().catch(() => ({ data: [] }));
            const appointments = appointmentsRes.data || [];

            // --- Consolidation Logic ---
            let allNotifs = [];

            // A. Map Backend Notifications
            backendNotifs.forEach(n => {
                allNotifs.push({
                    id: n.id,
                    type: n.type || 'info',
                    title: n.title,
                    message: n.message || n.content,
                    timestamp: n.created_at,
                    read: n.is_read || false,
                    data: n.data || {}
                });
            });

            // B. Map Permission Requests (if not already in backend list)
            pendingPermissions.forEach(req => {
                const alreadyExists = backendNotifs.some(bn => bn.data?.request_id === req.id);
                if (!alreadyExists) {
                    allNotifs.push({
                        id: `permission_${req.id}`,
                        type: 'ai_access_request',
                        title: 'New Access Request 🛡️',
                        message: `Dr. ${req.doctor_name || 'Medical Specialist'} has requested access to your AI medical analysis.`,
                        timestamp: req.created_at || new Date().toISOString(),
                        read: false,
                        data: { ...req, doctor_id: req.doctor_id }
                    });
                }
            });

            // C. Map Recent Appointment Status Changes (Last 3 days)
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            appointments.forEach(apt => {
                const updatedAt = new Date(apt.updated_at || apt.created_at);
                if (updatedAt > threeDaysAgo && (apt.status === 'accepted' || apt.status === 'declined')) {
                    const alreadyExists = backendNotifs.some(bn => bn.data?.appointment_id === apt.id);
                    if (!alreadyExists) {
                        allNotifs.push({
                            id: `apt_update_${apt.id}_${apt.status}`,
                            type: apt.status === 'accepted' ? 'appointment_approved' : 'appointment_declined',
                            title: apt.status === 'accepted' ? 'Appointment Confirmed! ✅' : 'Appointment Declined ❌',
                            message: apt.status === 'accepted'
                                ? `Your visit with Dr. ${apt.doctor_name || 'Doctor'} has been scheduled.`
                                : `Unfortunately, Dr. ${apt.doctor_name || 'Doctor'} cannot make it. Please re-schedule.`,
                            timestamp: apt.updated_at,
                            read: false,
                            data: apt
                        });
                    }
                }
            });

            // Final Sort: Newest First
            allNotifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setNotifications(allNotifs);
        } catch (error) {
            console.error('Notification Loading Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const handleMarkAsRead = async (id) => {
        try {
            // Only call backend if it's a real backend notification ID
            if (typeof id === 'string' && !id.includes('_')) {
                await notificationAPI.markAsRead(id);
            }
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) { }
    };

    const handleClearAll = async () => {
        try {
            await notificationAPI.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            Alert.alert("Notifications Cleared", "We've marked all notifications as read.");
        } catch (error) { }
    };

    const handleGrantAccess = async (notif) => {
        try {
            await permissionsAPI.grantDoctorAccess({
                doctor_id: notif.data.doctor_id,
                ai_access_permission: true,
                access_level: 'read_analyze',
                expiry_days: 90
            });
            Alert.alert("Permission Granted", "The doctor can now view your AI-enhanced medical report.");
            loadNotifications();
        } catch (error) {
            ErrorHandler.handleError(error);
        }
    };

    const handleDenyAccess = async (notif) => {
        try {
            await permissionsAPI.revokeDoctorAccess(notif.data.doctor_id, null);
            Alert.alert("Permission Denied", "We've notified the doctor of your preference.");
            loadNotifications();
        } catch (error) { }
    };

    const getNotificationStyle = (type) => {
        switch (type) {
            case 'appointment_approved': return { icon: 'checkmark-circle', color: '#4CAF50' };
            case 'ai_access_request': return { icon: 'shield-checkmark', color: '#9C27B0' };
            case 'appointment_declined': return { icon: 'close-circle', color: '#F44336' };
            default: return { icon: 'information-circle', color: COLORS.primary };
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
        loadNotifications(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {notifications.some(n => !n.read) ? (
                    <TouchableOpacity onPress={handleClearAll}>
                        <Text style={styles.clearAll}>Clear All</Text>
                    </TouchableOpacity>
                ) : <View style={{ width: 60 }} />}
            </View>

            <ScrollView
                style={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color={COLORS.primary} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
                ) : notifications.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="notifications-off-outline" size={60} color="#DDD" />
                        <Text style={styles.emptyText}>All Caught Up!</Text>
                        <Text style={styles.emptySub}>We will notify you here when things happen.</Text>
                    </View>
                ) : (
                    notifications.map(notif => {
                        const style = getNotificationStyle(notif.type);
                        return (
                            <View key={notif.id} style={[styles.card, !notif.read && styles.unread]}>
                                <TouchableOpacity
                                    style={styles.cardMain}
                                    onPress={() => handleMarkAsRead(notif.id)}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: style.color + '15' }]}>
                                        <Ionicons name={style.icon} size={22} color={style.color} />
                                    </View>
                                    <View style={styles.content}>
                                        <Text style={styles.title}>{notif.title}</Text>
                                        <Text style={styles.message}>{notif.message}</Text>
                                        <Text style={styles.time}>{formatTime(notif.timestamp)}</Text>
                                    </View>
                                </TouchableOpacity>

                                {notif.type === 'ai_access_request' && !notif.read && (
                                    <View style={styles.actions}>
                                        <TouchableOpacity style={[styles.btn, styles.btnDeny]} onPress={() => handleDenyAccess(notif)}>
                                            <Text style={styles.btnTextDeny}>Deny</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.btn, styles.btnApprove]} onPress={() => handleGrantAccess(notif)}>
                                            <Text style={styles.btnTextApprove}>Approve</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    clearAll: { color: COLORS.primary, fontWeight: 'bold' },
    scroll: { flex: 1, padding: 15 },
    card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 0 },
    unread: { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
    cardMain: { flexDirection: 'row' },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    content: { flex: 1 },
    title: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    message: { fontSize: 14, color: '#666', marginTop: 4, lineHeight: 20 },
    time: { fontSize: 11, color: '#999', marginTop: 8 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    btnDeny: { backgroundColor: '#FDECEA' },
    btnApprove: { backgroundColor: COLORS.primary },
    btnTextDeny: { color: '#D32F2F', fontWeight: 'bold' },
    btnTextApprove: { color: 'white', fontWeight: 'bold' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 20, fontWeight: 'bold', color: '#444', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#888', marginTop: 10, textAlign: 'center' }
});
