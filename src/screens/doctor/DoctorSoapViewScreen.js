import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, Dimensions, Alert, TextInput, KeyboardAvoidingView, Platform, Modal
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
    const [saving, setSaving] = useState(false);
    const [consultation, setConsultation] = useState(initialConsultation || null);
    
    // Editable state for all 5 fields
    const [soapData, setSoapData] = useState({
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        patient_summary: ''
    });
    
    const [error, setError] = useState(null);
    
    // Session Info Modal States
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showPatientPreview, setShowPatientPreview] = useState(false);
    const [transcriptStatus, setTranscriptStatus] = useState('pending'); // 'pending', 'available', 'not_found'
    const [transcriptMsg, setTranscriptMsg] = useState('');
    const [checkingTranscript, setCheckingTranscript] = useState(false);
    const [generatingSoap, setGeneratingSoap] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [displayAttempt, setDisplayAttempt] = useState(0);

    const MAX_POLL_ATTEMPTS = 30; // 5 minutes with 10s intervals
    const POLL_INTERVAL_MS = 10000;
    const pollTimerRef = React.useRef(null);
    const pollAttemptsRef = React.useRef(0);

    // Countdown effect for Google Meet processing
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchSoapData = useCallback(async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            const response = await consultationAPI.getSoapNote(consultationId);

            const httpStatus = response.status;
            const data = response.data || {};

            if (data.status === 'completed' || data.soap_note) {
                const note = data.soap_note || data;
                setSoapData({
                    subjective: note.subjective || '',
                    objective: note.objective || '',
                    assessment: note.assessment || '',
                    plan: note.plan || '',
                    patient_summary: note.patient_summary || ''
                });
                setPolling(false);
            } else if (data.status === 'processing' || httpStatus === 202) {
                setPolling(true);
            } else {
                // If we get a 404 or no note, it's fine, we just won't show the note yet
                if (!isPolling) {
                    // Check if consultation itself is loaded
                    const consultRes = await consultationAPI.getConsultation(consultationId);
                    setConsultation(consultRes.data);
                }
            }
        } catch (err) {
            console.error('Fetch SOAP error:', err);
            // Don't set error if we're just polling or if it's a 404
            if (!isPolling && err.response?.status !== 404) {
                setError('Failed to connect to AI service');
            }
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [consultationId]);

    const startPolling = useCallback((id) => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollAttemptsRef.current = 0;
        setDisplayAttempt(0);
        setPolling(true);

        pollTimerRef.current = setInterval(async () => {
            pollAttemptsRef.current += 1;
            setDisplayAttempt(pollAttemptsRef.current);

            if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
                clearInterval(pollTimerRef.current);
                setPolling(false);
                return;
            }

            try {
                const response = await consultationAPI.getSoapNote(id);
                const data = response.data || {};

                if (response.status === 200 && (data.status === 'completed' || data.soap_note)) {
                    clearInterval(pollTimerRef.current);
                    const note = data.soap_note || data;
                    setSoapData({
                        subjective: note.subjective || '',
                        objective: note.objective || '',
                        assessment: note.assessment || '',
                        plan: note.plan || '',
                        patient_summary: note.patient_summary || ''
                    });
                    setPolling(false);
                }
            } catch (err) {
                console.error('Poll error:', err);
            }
        }, POLL_INTERVAL_MS);
    }, []);

    useEffect(() => {
        fetchSoapData();
    }, [fetchSoapData]);

    const handleCheckTranscript = async () => {
        if (checkingTranscript) return;
        setCheckingTranscript(true);
        try {
            const response = await consultationAPI.getTranscriptStatus(consultationId);
            const result = response.data;
            setTranscriptStatus(result.status);
            setTranscriptMsg(result.message || '');
            if (result.status === 'available' && result.transcript_in_db) {
                startPolling(consultationId);
            }
        } catch (err) {
            console.error('Transcript check error:', err);
            setTranscriptStatus('not_found');
            setTranscriptMsg('Could not check transcript status.');
        } finally {
            setCheckingTranscript(false);
        }
    };

    const handleGenerateSoap = async () => {
        if (generatingSoap) return;
        setGeneratingSoap(true);
        try {
            await consultationAPI.triggerSoapGeneration(consultationId);
            setShowInfoModal(false);
            // Main screen will show the 'pollingBanner' because startPolling sets polling=true
            startPolling(consultationId);
        } catch (err) {
            console.error('SOAP generate error:', err);
            Alert.alert('Error', 'Failed to trigger SOAP generation');
        } finally {
            setGeneratingSoap(false);
        }
    };

    const onRefresh = () => {
        fetchSoapData();
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await consultationAPI.patchSoapNote(consultationId, soapData);
            Alert.alert('Success', 'SOAP Note saved successfully');
        } catch (err) {
            console.error('Save SOAP error:', err);
            Alert.alert('Error', 'Failed to save SOAP note');
        } finally {
            setSaving(false);
        }
    };

    const handleTextChange = (field, text) => {
        setSoapData(prev => ({ ...prev, [field]: text }));
    };

    const renderEditableSection = (title, field, icon, color, placeholder) => (
        <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
                <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
            </View>
            <TextInput
                style={styles.textInput}
                multiline
                value={soapData[field]}
                onChangeText={(text) => handleTextChange(field, text)}
                placeholder={`Enter ${title.toLowerCase()}...`}
                placeholderTextColor="#999"
                textAlignVertical="top"
            />
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
                <TouchableOpacity onPress={() => setShowInfoModal(true)} style={styles.headerAction}>
                    <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.headerAction} disabled={saving || error}>
                    {saving ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Text style={{ color: COLORS.primary, fontWeight: '700', opacity: error ? 0.5 : 1 }}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            {polling && (
                <View style={styles.pollingBanner}>
                    <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.pollingText}>AI is still generating your report...</Text>
                </View>
            )}

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
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

                            {renderEditableSection('Subjective', 'subjective', 'person-outline', '#3B82F6')}
                            {renderEditableSection('Objective', 'objective', 'eye-outline', '#10B981')}
                            {renderEditableSection('Assessment', 'assessment', 'clipboard-outline', '#F59E0B')}
                            {renderEditableSection('Plan', 'plan', 'list-outline', '#8B5CF6')}
                            
                            <View style={[styles.sectionCard, { borderColor: '#E0E7FF', borderWidth: 2 }]}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.iconBox, { backgroundColor: '#6366F115' }]}>
                                        <Ionicons name="heart-outline" size={20} color="#6366F1" />
                                    </View>
                                    <View>
                                        <Text style={[styles.sectionTitle, { color: '#6366F1' }]}>Patient Summary</Text>
                                        <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>This is what the patient will see.</Text>
                                    </View>
                                </View>
                                <TextInput
                                    style={[styles.textInput, { minHeight: 120 }]}
                                    multiline
                                    value={soapData.patient_summary}
                                    onChangeText={(text) => handleTextChange('patient_summary', text)}
                                    placeholder="Enter simplified summary for patient..."
                                    placeholderTextColor="#999"
                                    textAlignVertical="top"
                                />
                            </View>
                            
                            <TouchableOpacity 
                                style={[styles.signBtn, { opacity: saving ? 0.7 : 1 }]} 
                                onPress={handleSave}
                                disabled={saving}
                            >
                                <Text style={styles.signBtnText}>{saving ? 'Saving...' : 'Save & Sign Note'}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
            {/* Session Info Modal */}
            <Modal
                visible={showInfoModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowInfoModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.dragIndicator} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Session Details</Text>
                            <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalSubHeader}>STATUS</Text>
                            <View style={styles.tagsRow}>
                                <View style={[styles.statusTag, { backgroundColor: consultation?.status === 'completed' ? '#FEF9C3' : '#FEE2E2' }]}>
                                    <View style={[styles.dot, { backgroundColor: consultation?.status === 'completed' ? '#854D0E' : '#B91C1C' }]} />
                                    <Text style={[styles.statusTagText, { color: consultation?.status === 'completed' ? '#854D0E' : '#B91C1C' }]}>
                                        {(consultation?.status || 'Unknown').toUpperCase()}
                                    </Text>
                                </View>
                                {consultation?.urgency_level === 'High' && (
                                    <View style={[styles.statusTag, { backgroundColor: '#FEE2E2' }]}>
                                        <View style={[styles.dot, { backgroundColor: '#B91C1C' }]} />
                                        <Text style={[styles.statusTagText, { color: '#B91C1C' }]}>High Urgency</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.modalSubHeader, { marginTop: 20 }]}>GOOGLE DRIVE TRANSCRIPT STATUS</Text>
                            <View style={[styles.transcriptCard, { 
                                backgroundColor: transcriptStatus === 'available' ? '#F0FDF4' : (transcriptStatus === 'not_found' ? '#FFF1F2' : '#F8FAFC'),
                                borderColor: transcriptStatus === 'available' ? '#BBF7D0' : (transcriptStatus === 'not_found' ? '#FECACA' : '#E2E8F0')
                            }]}>
                                {(() => {
                                    const completedAt = consultation?.completion_time || consultation?.completed_at;
                                    const COOLDOWN_MS = 4 * 60 * 1000;
                                    const diffMs = completedAt ? (new Date(completedAt).getTime() + COOLDOWN_MS) - now : 0;
                                    const isInCooldown = diffMs > 0;
                                    const minsLeft = Math.floor(Math.max(0, diffMs) / 60000);
                                    const secsLeft = Math.floor((Math.max(0, diffMs) % 60000) / 1000);

                                    if (isInCooldown) {
                                        return (
                                            <View style={{ alignItems: 'center', padding: 10 }}>
                                                <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.primary }}>
                                                    {minsLeft}:{secsLeft.toString().padStart(2, '0')}
                                                </Text>
                                                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                                                    Awaiting Google Meet processing...
                                                </Text>
                                            </View>
                                        );
                                    }

                                    return (
                                        <>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={[styles.statusIcon, { 
                                                    backgroundColor: transcriptStatus === 'available' ? '#16A34A' : (transcriptStatus === 'not_found' ? '#EF4444' : COLORS.primary)
                                                }]}>
                                                    {checkingTranscript ? (
                                                        <ActivityIndicator size="small" color="#FFF" />
                                                    ) : (
                                                        <Ionicons 
                                                            name={transcriptStatus === 'available' ? 'checkmark' : (transcriptStatus === 'not_found' ? 'alert-circle' : 'information')} 
                                                            size={16} 
                                                            color="#FFF" 
                                                        />
                                                    )}
                                                </View>
                                                <View style={{ marginLeft: 10 }}>
                                                    <Text style={[styles.transcriptStatusText, { 
                                                        color: transcriptStatus === 'available' ? '#16A34A' : (transcriptStatus === 'not_found' ? '#DC2626' : COLORS.primary)
                                                    }]}>
                                                        {transcriptStatus === 'available' ? "Found & Available" : (transcriptStatus === 'not_found' ? "Not Found" : "Pending Verification")}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.transcriptMsg}>
                                                {transcriptMsg || "Click verify to check Google Drive for transcript."}
                                            </Text>
                                            {transcriptStatus !== 'available' && (
                                                <TouchableOpacity 
                                                    style={styles.verifyBtn} 
                                                    onPress={handleCheckTranscript}
                                                    disabled={checkingTranscript}
                                                >
                                                    <Text style={styles.verifyBtnText}>{checkingTranscript ? 'Searching...' : 'Verify Transcript in Drive'}</Text>
                                                </TouchableOpacity>
                                            )}
                                        </>
                                    );
                                })()}
                            </View>

                            <TouchableOpacity 
                                style={[styles.generateBtn, { 
                                    opacity: (transcriptStatus !== 'available' || generatingSoap || polling) ? 0.6 : 1 
                                }]}
                                onPress={handleGenerateSoap}
                                disabled={transcriptStatus !== 'available' || generatingSoap || polling}
                            >
                                <Text style={styles.generateBtnText}>
                                    {generatingSoap || polling ? 'Generating SOAP...' : '✨ Generate SOAP'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.verifyBtn, { 
                                    backgroundColor: '#FFF', 
                                    borderWidth: 1, 
                                    borderColor: (soapData.subjective || soapData.patient_summary) ? '#E2E8F0' : '#F1F5F9', 
                                    marginBottom: 24, 
                                    marginTop: 0,
                                    opacity: (soapData.subjective || soapData.patient_summary) ? 1 : 0.5
                                }]}
                                onPress={() => setShowPatientPreview(true)}
                                disabled={!(soapData.subjective || soapData.patient_summary)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="eye-outline" size={18} color="#1E293B" style={{ marginRight: 8 }} />
                                    <Text style={[styles.verifyBtnText, { color: '#1E293B' }]}>VIEW PATIENT SUMMARY</Text>
                                </View>
                            </TouchableOpacity>

                            <Text style={styles.modalSubHeader}>CONSULTATION DETAILS</Text>
                            <View style={styles.infoBox}>
                                <Text style={styles.infoLabel}>Record ID</Text>
                                <Text style={styles.infoValue}>{consultationId}</Text>
                            </View>

                            <Text style={[styles.modalSubHeader, { marginTop: 20 }]}>HOW IT WORKS</Text>
                            <View style={styles.infoBox}>
                                <Text style={styles.howItWorksText}>
                                    1. Consultation ends via Google Meet.{"\n"}
                                    2. Google processes transcript (2–4 min).{"\n"}
                                    3. System verifies transcript in Drive.{"\n"}
                                    4. Click "Generate SOAP" to initiate AI.{"\n"}
                                    5. Structures Note appears when ready.
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Patient Preview Modal (Parity with Patient App) */}
            <Modal
                visible={showPatientPreview}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowPatientPreview(false)}
            >
                <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContent, { borderRadius: 20, maxHeight: '80%', paddingTop: 24 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Patient View Preview</Text>
                            <TouchableOpacity onPress={() => setShowPatientPreview(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.previewCard}>
                                <View style={styles.previewHeader}>
                                    <View style={[styles.statusTag, { backgroundColor: '#E8F5E9', paddingVertical: 4 }]}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#2E7D32' }}>
                                            {(consultation?.status || 'COMPLETED').toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.previewBody}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                                        <View style={[styles.iconBox, { backgroundColor: '#F0F9FF', width: 32, height: 32 }]}>
                                            <Ionicons name="heart" size={16} color="#0284C7" />
                                        </View>
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7', marginLeft: 10 }}>
                                            DOCTOR'S SUMMARY
                                        </Text>
                                    </View>
                                    
                                    <Text style={styles.previewText}>
                                        {soapData.patient_summary || "No patient summary available."}
                                    </Text>
                                    
                                    {!soapData.patient_summary && (
                                        <Text style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic', marginTop: 10 }}>
                                            Summary is being prepared by your doctor. Please check back later.
                                        </Text>
                                    )}
                                </View>
                            </View>
                            
                            <Text style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 20, fontStyle: 'italic' }}>
                                This is exactly what the patient sees on their application.
                            </Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    headerAction: { padding: 8, minWidth: 60, alignItems: 'center' },

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
    
    textInput: {
        fontSize: 15,
        color: '#374151',
        lineHeight: 24,
        minHeight: 100,
        backgroundColor: '#F9FAFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },

    signBtn: { 
        backgroundColor: '#111827', 
        paddingVertical: 16, 
        borderRadius: 14, 
        alignItems: 'center', 
        marginTop: 10,
        shadowColor: '#000', 
        shadowOpacity: 0.2, 
        shadowRadius: 8, 
        shadowOffset: { width: 0, height: 4 } 
    },
    signBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    errorCard: { alignItems: 'center', padding: 40, backgroundColor: '#FFF', borderRadius: 24, marginTop: 40 },
    errorTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 15 },
    errorSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 25 },
    retryBtnText: { color: '#FFF', fontWeight: '700' },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingTop: 12,
        maxHeight: '85%'
    },
    dragIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 15
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827'
    },
    modalSubHeader: {
        fontSize: 10,
        fontWeight: '800',
        color: '#6B7280',
        letterSpacing: 1,
        marginBottom: 10
    },
    tagsRow: {
        flexDirection: 'row',
        gap: 8
    },
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6
    },
    statusTagText: {
        fontSize: 11,
        fontWeight: '700'
    },
    transcriptCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 16
    },
    statusIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    transcriptStatusText: {
        fontSize: 14,
        fontWeight: '700'
    },
    transcriptMsg: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 18,
        marginTop: 10
    },
    verifyBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 16
    },
    verifyBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14
    },
    generateBtn: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4
    },
    generateBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15
    },
    infoBox: {
        backgroundColor: '#F9FAFC',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    infoLabel: {
        fontSize: 11,
        color: '#64748B',
        marginBottom: 4,
        fontWeight: '600'
    },
    infoValue: {
        fontSize: 13,
        color: '#111827',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
    },
    howItWorksText: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 18
    },
    previewCard: {
        backgroundColor: '#F0F9FF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10
    },
    previewBody: {},
    previewText: {
        fontSize: 15,
        color: '#0369A1',
        lineHeight: 24,
        fontWeight: '500'
    }
});
