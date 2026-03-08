import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { notificationAPI } from '../../services/api';

const PALETTE = {
    blue: '#3B82F6', bluLight: '#EFF6FF',
    green: '#10B981', greenLight: '#F0FDF4',
    amber: '#F59E0B', amberLight: '#FFFBEB',
    purple: '#8B5CF6', purpleLight: '#EDE9FE',
    bg: '#F8FAFC', card: '#FFFFFF',
    text: '#0F172A', sub: '#64748B', border: '#E2E8F0',
};

export default function HospitalNotificationsScreen({ navigation }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            const response = await notificationAPI.getNotifications({ limit: 50 });
            const data = Array.isArray(response.data) ? response.data : (response.data?.notifications || []);
            setNotifications(data);
        } catch (error) {
            console.error('Failed to load hospital notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await notificationAPI.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Mark as read failed:', error);
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
        loadNotifications(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={PALETTE.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hospital Alerts</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator color={PALETTE.blue} size="large" />
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color={PALETTE.blue} />}
                >
                    {notifications.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyText}>No alerts at the moment</Text>
                            <Text style={styles.emptySub}>We'll notify you here for critical hospital activities.</Text>
                        </View>
                    ) : (
                        notifications.map((notif, index) => (
                            <TouchableOpacity
                                key={notif.id || index}
                                style={[styles.card, !notif.is_read && styles.unreadCard]}
                                onPress={() => !notif.is_read && handleMarkAsRead(notif.id)}
                            >
                                <View style={[styles.iconBox, { backgroundColor: notif.is_read ? PALETTE.bluLight : PALETTE.blue + '10' }]}>
                                    <Ionicons name="notifications" size={20} color={notif.is_read ? PALETTE.sub : PALETTE.blue} />
                                </View>
                                <View style={styles.content}>
                                    <View style={styles.row}>
                                        <Text style={styles.title}>{notif.title}</Text>
                                        <Text style={styles.time}>{formatTime(notif.created_at)}</Text>
                                    </View>
                                    <Text style={styles.message}>{notif.message}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PALETTE.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: PALETTE.border },
    headerTitle: { fontSize: 18, fontWeight: '800', color: PALETTE.text },
    scroll: { flex: 1, padding: 15 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: PALETTE.border },
    unreadCard: { borderColor: PALETTE.blue, borderLeftWidth: 4 },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    content: { flex: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { fontSize: 15, fontWeight: '700', color: PALETTE.text, flex: 1, marginRight: 8 },
    time: { fontSize: 11, color: PALETTE.sub },
    message: { fontSize: 13, color: PALETTE.sub, marginTop: 4, lineHeight: 18 },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 18, fontWeight: '800', color: PALETTE.text, marginTop: 20 },
    emptySub: { fontSize: 14, color: PALETTE.sub, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }
});
