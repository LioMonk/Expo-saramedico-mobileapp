import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { consultationAPI, patientAPI } from '../../services/api';
import ErrorHandler from '../../services/errorHandler';
import moment from 'moment';

const SOAP_SECTIONS = [
    {
        key: 'subjective',
        icon: 'chatbubble-ellipses-outline',
        label: 'What You Told Us',
        description: 'Your symptoms and concerns as you described them',
        color: '#3B82F6',
        bg: '#EFF6FF',
        border: '#BFDBFE',
    },
    {
        key: 'objective',
        icon: 'flask-outline',
        label: 'What We Observed',
        description: 'Clinical findings, vitals, and examination results',
        color: '#8B5CF6',
        bg: '#F5F3FF',
        border: '#DDD6FE',
    },
    {
        key: 'assessment',
        icon: 'clipboard-outline',
        label: 'Diagnosis & Findings',
        description: 'Our medical assessment based on your visit',
        color: '#10B981',
        bg: '#ECFDF5',
        border: '#A7F3D0',
    },
    {
        key: 'plan',
        icon: 'medical-outline',
        label: 'Your Treatment Plan',
        description: 'Recommended next steps and medications',
        color: '#D97706',
        bg: '#FFFBEB',
        border: '#FDE68A',
    },
];

const renderContent = (data) => {
    if (!data) return '';
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return data.map(item => `• ${renderContent(item)}`).join('\n');
    if (typeof data === 'object') {
        return Object.entries(data)
            .map(([k, v]) => {
                const key = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const val = typeof v === 'object' ? `\n${renderContent(v)}` : ` ${v}`;
                return `${key}:${val}`;
            })
            .join('\n');
    }
    return String(data);
};

