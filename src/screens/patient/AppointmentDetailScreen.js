import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '../../constants/theme';
import { patientAPI } from '../../services/api';
import ErrorHandler from '../../services/errorHandler';
import moment from 'moment';

export default function AppointmentDetailScreen({ route, navigation }) {
    const { appointment: initialAppointment, id: appointmentId, role = 'patient' } = route.params || {};
    const [appointment, setAppointment] = useState(initialAppointment);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                let currentApt = initialAppointment;

                // 1. Fetch appointment if missing but ID exists (e.g. from Notifications)
                if (!currentApt && appointmentId) {
                    console.log('🔄 [AppointmentDetail] Fetching appointment by ID:', appointmentId);
                    if (role === 'doctor') {
                        const { doctorAPI } = require('../../services/api');
                        const res = await doctorAPI.getAppointments();
                        const list = res.data || [];
                        currentApt = list.find(a => a.id === appointmentId);
                    } else {
                        const res = await patientAPI.getMyAppointments();
                        const list = res.data || [];
                        currentApt = list.find(a => a.id === appointmentId);
                    }
                    if (currentApt) {
                        setAppointment(currentApt);
                    } else {
                        throw new Error('Appointment not found');
                    }
                }

                if (currentApt) {
                    // 2. Load History
                    let pastHistory = [];
                    if (role === 'doctor') {
                        const { doctorAPI } = require('../../services/api');
                        const response = await doctorAPI.getAppointments();
                        const allAppts = response.data || [];
                        pastHistory = allAppts.filter(appt =>
                            appt.patient_id === currentApt.patient_id &&
                            appt.id !== currentApt.id &&
                            new Date(appt.requested_date || appt.appointment_date) < new Date()
                        ).sort((a, b) => new Date(b.requested_date || b.appointment_date) - new Date(a.requested_date || a.appointment_date));
                    } else {
                        const response = await patientAPI.getMyAppointments();
                        const allAppts = response.data || [];
                        pastHistory = allAppts.filter(appt =>
                            appt.doctor_id === currentApt.doctor_id &&
                            appt.id !== currentApt.id &&
                            new Date(appt.requested_date || appt.appointment_date) < new Date()
                        ).sort((a, b) => new Date(b.requested_date || b.appointment_date) - new Date(a.requested_date || a.appointment_date));
                    }
                    setHistory(pastHistory);
                }
            } catch (error) {
                console.error('❌ [AppointmentDetail] Init Error:', error);
                Alert.alert('Error', 'Failed to load appointment details');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [appointmentId, initialAppointment]);

    const statusColors = {
        pending: '#FFA000',
        accepted: '#4CAF50',
        declined: '#F44336',
        completed: '#2196F3',
        cancelled: '#9E9E9E'
    };

    if (!appointment && !loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <Text>Appointment not found or data missing.</Text>
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Appointment Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Doctor/Patient Info Card */}
                <View style={styles.doctorCard}>
                    {role === 'doctor' ? (
                        <>
                            <Image
                                source={{
                                    uri: appointment.patient_photo_url ||
                                        'https://ui-avatars.com/api/?name=' + encodeURIComponent(appointment.patient_name || 'Patient') + '&background=random',
                                }}
                                style={styles.doctorImage}
                            />
                            <View style={styles.doctorInfo}>
                                <Text style={styles.doctorName}>
                                    {(() => {
                                        let name = appointment.patient_name || 'Patient';
                                        if (name.toLowerCase() === 'encrypted' || name.toLowerCase() === 'unknown patient') name = 'Patient';
                                        return name;
                                    })()}
                                </Text>
                                <Text style={styles.doctorSpecialty}>Patient</Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <Image
                                source={{
                                    uri: appointment.doctor_photo_url ||
                                        'https://ui-avatars.com/api/?name=' + encodeURIComponent(appointment.doctor_name || 'Doctor') + '&background=random',
                                }}
                                style={styles.doctorImage}
                            />
                            <View style={styles.doctorInfo}>
                                <Text style={styles.doctorName}>
                                    {(() => {
                                        let name = appointment.doctor_name || 'Doctor';
                                        if (name.toLowerCase() === 'encrypted' || name.toLowerCase() === 'unknown doctor') name = 'Doctor';
                                        return name.startsWith('Dr. ') ? name : `Dr. ${name}`;
                                    })()}
                                </Text>
                                <Text style={styles.doctorSpecialty}>Consultation</Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Current Appointment Section */}
                <Text style={styles.sectionTitle}>Current Appointment</Text>
                <View style={styles.detailCard}>
                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={20} color="#666" />
                        <Text style={styles.detailText}>{moment(appointment.requested_date).format('dddd, MMMM Do YYYY')}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={20} color="#666" />
                        <Text style={styles.detailText}>{moment(appointment.requested_date).format('h:mm A')}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="information-circle-outline" size={20} color="#666" />
                        <Text style={styles.detailText}>{appointment.reason || 'No reason specified'}</Text>
                    </View>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Status:</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColors[appointment.status?.toLowerCase()] || '#DDD' }]}>
                            <Text style={styles.statusText}>{appointment.status?.toUpperCase() || 'UNKNOWN'}</Text>
                        </View>
                    </View>

                    {/* Join Link logic for accepted */}
                    {appointment.status === 'accepted' && (appointment.join_url || appointment.meet_link) && (
                        <TouchableOpacity
                            style={styles.joinButton}
                            onPress={() => {
                                const url = appointment.join_url || appointment.meet_link;
                                console.log('Join button clicked, url is:', url);
                                if (url && (url.startsWith('http') || url.startsWith('https'))) {
                                    console.log('Attempting to open link externally');
                                    WebBrowser.openBrowserAsync(url).catch(err => console.error("Couldn't load page", err));
                                } else {
                                    console.log('Falling back to VideoCallScreen');
                                    navigation.navigate('VideoCallScreen', {
                                        appointment: appointment,
                                        role: role,
                                    });
                                }
                            }}
                        >
                            <Ionicons name="videocam" size={20} color="white" />
                            <Text style={styles.joinButtonText}>Join Video Consultation</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* History Section */}
                <Text style={styles.sectionTitle}>
                    {role === 'doctor' ? 'Past History with Patient' : 'Past History By Doctor'}
                </Text>
                {loading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
                ) : history.length > 0 ? (
                    history.map(pastAppt => (
                        <View key={pastAppt.id} style={styles.historyCard}>
                            <View style={styles.historyHeader}>
                                <Text style={styles.historyDate}>{moment(pastAppt.requested_date).format('MMM Do, YYYY')}</Text>
                                <Text style={[styles.historyStatus, { color: statusColors[pastAppt.status?.toLowerCase()] || '#666' }]}>
                                    {pastAppt.status}
                                </Text>
                            </View>
                            <Text style={styles.historyReason} numberOfLines={2}>Reason: {pastAppt.reason || 'N/A'}</Text>
                            {pastAppt.doctor_notes && (
                                <View style={styles.notesContainer}>
                                    <Text style={styles.notesLabel}>Notes:</Text>
                                    <Text style={styles.notesText}>{pastAppt.doctor_notes}</Text>
                                </View>
                            )}
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyHistory}>
                        <Ionicons name="time-outline" size={40} color="#DDD" />
                        <Text style={styles.emptyHistoryText}>No past appointments found</Text>
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    doctorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    doctorImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    doctorInfo: {
        flex: 1,
    },
    doctorName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    doctorSpecialty: {
        fontSize: 14,
        color: '#666',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        marginLeft: 4,
    },
    detailCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    detailText: {
        fontSize: 15,
        color: '#444',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    statusLabel: {
        fontSize: 15,
        color: '#666',
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 20,
        gap: 8,
    },
    joinButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    historyCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    historyDate: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    historyStatus: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    historyReason: {
        fontSize: 13,
        color: '#666',
        marginBottom: 8,
    },
    notesContainer: {
        marginTop: 8,
        padding: 10,
        backgroundColor: '#F5F7FA',
        borderRadius: 8,
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#555',
        marginBottom: 4,
    },
    notesText: {
        fontSize: 13,
        color: '#444',
        fontStyle: 'italic',
    },
    emptyHistory: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: '#F5F7FA',
        borderRadius: 12,
    },
    emptyHistoryText: {
        marginTop: 10,
        fontSize: 14,
        color: '#999',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtn: {
        marginTop: 20,
        padding: 10,
    },
});
