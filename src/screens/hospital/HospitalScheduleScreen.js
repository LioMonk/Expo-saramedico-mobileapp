import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { hospitalAPI } from '../../services/api';

export default function HospitalScheduleScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [appointments, setAppointments] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        loadAppointments();
    }, [selectedDate]);

    const loadAppointments = async () => {
        try {
            setLoading(true);
            const response = await hospitalAPI.getAppointments({
                date: selectedDate.toISOString().split('T')[0]
            });
            setAppointments(response.data || []);
        } catch (error) {
            console.log('Appointments not available:', error.message);
            // Default to empty array instead of mock data
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAppointments();
        setRefreshing(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return { bg: '#E8F5E9', text: '#4CAF50' };
            case 'pending': return { bg: '#FFF3E0', text: '#FF9800' };
            case 'cancelled': return { bg: '#FFEBEE', text: '#F44336' };
            default: return { bg: '#F5F5F5', text: '#666' };
        }
    };

    const onDateChange = (event, selected) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selected) {
            setSelectedDate(selected);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading schedule...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Appointments</Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.calendarIcon}>
                            <Ionicons name="calendar" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Appointments */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                    }
                >
                    <Text style={styles.sectionTitle}>
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                    <Text style={styles.sectionSubtitle}>{appointments.length} appointments</Text>

                    {appointments.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={60} color="#DDD" />
                            <Text style={styles.emptyText}>No appointments</Text>
                            <Text style={styles.emptySubtext}>No appointments scheduled for this day</Text>
                        </View>
                    ) : (
                        appointments.map((appointment, index) => {
                            const statusColors = getStatusColor(appointment.status);
                            return (
                                <TouchableOpacity key={appointment.id || index} style={styles.appointmentCard}>
                                    <View style={styles.timeContainer}>
                                        <Text style={styles.timeText}>{appointment.time}</Text>
                                    </View>
                                    <View style={styles.appointmentInfo}>
                                        <Text style={styles.patientName}>{appointment.patient}</Text>
                                        <Text style={styles.doctorName}>{appointment.doctor}</Text>
                                        <View style={styles.typeRow}>
                                            <Ionicons name="medical-outline" size={14} color="#999" />
                                            <Text style={styles.typeText}>{appointment.type}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                                        <Text style={[styles.statusText, { color: statusColors.text }]}>
                                            {appointment.status}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    contentContainer: { flex: 1, padding: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, color: '#666', fontSize: 14 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    dateIconWrapper: { padding: 4 },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    sectionSubtitle: { fontSize: 13, color: '#666', marginBottom: 15 },

    emptyContainer: { alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#666', marginTop: 15 },
    emptySubtext: { fontSize: 13, color: '#999', marginTop: 5 },

    appointmentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
    timeContainer: { paddingRight: 15, borderRightWidth: 1, borderRightColor: '#F0F0F0', marginRight: 15 },
    timeText: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
    appointmentInfo: { flex: 1 },
    patientName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    doctorName: { fontSize: 13, color: '#666', marginTop: 2 },
    typeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    typeText: { fontSize: 12, color: '#999', marginLeft: 5 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
