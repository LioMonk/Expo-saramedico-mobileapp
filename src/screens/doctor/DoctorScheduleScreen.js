import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { doctorAPI } from '../../services/api';
import ErrorHandler from '../../services/errorHandler';

/**
 * DoctorScheduleScreen
 * Displays the doctor's appointment schedule with Zoom integration
 */
export default function DoctorScheduleScreen({ navigation }) {
    const [allAppointments, setAllAppointments] = useState([]);
    const [filteredAppointments, setFilteredAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [activeTab, setActiveTab] = useState('upcoming'); // all, upcoming, pending, past
    const [selectedDate, setSelectedDate] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        loadAppointments();
    }, []);

    const loadAppointments = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);

        try {
            const response = await doctorAPI.getAppointments();
            setAllAppointments(response.data || []);
        } catch (error) {
            console.error('Failed to load appointments:', error);
            const errorInfo = ErrorHandler.handleError(error);
            if (!isRefreshing) {
                Alert.alert('Error', errorInfo.message);
            }
        } finally {
            setLoading(false);
            if (isRefreshing) setRefreshing(false);
        }
    };

    useEffect(() => {
        applyFilters();
    }, [allAppointments, activeTab, selectedDate]);

    const applyFilters = () => {
        let result = [...allAppointments];
        const now = new Date();

        // 1. Tab Filter
        if (activeTab === 'upcoming') {
            result = result.filter(appt => appt.status === 'accepted' && new Date(appt.requested_date) >= now);
        } else if (activeTab === 'pending') {
            result = result.filter(appt => appt.status === 'pending');
        } else if (activeTab === 'past') {
            result = result.filter(appt => new Date(appt.requested_date) < now);
        }

        // 2. Date Filter
        if (selectedDate) {
            result = result.filter(appt => {
                const apptDate = new Date(appt.requested_date);
                return apptDate.getFullYear() === selectedDate.getFullYear() &&
                       apptDate.getMonth() === selectedDate.getMonth() &&
                       apptDate.getDate() === selectedDate.getDate();
            });
        }
        
        // Sort: Upcoming nearest first, Past most recent first
        result.sort((a, b) => {
            const dateA = new Date(a.requested_date);
            const dateB = new Date(b.requested_date);
            return activeTab === 'past' ? dateB - dateA : dateA - dateB;
        });

        setFilteredAppointments(result);
    };


    const onRefresh = () => {
        setRefreshing(true);
        loadAppointments(true);
    };

        const onDateChange = (event, selected) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selected) {
            setSelectedDate(selected);
        }
    };

    const clearDateFilter = () => {
        setSelectedDate(null);
    };

    const handleStartCall = (appointment) => {
        if (appointment.start_url || appointment.meeting_id) {
            // Navigate to in-app video call
            navigation.navigate('VideoCallScreen', {
                appointment: appointment,
                role: 'doctor'
            });
        } else {
            Alert.alert('No Meeting Link', 'This appointment does not have a Zoom link yet.');
        }
    };

    const handleApprove = async (appointmentId) => {
        Alert.alert(
            'Approve Appointment',
            'Set appointment time and add notes (optional)',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            await doctorAPI.approveAppointment(appointmentId, {
                                appointment_time: new Date().toISOString(),
                                doctor_notes: null,
                            });
                            Alert.alert('Success', 'Appointment approved! Zoom link generated.');
                            loadAppointments();
                        } catch (error) {
                            const errorInfo = ErrorHandler.handleError(error);
                            Alert.alert('Error', errorInfo.message);
                        }
                    },
                },
            ]
        );
    };

    const handleDecline = async (appointmentId) => {
        Alert.alert(
            'Decline Appointment',
            'Are you sure you want to decline this appointment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await doctorAPI.updateAppointmentStatus(appointmentId, 'declined', null);
                            Alert.alert('Declined', 'Appointment has been declined.');
                            loadAppointments();
                        } catch (error) {
                            const errorInfo = ErrorHandler.handleError(error);
                            Alert.alert('Error', errorInfo.message);
                        }
                    },
                },
            ]
        );
    };

    const renderAppointment = (appointment) => {
        const isPending = appointment.status === 'pending';
        const isAccepted = appointment.status === 'accepted';
        const hasZoomLink = !!appointment.start_url;

        return (
            <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.patientInfo}>
                        <Text style={styles.patientName}>Patient: {appointment.patient_name || 'Unknown'}</Text>
                        <Text style={styles.appointmentDate}>
                            {new Date(appointment.requested_date).toLocaleString()}
                        </Text>
                        <Text style={styles.reason}>{appointment.reason || 'No reason provided'}</Text>
                    </View>
                    <View style={[styles.statusBadge, getStatusStyle(appointment.status)]}>
                        <Text style={styles.statusText}>{appointment.status.toUpperCase()}</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                    {isPending && (
                        <>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.approveBtn]}
                                onPress={() => handleApprove(appointment.id)}
                            >
                                <Ionicons name="checkmark-circle" size={20} color="white" />
                                <Text style={styles.actionBtnText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.declineBtn]}
                                onPress={() => handleDecline(appointment.id)}
                            >
                                <Ionicons name="close-circle" size={20} color="white" />
                                <Text style={styles.actionBtnText}>Decline</Text>
                            </TouchableOpacity>
                        </>
                    )}
                    {isAccepted && hasZoomLink && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.videoBtn]}
                            onPress={() => handleStartCall(appointment)}
                        >
                            <Ionicons name="videocam" size={20} color="white" />
                            <Text style={styles.actionBtnText}>Start Video Call</Text>
                        </TouchableOpacity>
                    )}
                    {isAccepted && appointment.meeting_password && (
                        <View style={styles.passwordContainer}>
                            <Text style={styles.passwordLabel}>Meeting Password:</Text>
                            <Text style={styles.passwordText}>{appointment.meeting_password}</Text>
                        </View>
                    )}
                </View>

                {appointment.doctor_notes && (
                    <Text style={styles.notes}>Notes: {appointment.doctor_notes}</Text>
                )}
            </View>
        );
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending':
                return { backgroundColor: '#FFF3E0' };
            case 'accepted':
                return { backgroundColor: '#E8F5E9' };
            case 'declined':
                return { backgroundColor: '#FFEBEE' };
            default:
                return { backgroundColor: '#F5F5F5' };
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading appointments...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Schedule</Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateIconWrapper}>
                            <Ionicons name="calendar" size={22} color={selectedDate ? COLORS.primary : "#666"} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onRefresh}>
                            <Ionicons name="refresh" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Date Filter Indicator */}
                {selectedDate && (
                    <View style={styles.dateFilterChip}>
                        <Text style={styles.dateFilterText}>
                            {selectedDate.toLocaleDateString()}
                        </Text>
                        <TouchableOpacity onPress={clearDateFilter}>
                            <Ionicons name="close-circle" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                        {['upcoming', 'pending', 'past', 'all'].map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, activeTab === tab && styles.activeTab]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {filteredAppointments.length > 0 ? (
                        filteredAppointments.map((appointment) => renderAppointment(appointment))
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={64} color="#DDD" />
                            <Text style={styles.emptyText}>No appointments scheduled</Text>
                            <Text style={styles.emptySubtext}>
                                Appointments will appear here when patients book with you
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
            
            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F9FAFC',
    },
    container: {
        flex: 1,
        padding: 20,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    dateIconWrapper: { padding: 4 },
    dateFilterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start', marginBottom: 15, gap: 6 },
    dateFilterText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
    tabsContainer: { marginBottom: 15 },
    tabsScroll: { gap: 10, paddingRight: 20 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0' },
    activeTab: { backgroundColor: COLORS.primary },
    tabText: { color: '#666', fontWeight: '600', fontSize: 13 },
    activeTabText: { color: 'white' },
    appointmentCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    patientInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    appointmentDate: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    reason: {
        fontSize: 14,
        color: '#333',
        fontStyle: 'italic',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    approveBtn: {
        backgroundColor: '#4CAF50',
    },
    declineBtn: {
        backgroundColor: '#F44336',
    },
    videoBtn: {
        backgroundColor: COLORS.primary,
        flex: 1,
    },
    actionBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 8,
    },
    passwordLabel: {
        fontSize: 12,
        color: '#666',
    },
    passwordText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    notes: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
        fontStyle: 'italic',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
