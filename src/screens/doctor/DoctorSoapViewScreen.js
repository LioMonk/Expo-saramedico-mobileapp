import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, Dimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { consultationAPI } from '../../services/api';

const { width } = Dimensions.get('window');

export default function DoctorSoapViewScreen({ navigation, route }) {
    const { consultationId, consultation: initialConsultation } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [polling, setPolling] = useState(false);
    const [consultation, setConsultation] = useState(initialConsultation || null);
    const [soapNote, setSoapNote] = useState(null);
    const [error, setError] = useState(null);

    const fetchSoapData = useCallback(async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            const response = await consultationAPI.getSoapNote(consultationId);

            const httpStatus = response.status;
            const data = response.data || {};

            if (data.status === 'completed' || data.soap_note) {
                setSoapNote(data.soap_note || data);
                setPolling(false);
            } else if (data.status === 'processing' || httpStatus === 202) {
                setPolling(true);
            } else {
                setError('Failed to retrieve SOAP note');
            }
        } catch (err) {
            console.error('Fetch SOAP error:', err);
            setError('Failed to connect to AI service');
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [consultationId]);

    useEffect(() => {
        fetchSoapData();
    }, [fetchSoapData]);

    // Polling logic
    useEffect(() => {
        let pollInterval;
        if (polling) {
            pollInterval = setInterval(() => {
                fetchSoapData(true);
            }, 3000); // 3 seconds
        }
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [polling, fetchSoapData]);

    const onRefresh = () => {
        fetchSoapData();
    };

    const renderSoapSection = (title, content, icon, color) => (
        <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
                <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
            </View>
            <View style={styles.sectionContent}>
                {content ? (
                    <Text style={styles.contentText}>{content}</Text>
                ) : (
                    <Text style={[styles.contentText, { color: '#999', fontStyle: 'italic' }]}>
                        Information not available in this encounter.
                    </Text>
                )}
            </View>
        </View>
    );

    if (loading && !polling) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loaderText}>Retrieving AI analysis...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#111827" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>AI SOAP Note</Text>
                    <Text style={styles.headerSub}>
                        {consultation?.patient_name || consultation?.patient?.full_name || 'Patient'} • {new Date(consultation?.date || Date.now()).toLocaleDateString()}
                    </Text>
                </View>
                <View style={{ width: 32 }} />
            </View>

            {polling && (
                <View style={styles.pollingBanner}>
                    <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.pollingText}>AI is still generating your report...</Text>
                </View>
            )}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
            >
                {error ? (
                    <View style={styles.errorCard}>
                        <Ionicons name="alert-circle" size={48} color="#EF4444" />
                        <Text style={styles.errorTitle}>Analysis Unavailable</Text>
                        <Text style={styles.errorSub}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
                            <Text style={styles.retryBtnText}>Retry Analysis</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabel}>CHIEF COMPLAINT</Text>
                            <Text style={styles.summaryValue}>
                                {consultation?.chiefComplaint || consultation?.reason || 'General health consultation and routine checkup.'}
                            </Text>
                        </View>

                        {renderSoapSection('Subjective', soapNote?.subjective, 'person-outline', '#3B82F6')}
                        {renderSoapSection('Objective', soapNote?.objective, 'eye-outline', '#10B981')}
                        {renderSoapSection('Assessment', soapNote?.assessment, 'clipboard-outline', '#F59E0B')}
                        {renderSoapSection('Plan', soapNote?.plan, 'list-outline', '#8B5CF6')}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    backBtn: { padding: 4 },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    headerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    headerAction: { padding: 4 },

    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
    loaderText: { marginTop: 15, fontSize: 14, color: '#6B7280', fontWeight: '500' },

    pollingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 6,
    },
    pollingText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

    scrollContent: { padding: 16, paddingBottom: 40 },

    summaryBox: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    summaryLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 6 },
    summaryValue: { fontSize: 15, color: '#111827', lineHeight: 22, fontWeight: '500' },

    sectionCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    sectionContent: { paddingLeft: 0 },
    contentText: { fontSize: 15, color: '#374151', lineHeight: 24 },

    disclaimerBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: '#F3F4F6', marginBottom: 25 },
    disclaimerText: { flex: 1, fontSize: 12, color: '#6B7280', marginLeft: 10, lineHeight: 18 },

    signBtn: { backgroundColor: '#111827', paddingVertical: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    signBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    errorCard: { alignItems: 'center', padding: 40, backgroundColor: '#FFF', borderRadius: 24, marginTop: 40 },
    errorTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 15 },
    errorSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 25 },
    retryBtnText: { color: '#FFF', fontWeight: '700' }
});
