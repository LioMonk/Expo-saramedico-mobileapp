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
                        <View style={styles.soapCard}>
                            <View style={styles.soapSection}>
                                <Text style={styles.soapLabel}>SUBJECTIVE</Text>
                                <Text style={styles.soapValue}>{soapNote.subjective || 'Not available'}</Text>
                            </View>
                            <View style={styles.soapSection}>
                                <Text style={styles.soapLabel}>OBJECTIVE</Text>
                                <Text style={styles.soapValue}>{soapNote.objective || 'Not available'}</Text>
                            </View>
                            <View style={styles.soapSection}>
                                <Text style={styles.soapLabel}>ASSESSMENT</Text>
                                <Text style={styles.soapValue}>{soapNote.assessment || 'Not available'}</Text>
                            </View>
                            <View style={styles.soapSection}>
                                <Text style={styles.soapLabel}>PLAN</Text>
                                <Text style={styles.soapValue}>{soapNote.plan || 'Not available'}</Text>
                            </View>
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
    soapSection: { marginBottom: 16 },
    soapLabel: { fontSize: 11, fontWeight: '900', color: '#283593', marginBottom: 6 },
    soapValue: { fontSize: 14, color: '#3949AB', lineHeight: 20 },
    emptySoap: { alignItems: 'center', padding: 20 },
    emptySoapText: { fontSize: 13, color: '#999', marginTop: 8 },
    retryBtn: { alignSelf: 'center', padding: 10 },
    retryText: { color: COLORS.primary, fontWeight: 'bold' },
    backBtn: { marginTop: 20, padding: 10 }
});
