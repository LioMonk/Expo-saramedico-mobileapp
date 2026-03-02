import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auditAPI } from '../../services/api';

export default function AuditLogScreen({ navigation }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    const fetchAuditLogs = async () => {
        try {
            const response = await auditAPI.getAuditLogs({
                limit: 50,
                offset: 0,
            });

            // Handle different response structures
            const logsData = response.data?.logs || response.data || [];
            setLogs(Array.isArray(logsData) ? logsData : []);
        } catch (error) {
            console.error('Error fetching audit logs:', error.message || error);
            // Use demo data if API not available
            setLogs([
                {
                    id: 1,
                    action: 'Login',
                    description: 'User logged in successfully',
                    timestamp: new Date().toISOString(),
                    ip_address: '192.168.1.1',
                    device: 'Mobile App',
                },
                {
                    id: 2,
                    action: 'Profile Update',
                    description: 'Updated profile information',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    ip_address: '192.168.1.1',
                    device: 'Mobile App',
                },
                {
                    id: 3,
                    action: 'Document Access',
                    description: 'Viewed patient medical record',
                    timestamp: new Date(Date.now() - 7200000).toISOString(),
                    ip_address: '192.168.1.1',
                    device: 'Mobile App',
                },
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchAuditLogs();
    };

    const handleExport = async () => {
        try {
            // TODO: Implement export functionality
            // const response = await auditAPI.exportAuditLogs({ format: 'csv' });
            alert('Export functionality coming soon');
        } catch (error) {
            console.error('Error exporting logs:', error);
            alert('Failed to export audit logs');
        }
    };

    const getActionIcon = (action) => {
        switch (action?.toLowerCase()) {
            case 'login':
                return { name: 'log-in', color: '#10B981' };
            case 'logout':
                return { name: 'log-out', color: '#6B7280' };
            case 'profile update':
                return { name: 'person', color: '#3B82F6' };
            case 'document access':
                return { name: 'document-text', color: '#F59E0B' };
            case 'settings change':
                return { name: 'settings', color: '#8B5CF6' };
            default:
                return { name: 'information-circle', color: '#6B7280' };
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const LogItem = ({ log }) => {
        const iconData = getActionIcon(log.action);

        return (
            <View style={styles.logCard}>
                <View style={styles.logHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: iconData.color + '20' }]}>
                        <Ionicons name={iconData.name} size={20} color={iconData.color} />
                    </View>
                    <View style={styles.logContent}>
                        <Text style={styles.logAction}>{log.action || 'Unknown Action'}</Text>
                        <Text style={styles.logDescription}>{log.description || `Accessed resource: ${log.resource_type || 'Unknown'}`}</Text>
                        <View style={styles.logMeta}>
                            <View style={styles.metaItem}>
                                <Ionicons name="time" size={14} color="#9CA3AF" />
                                <Text style={styles.metaText}>{formatTimestamp(log.timestamp)}</Text>
                            </View>
                            {log.ip_address && (
                                <View style={styles.metaItem}>
                                    <Ionicons name="globe" size={14} color="#9CA3AF" />
                                    <Text style={styles.metaText}>{log.ip_address}</Text>
                                </View>
                            )}
                            {log.device && (
                                <View style={styles.metaItem}>
                                    <Ionicons name="phone-portrait" size={14} color="#9CA3AF" />
                                    <Text style={styles.metaText}>{log.device}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Audit Logs</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
                        <Ionicons name="download-outline" size={20} color="#0066CC" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.refreshButton} onPress={fetchAuditLogs}>
                        <Ionicons name="refresh" size={20} color="#0066CC" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
                <Text style={styles.infoText}>
                    HIPAA Compliant • Your activity is logged for security and compliance
                </Text>
            </View>

            {/* Stats Summary */}
            {!loading && logs.length > 0 && (
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{logs.length}</Text>
                        <Text style={styles.statLabel}>Total Logs</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                            {logs.filter(l => new Date(l.timestamp) > new Date(Date.now() - 86400000)).length}
                        </Text>
                        <Text style={styles.statLabel}>Last 24h</Text>
                    </View>
                </View>
            )}

            {/* Logs List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Loading audit logs...</Text>
                    </View>
                ) : logs.length > 0 ? (
                    logs.map((log, index) => <LogItem key={log.id || index} log={log} />)
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text" size={64} color="#CCC" />
                        <Text style={styles.emptyText}>No audit logs found</Text>
                        <Text style={styles.emptySubtext}>Your activity will appear here</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    exportButton: {
        padding: 4,
    },
    refreshButton: {
        padding: 4,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        padding: 12,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 8,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#1E40AF',
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 16,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    logCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    logHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    logContent: {
        flex: 1,
    },
    logAction: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    logDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    logMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#9CA3AF',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#D1D5DB',
        marginTop: 4,
    },
});
