import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert, Linking,
    Dimensions, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hospitalAPI } from '../../services/api';
import { COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const THEME = {
    primary: '#4F46E5',
    primaryLight: '#EEF2FF',
    accent: '#06B6D4',
    bg: '#F8FAFC',
    card: '#FFFFFF',
    text: '#1E293B',
    sub: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
};

const METRIC_CONFIG = {
    heart_rate: { icon: 'pulse', color: '#EF4444', label: 'Heart Rate', unit: 'BPM' },
    blood_pressure: { icon: 'water', color: '#3B82F6', label: 'Blood Pressure', unit: 'mmHg' },
    temperature: { icon: 'thermometer', color: '#F59E0B', label: 'Temp', unit: '°C' },
    respiratory_rate: { icon: 'speedometer', color: '#10B981', label: 'Resp. Rate', unit: 'BPM' },
    blood_glucose: { icon: 'flask', color: '#8B5CF6', label: 'Glucose', unit: 'mg/dL' },
    spo2: { icon: 'sunny', color: '#06B6D4', label: 'SpO2', unit: '%' },
    weight: { icon: 'scale', color: '#6366F1', label: 'Weight', unit: 'kg' },
};

export default function HospitalPatientDetailScreen({ route, navigation }) {
    const { patientId, patientName } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [records, setRecords] = useState({ health_metrics: [], documents: [] });
    const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' or 'history'

    useEffect(() => { loadData(); }, [patientId]);

    const loadData = async () => {
        if (!patientId) return;
        setLoading(true);
        try {
            const res = await hospitalAPI.getPatientRecords(patientId);
            setRecords(res.data || { health_metrics: [], documents: [] });
        } catch (error) {
            console.error('Error loading patient records:', error);
            Alert.alert('Error', 'Failed to load patient records');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Group metrics to show latest for each type
    const latestMetrics = useMemo(() => {
        const map = new Map();
        const sorted = [...records.health_metrics].sort((a, b) =>
            new Date(b.recorded_at) - new Date(a.recorded_at)
        );
        sorted.forEach(m => {
            if (!map.has(m.metric_type)) {
                map.set(m.metric_type, m);
            }
        });
        return Array.from(map.values());
    }, [records.health_metrics]);

    const formatValue = (type, val) => {
        const config = METRIC_CONFIG[type.toLowerCase().replace(/ /g, '_')];
        if (config) return `${val} ${config.unit}`;

        // Fallback formatting
        if (type.toLowerCase().includes('pressure')) return `${val} mmHg`;
        if (type.toLowerCase().includes('heart') || type.toLowerCase().includes('pulse')) return `${val} BPM`;
        if (type.toLowerCase().includes('temp')) return `${val} °C`;
        if (type.toLowerCase().includes('oxygen') || type.toLowerCase().includes('spo2')) return `${val}%`;
        return val;
    };

    const getMetricStyle = (type) => {
        return METRIC_CONFIG[type.toLowerCase().replace(/ /g, '_')] || {
            icon: 'analytics',
            color: THEME.primary,
            label: type.replace(/_/g, ' ')
        };
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={THEME.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#FFFFFF', '#F1F5F9']}
                style={styles.headerGradient}
            >
                <SafeAreaView edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backBtn}
                        >
                            <Ionicons name="chevron-back" size={28} color={THEME.text} />
                        </TouchableOpacity>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerTitle} numberOfLines={1}>
                                Clinical Case File
                            </Text>
                            <View style={styles.badge}>
                                <View style={styles.statusDot} />
                                <Text style={styles.badgeText}>Real-time Insights</Text>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />}
            >
                {/* ─── Patient Profile Card ─── */}
                <View style={styles.profileSection}>
                    <LinearGradient
                        colors={[THEME.text, '#0F172A']}
                        style={styles.profileCard}
                    >
                        <View style={styles.profileMain}>
                            <View style={styles.avatarContainer}>
                                <Text style={styles.avatarText}>
                                    {records.patient_info?.full_name?.[0] || patientName?.[0] || 'P'}
                                </Text>
                            </View>
                            <View style={styles.profileDetails}>
                                <Text style={styles.patientNameText} numberOfLines={1}>
                                    {records.patient_info?.full_name || patientName || 'Patient Record'}
                                </Text>
                                <Text style={styles.patientMRN}>MRN: {records.patient_info?.mrn || 'ORG-SECURE'}</Text>
                            </View>
                        </View>

                        <View style={styles.profileStats}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Gender</Text>
                                <Text style={styles.statValue}>{records.patient_info?.gender || 'N/A'}</Text>
                            </View>
                            <View style={[styles.statItem, styles.statBorder]}>
                                <Text style={styles.statLabel}>Age</Text>
                                <Text style={styles.statValue}>{records.patient_info?.age || 'N/A'} Yrs</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Status</Text>
                                <Text style={[styles.statValue, { color: THEME.success }]}>Active</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* ─── Metrics Dashboard ─── */}
                <View style={styles.summarySection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Biometric Indicators</Text>
                        <TouchableOpacity onPress={onRefresh}>
                            <Text style={styles.sectionAction}>Sync Data</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.vitalsGrid}>
                        {latestMetrics.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Ionicons name="pulse" size={40} color={THEME.border} />
                                <Text style={styles.emptyCardText}>No vitals recorded yet</Text>
                            </View>
                        ) : latestMetrics.map((m, i) => {
                            const config = getMetricStyle(m.metric_type);
                            return (
                                <TouchableOpacity key={m.id || i} style={styles.vitalCard}>
                                    <View style={[styles.metricIconContainer, { backgroundColor: config.color + '15' }]}>
                                        <Ionicons name={config.icon} size={20} color={config.color} />
                                    </View>
                                    <View style={styles.metricData}>
                                        <Text style={styles.metricValue}>{m.value}</Text>
                                        <Text style={styles.metricUnit}>{config.unit || ''}</Text>
                                    </View>
                                    <Text style={styles.metricLabel}>{config.label}</Text>
                                    <Text style={styles.metricTime}>
                                        {new Date(m.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ─── Tab Selection (to reduce scroll) ─── */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'vitals' && styles.activeTab]}
                        onPress={() => setActiveTab('vitals')}
                    >
                        <Ionicons name="list" size={18} color={activeTab === 'vitals' ? THEME.primary : THEME.sub} />
                        <Text style={[styles.tabText, activeTab === 'vitals' && styles.activeTabText]}>History</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'docs' && styles.activeTab]}
                        onPress={() => setActiveTab('docs')}
                    >
                        <Ionicons name="document-text" size={18} color={activeTab === 'docs' ? THEME.primary : THEME.sub} />
                        <Text style={[styles.tabText, activeTab === 'docs' && styles.activeTabText]}>Documents</Text>
                    </TouchableOpacity>
                </View>

                {/* ─── Historical Metrics List ─── */}
                {activeTab === 'vitals' && (
                    <View style={styles.listSection}>
                        {records.health_metrics.length === 0 ? (
                            <View style={styles.emptyList}>
                                <Text style={styles.emptyListText}>No historical data</Text>
                            </View>
                        ) : (
                            records.health_metrics.map((m, i) => {
                                const config = getMetricStyle(m.metric_type);
                                return (
                                    <View key={m.id || i} style={styles.historyItem}>
                                        <View style={[styles.historyIcon, { backgroundColor: config.color + '10' }]}>
                                            <Ionicons name={config.icon} size={16} color={config.color} />
                                        </View>
                                        <View style={styles.historyMain}>
                                            <Text style={styles.historyLabel}>{config.label}</Text>
                                            <Text style={styles.historyDate}>
                                                {new Date(m.recorded_at).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </Text>
                                        </View>
                                        <View style={styles.historyValueContainer}>
                                            <Text style={[styles.historyValue, { color: config.color }]}>
                                                {m.value}
                                            </Text>
                                            <Text style={styles.historyUnit}>{config.unit}</Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}

                {/* ─── Documents List ─── */}
                {activeTab === 'docs' && (
                    <View style={styles.listSection}>
                        {records.documents.length === 0 ? (
                            <View style={styles.emptyList}>
                                <Ionicons name="document-outline" size={48} color={THEME.border} />
                                <Text style={styles.emptyListText}>No medical documents found</Text>
                            </View>
                        ) : (
                            records.documents.map((doc, i) => (
                                <TouchableOpacity
                                    key={doc.id || i}
                                    style={styles.docItem}
                                    onPress={() => Alert.alert('Document Options', 'Preview is currently optimized for doctor panel.')}
                                >
                                    <View style={styles.docIconWrapper}>
                                        <LinearGradient
                                            colors={['#6366F1', '#4F46E5']}
                                            style={styles.docIconGradient}
                                        >
                                            <Ionicons name="document" size={20} color="white" />
                                        </LinearGradient>
                                    </View>
                                    <View style={styles.docInfo}>
                                        <Text style={styles.docName} numberOfLines={1}>{doc.file_name}</Text>
                                        <Text style={styles.docSub}>
                                            {doc.category || 'Clinical Record'} • {(doc.file_size / 1024).toFixed(1)} KB
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={THEME.sub} />
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerGradient: {
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: THEME.border,
        zIndex: 10
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 3 }
        })
    },
    headerInfo: {
        flex: 1,
        marginLeft: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: THEME.text,
        letterSpacing: -0.5,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: THEME.success,
        marginRight: 6,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: THEME.sub,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    actionBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingTop: 10,
        paddingBottom: 40,
    },
    profileSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    profileCard: {
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    profileMain: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: '900',
        color: 'white',
    },
    profileDetails: {
        marginLeft: 16,
        flex: 1,
    },
    patientNameText: {
        fontSize: 20,
        fontWeight: '900',
        color: 'white',
        letterSpacing: -0.5,
    },
    patientMRN: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '700',
        marginTop: 2,
    },
    profileStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statBorder: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        color: 'white',
        fontWeight: '900',
    },
    summarySection: {
        paddingHorizontal: 20,
        marginBottom: 25,
    },
    sectionAction: {
        fontSize: 13,
        fontWeight: '800',
        color: THEME.primary,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: THEME.text,
    },
    sectionCount: {
        fontSize: 12,
        fontWeight: '700',
        color: THEME.sub,
    },
    vitalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    vitalCard: {
        width: (width - 52) / 2,
        backgroundColor: THEME.card,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 2 }
        })
    },
    metricIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    metricData: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    metricValue: {
        fontSize: 22,
        fontWeight: '900',
        color: THEME.text,
    },
    metricUnit: {
        fontSize: 12,
        fontWeight: '700',
        color: THEME.sub,
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: THEME.sub,
        marginTop: 4,
    },
    metricTime: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 2,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        marginHorizontal: 20,
        padding: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    activeTab: {
        backgroundColor: 'white',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 2 }
        })
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
        color: THEME.sub,
    },
    activeTabText: {
        color: THEME.primary,
    },
    listSection: {
        paddingHorizontal: 20,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    historyIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyMain: {
        flex: 1,
    },
    historyLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: THEME.text,
    },
    historyDate: {
        fontSize: 11,
        color: THEME.sub,
        fontWeight: '600',
        marginTop: 1,
    },
    historyValueContainer: {
        alignItems: 'flex-end',
    },
    historyValue: {
        fontSize: 15,
        fontWeight: '900',
    },
    historyUnit: {
        fontSize: 10,
        color: THEME.sub,
        fontWeight: '700',
    },
    docItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 22,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    docIconWrapper: {
        marginRight: 15,
    },
    docIconGradient: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    docInfo: {
        flex: 1,
    },
    docName: {
        fontSize: 14,
        fontWeight: '800',
        color: THEME.text,
    },
    docSub: {
        fontSize: 11,
        color: THEME.sub,
        fontWeight: '600',
        marginTop: 2,
    },
    emptyCard: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: THEME.border,
    },
    emptyCardText: {
        marginTop: 10,
        fontSize: 13,
        color: THEME.sub,
        fontWeight: '600',
    },
    emptyList: {
        padding: 40,
        alignItems: 'center',
    },
    emptyListText: {
        fontSize: 14,
        color: THEME.sub,
        fontWeight: '600',
    }
});