export default function ConsultationDetailScreen({ route, navigation }) {
    const { consultationId } = route.params;
    const [consultation, setConsultation] = useState(null);
    const [soapNote, setSoapNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingSoap, setLoadingSoap] = useState(false);

    useEffect(() => {
        loadDetails();
    }, [consultationId]);

    const loadDetails = async () => {
        try {
            setLoading(true);
            const response = await consultationAPI.getConsultation(consultationId);
            const data = response.data;

            // Resolve doctor name if unknown or restricted
            const dName = data.doctorName || '';
            if (!dName || dName === "Unknown Doctor" || dName.toLowerCase() === 'encrypted') {
                try {
                    const doctorsRes = await patientAPI.getDoctors();
                    const doctorsList = doctorsRes.data?.results || doctorsRes.data || [];
                    const doc = doctorsList.find(d => d.id === data.doctorId || d.id === data.doctor_id);
                    if (doc) {
                        const resolvedName = doc.name || doc.full_name;
                        if (resolvedName && resolvedName.toLowerCase() !== 'encrypted' && resolvedName.toLowerCase() !== 'unknown doctor') {
                            data.doctorName = resolvedName;
                        }
                    }
                } catch (e) {
                    console.error('Failed to resolve doctor name:', e);
                }
            }

            setConsultation(data);

            if (data.hasSoapNote) {
                fetchSoapNote();
            }
        } catch (error) {
            console.error('Error loading consultation details:', error);
            ErrorHandler.handleError(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSoapNote = async () => {
        try {
            setLoadingSoap(true);
            const response = await consultationAPI.getSoapNote(consultationId);
            // The API returns { ..., soap_note: { subjective, objective, assessment, plan } }
            setSoapNote(response.data?.soap_note || response.data);
        } catch (error) {
            console.error('Error fetching SOAP note:', error);
        } finally {
            setLoadingSoap(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!consultation) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <Text>Consultation not found.</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={{ color: COLORS.primary }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Visit Summary</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Basic Info Card */}
                <View style={styles.card}>
                    <View style={styles.doctorHeader}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={30} color="white" />
                        </View>
                        <View style={styles.doctorInfo}>
                            <Text style={styles.doctorName}>
                                {(() => {
                                    let name = (consultation.doctorName &&
                                        consultation.doctorName.toLowerCase() !== 'unknown doctor' &&
                                        consultation.doctorName.toLowerCase() !== 'encrypted')
                                        ? consultation.doctorName
                                        : 'Doctor';
                                    return name.startsWith('Dr. ') ? name : `Dr. ${name}`;
                                })()}
                            </Text>
                            <Text style={styles.date}>{moment(consultation.scheduledAt).format('MMMM Do, YYYY')}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: '#E8F5E9' }]}>
                            <Text style={[styles.statusText, { color: '#2E7D32' }]}>{consultation.status?.toUpperCase()}</Text>
                        </View>
                    </View>
                </View>

                {/* AI SOAP Analysis Section */}
                {(consultation.diagnosis || consultation.prescription) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Medical Summary</Text>
                        <View style={styles.infoCard}>
                            {consultation.diagnosis && (
                                <View style={styles.subSection}>
                                    <Text style={styles.subTitle}>DIAGNOSIS</Text>
                                    <Text style={styles.subText}>{consultation.diagnosis}</Text>
                                </View>
                            )}
                            {consultation.prescription && (
                                <View style={styles.subSection}>
                                    <Text style={styles.subTitle}>PRESCRIPTION</Text>
                                    <Text style={styles.subText}>{consultation.prescription}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* AI SOAP Note Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Visit Analysis</Text>
                        {loadingSoap && <ActivityIndicator size="small" color={COLORS.primary} />}
                    </View>

                    {soapNote ? (
                        <View style={styles.soapContainer}>
                            {/* 1. Quick Summary */}
                            {(soapNote.patient_summary || soapNote.summary) && (
                                <View style={[styles.soapCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderLeftColor: '#16A34A', borderLeftWidth: 5, marginBottom: 12 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                        <Ionicons name="sparkles" size={18} color="#16A34A" style={{ marginRight: 6 }} />
                                        <Text style={[styles.soapLabel, { color: '#16A34A', marginBottom: 0 }]}>QUICK SUMMARY</Text>
                                    </View>
                                    <Text style={[styles.soapValue, { color: '#14532D', fontSize: 15, lineHeight: 22, fontWeight: '500' }]}>
                                        {soapNote.patient_summary || soapNote.summary}
                                    </Text>
                                </View>
                            )}

                            {/* 2. Detailed Sections */}
                            {SOAP_SECTIONS.map((section, index) => {
                                const content = soapNote[section.key];
                                if (!content) return null;

                                return (
                                    <View 
                                        key={section.key} 
                                        style={[
                                            styles.soapCard, 
                                            { 
                                                backgroundColor: section.bg, 
                                                borderColor: section.border, 
                                                borderLeftColor: section.color,
                                                borderLeftWidth: 5,
                                                marginBottom: index === SOAP_SECTIONS.length - 1 ? 0 : 12
                                            }
                                        ]}
                                    >
                                        <View style={styles.sectionRow}>
                                            <View style={[styles.iconContainer, { backgroundColor: 'white' }]}>
                                                <Ionicons name={section.icon} size={18} color={section.color} />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={[styles.soapLabel, { color: section.color, marginBottom: 2 }]}>
                                                    {section.label.toUpperCase()}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>
                                                    {section.description}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 10 }}>
                                            <Text style={[styles.soapValue, { color: '#334155' }]}>
                                                {renderContent(content)}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : consultation.hasSoapNote ? (
                        <TouchableOpacity style={styles.retryBtn} onPress={fetchSoapNote}>
                            <Text style={styles.retryText}>Load AI Analysis</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.emptySoap}>
                            <Ionicons name="sparkles-outline" size={24} color="#DDD" />
                            <Text style={styles.emptySoapText}>AI Analysis is not available for this visit.</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    content: { flex: 1, padding: 16 },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    doctorHeader: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        mr: 12,
    },
    doctorInfo: { flex: 1, marginLeft: 12 },
    doctorName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
    date: { fontSize: 13, color: '#888', marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
    infoCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 5,
    },
    infoText: { fontSize: 14, color: '#444', lineHeight: 22 },
    subSection: { marginBottom: 15 },
    subTitle: { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 1, marginBottom: 5 },
    subText: { fontSize: 14, color: '#333', lineHeight: 20 },
    soapCard: {
        backgroundColor: '#F0F4FF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#D1D9F0',
    },
    soapContainer: {
        width: '100%',
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    soapSection: { marginBottom: 16 },
    soapLabel: { fontSize: 11, fontWeight: '900', color: '#283593' },
    soapValue: { fontSize: 14, color: '#3949AB', lineHeight: 20 },
    emptySoap: { alignItems: 'center', padding: 20 },
    emptySoapText: { fontSize: 13, color: '#999', marginTop: 8 },
    retryBtn: { alignSelf: 'center', padding: 10 },
    retryText: { color: COLORS.primary, fontWeight: 'bold' },
    backBtn: { marginTop: 20, padding: 10 }
});
