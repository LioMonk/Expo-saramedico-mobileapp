import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doctorAPI } from '../../services/api';
import { APPOINTMENT_STATUS } from '../../services/config';
import ErrorHandler from '../../services/errorHandler';
import { COLORS } from '../../constants/theme';

/**
 * Appointment Approval Screen
 *
 * Allows doctors to review and approve/reject pending appointments.
 * Uses a cross-platform Modal for note input (replaces Alert.prompt which is iOS-only).
 */
export default function AppointmentApprovalScreen({ navigation }) {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [noteModal, setNoteModal] = useState({ visible: false, mode: null, appointment: null });
    const [noteText, setNoteText] = useState('');

    useEffect(() => {
        loadPendingAppointments();
    }, []);

    const loadPendingAppointments = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            const response = await doctorAPI.getAppointments(APPOINTMENT_STATUS.PENDING);
            const data = response.data || [];
            setAppointments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Load error:', error);
            const errorInfo = ErrorHandler.handleError(error);
            if (!isRefreshing) {
                Alert.alert('Load Failed', errorInfo.message);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const openApproveModal = (appointment) => {
        setNoteText('Please bring any relevant medical records.');
        setNoteModal({ visible: true, mode: 'approve', appointment });
    };

    const openRejectModal = (appointment) => {
        setNoteText('');
        setNoteModal({ visible: true, mode: 'reject', appointment });
    };

    const closeModal = () => {
        setNoteModal({ visible: false, mode: null, appointment: null });
        setNoteText('');
    };

    const handleConfirmAction = async () => {
        const { mode, appointment } = noteModal;
        if (!appointment) return;

        closeModal();
        setProcessingId(appointment.id);

        try {
            if (mode === 'approve') {
                const approvalData = {
                    appointment_time: appointment.requested_date,
                    doctor_notes: noteText || 'Please bring any relevant medical records.',
                };
                const response = await doctorAPI.approveAppointment(appointment.id, approvalData);
                const joinUrl = response.data?.join_url;
                Alert.alert(
                    'Appointment Approved ✅',
                    joinUrl ? `Zoom meeting created!\nJoin URL: ${joinUrl}` : 'Appointment has been approved.',
                    [{ text: 'OK', onPress: () => loadPendingAppointments() }]
                );
            } else if (mode === 'reject') {
                await doctorAPI.updateAppointmentStatus(
                    appointment.id,
                    APPOINTMENT_STATUS.DECLINED,
                    noteText || 'Unable to accommodate at this time.'
                );
                Alert.alert('Appointment Declined', 'The patient has been notified.', [
                    { text: 'OK', onPress: () => loadPendingAppointments() }
                ]);
            }
        } catch (error) {
            console.error(`${mode} error:`, error);
            const errorInfo = ErrorHandler.handleError(error);
            Alert.alert(`${mode === 'approve' ? 'Approval' : 'Rejection'} Failed`, errorInfo.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleViewDocuments = (appointment) => {
        navigation.navigate('DoctorPatientDetailScreen', {
            patientId: appointment.patient_id,
            initialTab: 'Documents'
        });
    };

    const renderAppointmentCard = ({ item }) => {
        const isProcessing = processingId === item.id;
        const requestedDate = new Date(item.requested_date || item.scheduled_at || Date.now());

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatarCircle}>
                        <Ionicons name="person" size={24} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.patientName}>{item.patient?.full_name || item.patient_name || 'Unknown Patient'}</Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{item.status?.toUpperCase() || 'PENDING'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#888" />
                    <View style={styles.detailContent}>
                        <Text style={styles.label}>Requested Date</Text>
                        <Text style={styles.value}>{requestedDate.toLocaleString()}</Text>
                    </View>
                </View>

                {item.reason ? (
                    <View style={styles.detailRow}>
                        <Ionicons name="document-text-outline" size={16} color="#888" />
                        <View style={styles.detailContent}>
                            <Text style={styles.label}>Reason</Text>
                            <Text style={styles.value}>{item.reason}</Text>
                        </View>
                    </View>
                ) : null}

                {item.grant_access_to_history && (
                    <View style={styles.accessChip}>
                        <Ionicons name="shield-checkmark" size={14} color="#2e7d32" />
                        <Text style={styles.accessChipText}>Medical history access granted</Text>
                    </View>
                )}

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.docsBtn}
                        onPress={() => handleViewDocuments(item)}
                        disabled={isProcessing}
                    >
                        <Ionicons name="folder-open-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.docsBtnText}>Documents</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn, isProcessing && styles.disabledBtn]}
                        onPress={() => openApproveModal(item)}
                        disabled={isProcessing}
                    >
                        {isProcessing && processingId === item.id ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Ionicons name="checkmark-sharp" size={16} color="white" />
                        )}
                        <Text style={styles.approveBtnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn, isProcessing && styles.disabledBtn]}
                        onPress={() => openRejectModal(item)}
                        disabled={isProcessing}
                    >
                        <Ionicons name="close-sharp" size={16} color="#d32f2f" />
                        <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading appointments...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pending Approvals</Text>
                <TouchableOpacity onPress={() => loadPendingAppointments()}>
                    <Ionicons name="refresh" size={22} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={appointments}
                renderItem={renderAppointmentCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshing={refreshing}
                onRefresh={() => {
                    setRefreshing(true);
                    loadPendingAppointments(true);
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={60} color="#DDD" />
                        <Text style={styles.emptyText}>No pending appointments</Text>
                        <Text style={styles.emptySubtext}>You're all caught up! 🎉</Text>
                    </View>
                }
            />

            {/* Notes Modal - cross-platform replacement for Alert.prompt */}
            <Modal
                visible={noteModal.visible}
                transparent
                animationType="fade"
                onRequestClose={closeModal}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Ionicons
                                name={noteModal.mode === 'approve' ? 'checkmark-circle' : 'close-circle'}
                                size={28}
                                color={noteModal.mode === 'approve' ? '#4CAF50' : '#f44336'}
                            />
                            <Text style={styles.modalTitle}>
                                {noteModal.mode === 'approve' ? 'Approve Appointment' : 'Reject Appointment'}
                            </Text>
                        </View>
                        <Text style={styles.modalSub}>
                            {noteModal.mode === 'approve'
                                ? 'Add notes for the patient (optional):'
                                : 'Reason for rejection (optional):'}
                        </Text>
                        <TextInput
                            style={styles.noteInput}
                            placeholder={noteModal.mode === 'approve'
                                ? 'e.g. Please bring your prescription...'
                                : 'e.g. Schedule conflict or other reason...'}
                            placeholderTextColor="#AAA"
                            multiline
                            numberOfLines={3}
                            value={noteText}
                            onChangeText={setNoteText}
                        />
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={closeModal}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalConfirmBtn,
                                    { backgroundColor: noteModal.mode === 'approve' ? '#4CAF50' : '#f44336' }
                                ]}
                                onPress={handleConfirmAction}
                            >
                                <Text style={styles.modalConfirmText}>
                                    {noteModal.mode === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
    listContainer: { padding: 16, paddingBottom: 40 },

    card: {
        backgroundColor: 'white',
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatarCircle: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
        borderWidth: 1, borderColor: '#DBEAFE'
    },
    patientName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
    statusBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
    statusText: { fontSize: 11, color: '#F57C00', fontWeight: '700' },

    detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    detailContent: { marginLeft: 10, flex: 1 },
    label: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 2 },
    value: { fontSize: 14, color: '#374151' },

    accessChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 8, alignSelf: 'flex-start', marginBottom: 14
    },
    accessChipText: { fontSize: 12, color: '#2e7d32', fontWeight: '600' },

    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
    docsBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, paddingVertical: 10, borderRadius: 10,
        borderWidth: 1, borderColor: COLORS.primary, backgroundColor: '#F0F7FF'
    },
    docsBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
    actionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, paddingVertical: 10, borderRadius: 10,
    },
    approveBtn: { backgroundColor: '#4CAF50' },
    rejectBtn: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2' },
    approveBtnText: { color: 'white', fontWeight: '700', fontSize: 12 },
    rejectBtnText: { color: '#d32f2f', fontWeight: '700', fontSize: 12 },
    disabledBtn: { opacity: 0.6 },

    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 16 },
    emptySubtext: { fontSize: 14, color: '#999', marginTop: 6 },

    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    modalSub: { fontSize: 14, color: '#6B7280', marginBottom: 14 },
    noteInput: {
        backgroundColor: '#F9FAFC', borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, color: '#333',
        height: 90, textAlignVertical: 'top', marginBottom: 20
    },
    modalBtnRow: { flexDirection: 'row', gap: 12 },
    modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
    modalCancelText: { color: '#374151', fontWeight: '700' },
    modalConfirmBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    modalConfirmText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
