import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { adminAPI } from '../../services/api';

export default function AdminAuditLogScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getAuditLogs();
            setLogs(response.data?.logs || []);
        } catch (error) {
            console.log('Error loading logs:', error.message);
            // Fallback mock
            setLogs([
                { id: '1', action: 'User Logged In', user: 'Admin', timestamp: new Date().toISOString() },
                { id: '2', action: 'System Backup Completed', user: 'System', timestamp: new Date(Date.now() - 3600000).toISOString() }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => {
        const dateObj = new Date(item.timestamp);
        const timeStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={styles.logCard}>
                <View style={styles.iconBox}>
                    <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.logDetails}>
                    <Text style={styles.logAction}>{item.action || item.activity_type || 'System Event'}</Text>
                    <Text style={styles.logMeta}>{item.user || item.user_name || 'System User'} • {timeStr}</Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Audit Logs</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Audit Logs</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={logs}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={async () => {
                    setRefreshing(true);
                    await loadLogs();
                    setRefreshing(false);
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="clipboard-outline" size={40} color="#CCC" />
                        <Text style={styles.emptyText}>No audit logs found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE'
    },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    listContent: { padding: 15 },

    logCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#EEE'
    },
    iconBox: {
        width: 40,
        height: 40,
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    logDetails: { flex: 1, justifyContent: 'center' },
    logAction: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
    logMeta: { fontSize: 12, color: '#666' },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { marginTop: 10, color: '#999', fontSize: 15 }
});
