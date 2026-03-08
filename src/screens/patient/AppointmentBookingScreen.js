import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Platform,
    TouchableOpacity,
    KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, TextInput, Card, Checkbox, Avatar } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { patientAPI } from '../../services/api';
import ErrorHandler from '../../services/errorHandler';
import { COLORS } from '../../constants/theme';

/**
 * Appointment Booking Screen
 * 
 * Allows patients to book appointments with selected doctor
 */
export default function AppointmentBookingScreen({ route, navigation }) {
    const { doctor } = route.params;

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [reason, setReason] = useState('');
    const [grantAccess, setGrantAccess] = useState(false);
    const [loading, setLoading] = useState(false);

    // Picker state
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('date'); // 'date' or 'time'

    /**
     * Handle date change
     */
    const onDateChange = (event, newDate) => {
        // For iOS, the picker remains open until confirmed/cancelled, so we only hide it on 'set' or 'cancel'
        // For Android, the picker closes automatically after selection
        if (Platform.OS === 'android') {
            setShowPicker(false);
        } else if (event.type === 'set') { // 'set' for confirm, 'dismissed' for cancel on iOS
            setShowPicker(false);
        } else if (event.type === 'dismissed') {
            setShowPicker(false);
            return; // Do not update date if dismissed
        }

        if (newDate) {
            setSelectedDate(newDate);
        }
    };

    /**
     * Handle appointment booking
     */
    const handleBookAppointment = async () => {
        if (!reason.trim()) {
            Alert.alert('Reason Required', 'Please provide a reason for your visit');
            return;
        }

        setLoading(true);

        try {
            const appointmentData = {
                doctor_id: doctor.id,
                requested_date: selectedDate.toISOString(),
                reason: reason.trim(),
                grant_access_to_history: grantAccess,
            };

            const response = await patientAPI.requestAppointment(appointmentData);

            Alert.alert(
                'Appointment Requested',
                `Your appointment request has been sent to Dr. ${doctor.name}. You will be notified once it is approved.`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('PatientHome'),
                    },
                ]
            );
        } catch (error) {
            console.error('Booking error:', error);
            const errorInfo = ErrorHandler.handleError(error);
            Alert.alert('Booking Failed', errorInfo.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Book Appointment</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
                    <Card style={styles.card}>
                        <Card.Content>
                            {/* Doctor Info */}
                            <View style={styles.doctorHeader}>
                                <Avatar.Image
                                    size={80}
                                    source={
                                        doctor.photo_url
                                            ? { uri: doctor.photo_url }
                                            : { uri: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(doctor.name || 'Doctor') + '&background=random' }
                                    }
                                />
                                <View style={styles.doctorInfo}>
                                    <Text style={styles.doctorName}>
                                        {(() => {
                                            let dName = doctor.name || doctor.full_name || 'Doctor';
                                            if (dName.toLowerCase() === 'encrypted' || dName.toLowerCase() === 'unknown doctor') dName = 'Doctor';
                                            return dName.startsWith('Dr. ') ? dName : `Dr. ${dName}`;
                                        })()}
                                    </Text>
                                    <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                                </View>
                            </View>

                            <Text style={styles.sectionTitle}>Appointment Details</Text>

                            {/* Date & Time Selection */}
                            <View style={styles.dateContainer}>
                                <Text style={styles.label}>Preferred Date & Time *</Text>
                                <View style={styles.dateTimeRow}>
                                    <TouchableOpacity
                                        style={styles.dateTimeButton}
                                        onPress={() => {
                                            setPickerMode('date');
                                            setShowPicker(true);
                                        }}
                                    >
                                        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                                        <Text style={styles.dateTimeButtonText}>
                                            {selectedDate.toLocaleDateString()}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.dateTimeButton}
                                        onPress={() => {
                                            setPickerMode('time');
                                            setShowPicker(true);
                                        }}
                                    >
                                        <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                                        <Text style={styles.dateTimeButtonText}>
                                            {selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {showPicker && (
                                    <DateTimePicker
                                        value={selectedDate}
                                        mode={pickerMode}
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onDateChange}
                                    />
                                )}
                            </View>

                            {/* Reason Input */}
                            <TextInput
                                label="Reason for Visit *"
                                value={reason}
                                onChangeText={setReason}
                                mode="outlined"
                                multiline
                                numberOfLines={4}
                                style={styles.input}
                                placeholder="e.g., Chest pain consultation, Follow-up visit, etc."
                            />

                            {/* Grant Access Checkbox */}
                            <View style={styles.checkboxContainer}>
                                <Checkbox
                                    status={grantAccess ? 'checked' : 'unchecked'}
                                    onPress={() => setGrantAccess(!grantAccess)}
                                />
                                <Text style={styles.checkboxLabel}>
                                    Grant access to my medical history
                                </Text>
                            </View>
                            <Text style={styles.checkboxInfo}>
                                By checking this box, you allow the doctor to view your uploaded medical
                                documents for this consultation.
                            </Text>

                            {/* Book Button */}
                            <Button
                                mode="contained"
                                onPress={handleBookAppointment}
                                disabled={loading}
                                loading={loading}
                                style={styles.bookButton}
                            >
                                {loading ? 'Requesting...' : 'Request Appointment'}
                            </Button>

                            {/* Info Text */}
                            <Text style={styles.infoText}>
                                Your appointment request will be sent to the doctor for approval. You will
                                receive a notification once the doctor confirms the appointment and provides
                                a meeting link.
                            </Text>
                        </Card.Content>
                    </Card>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    card: {
        margin: 16,
    },
    doctorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    doctorInfo: {
        marginLeft: 16,
        flex: 1,
    },
    doctorName: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    doctorSpecialty: {
        fontSize: 16,
        color: '#666',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    dateContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333',
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    dateTimeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        height: 56,
    },
    dateTimeButtonText: {
        fontSize: 15,
        color: '#333',
        marginLeft: 4,
    },
    helperText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    input: {
        marginBottom: 16,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    checkboxLabel: {
        fontSize: 16,
        marginLeft: 8,
        color: '#333',
    },
    checkboxInfo: {
        fontSize: 12,
        color: '#666',
        marginLeft: 40,
        marginBottom: 24,
        lineHeight: 18,
    },
    bookButton: {
        marginBottom: 16,
        paddingVertical: 6,
        backgroundColor: COLORS.primary,
    },
    infoText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
    },
});
