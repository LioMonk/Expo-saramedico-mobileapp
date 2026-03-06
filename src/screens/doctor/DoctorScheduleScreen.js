import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
    ActivityIndicator, RefreshControl, Platform, Modal, TextInput, KeyboardAvoidingView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { doctorAPI, calendarAPI } from '../../services/api';
import ErrorHandler from '../../services/errorHandler';

/**
 * DoctorScheduleScreen
 * Displays the doctor's appointment schedule with Zoom integration
 */
export default function DoctorScheduleScreen({ navigation, route }) {
    const [allAppointments, setAllAppointments] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [activeTab, setActiveTab] = useState('upcoming'); // all, upcoming, pending, past
    const [selectedDate, setSelectedDate] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const { viewMode: initialViewMode } = route.params || {};
    const [viewMode, setViewMode] = useState(initialViewMode || 'list'); // 'list' | 'calendar'
    const [showEventModal, setShowEventModal] = useState(false);

    // Default times for the form
    const getDefaultStartTime = () => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; };
    const getDefaultEndTime = () => { const d = new Date(); d.setHours(10, 0, 0, 0); return d; };

    const [eventForm, setEventForm] = useState({ id: null, title: '', description: '', start_time: getDefaultStartTime(), end_time: getDefaultEndTime() });
    const [pickerConfig, setPickerConfig] = useState({ show: false, field: 'start', mode: 'date' });

    useEffect(() => {
        loadAppointments();
    }, []);

    const loadAppointments = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);

        try {
            const startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 1);
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);

            const [appointmentsRes, eventsRes] = await Promise.all([
                doctorAPI.getAppointments().catch(() => ({ data: [] })),
                calendarAPI.getEvents({
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString()
                }).catch((e) => {
                    console.error('calendar api error:', e);
                    return { data: [] };
                })
            ]);

            setAllAppointments(appointmentsRes.data || []);
            setCalendarEvents(eventsRes.data?.events || eventsRes.data || []);
        } catch (error) {
            console.error('Failed to load schedule:', error);
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
    }, [allAppointments, calendarEvents, activeTab, selectedDate]);

    const applyFilters = () => {
        let items = [];
        const now = new Date();

        // 1. Process Appointments
        allAppointments.forEach(appt => {
            const dateStr = appt.requested_date || appt.appointment_date || appt.scheduled_at;
            if (!dateStr) return;
            const apptDate = new Date(dateStr);

            if (activeTab === 'upcoming' && (appt.status !== 'accepted' || apptDate < now)) return;
            if (activeTab === 'pending' && appt.status !== 'pending') return;
            if (activeTab === 'past' && apptDate >= now) return;

            if (selectedDate && (
                apptDate.getFullYear() !== selectedDate.getFullYear() ||
                apptDate.getMonth() !== selectedDate.getMonth() ||
                apptDate.getDate() !== selectedDate.getDate()
            )) return;

            items.push({
                ...appt,
                itemType: 'appointment',
                sortDate: apptDate
            });
        });

        // 2. Process Calendar Events
        if (activeTab !== 'pending') {
            calendarEvents.forEach(evt => {
                const dateStr = evt.start_time || evt.event_date || evt.scheduled_at;
                if (!dateStr) return;
                const evtDate = new Date(dateStr);

                if (activeTab === 'upcoming' && evtDate < now) return;
                if (activeTab === 'past' && evtDate >= now) return;

                if (selectedDate && (
                    evtDate.getFullYear() !== selectedDate.getFullYear() ||
                    evtDate.getMonth() !== selectedDate.getMonth() ||
                    evtDate.getDate() !== selectedDate.getDate()
                )) return;

                items.push({
                    ...evt,
                    itemType: 'calendar_event',
                    sortDate: evtDate
                });
            });
        }

        items.sort((a, b) => {
            return activeTab === 'past' ? b.sortDate - a.sortDate : a.sortDate - b.sortDate;
        });

        setFilteredItems(items);
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

    const handleSaveEvent = async () => {
        if (!eventForm.title) return Alert.alert('Error', 'Title is required');

        const start = eventForm.start_time;
        const end = eventForm.end_time;

        setLoading(true);
        try {
            if (eventForm.id) {
                await calendarAPI.updateEvent(eventForm.id, {
                    title: eventForm.title,
                    description: eventForm.description,
                    start_time: start.toISOString(),
                    end_time: end.toISOString()
                });
                Alert.alert('Success', 'Event updated successfully');
            } else {
                await calendarAPI.createEvent({
                    title: eventForm.title,
                    description: eventForm.description,
                    start_time: start.toISOString(),
                    end_time: end.toISOString()
                });
                Alert.alert('Success', 'Event created successfully');
            }
            setShowEventModal(false);
            setEventForm({ id: null, title: '', description: '', start_time: getDefaultStartTime(), end_time: getDefaultEndTime() });
            loadAppointments();
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save event');
            setLoading(false);
        }
    };

    const handleDeleteEvent = (id) => {
        Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setLoading(true);
                    try {
                        await calendarAPI.deleteEvent(id);
                        loadAppointments();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete event');
                        setLoading(false);
                    }
                }
            }
        ]);
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

    const renderItem = (item) => {
        const isEvent = item.itemType === 'calendar_event';
        const accentColor = isEvent ? '#9C27B0' : COLORS.primary;
        const tagLabel = isEvent ? 'EVENT' : 'APPOINTMENT';

        const displayTime = new Date(item.sortDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const displayDate = new Date(item.sortDate).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

        const title = isEvent ? item.title : `Patient: ${item.patient_name || 'Unknown'}`;
        const description = isEvent ? item.description : item.reason;

        return (
            <View key={`${item.itemType}-${item.id}`} style={styles.sexyEventCard}>
                <View style={[styles.sexyCardSide, { backgroundColor: accentColor }]} />
                <View style={styles.sexyCardContent}>
                    <View style={styles.sexyCardHeader}>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <View style={[styles.sexyTimeBox, { backgroundColor: accentColor + '10' }]}>
                                <Ionicons name="calendar" size={12} color={accentColor} />
                                <Text style={[styles.sexyTimeText, { color: accentColor }]}>{displayDate}</Text>
                            </View>
                            <View style={[styles.sexyTimeBox, { backgroundColor: accentColor + '10' }]}>
                                <Ionicons name="time" size={12} color={accentColor} />
                                <Text style={[styles.sexyTimeText, { color: accentColor }]}>{displayTime}</Text>
                            </View>
                        </View>
                        <View style={[styles.sexyBadge, { backgroundColor: accentColor + '15' }]}>
                            <Text style={[styles.sexyBadgeText, { color: accentColor }]}>{tagLabel}</Text>
                        </View>
                    </View>

                    <Text style={styles.sexyTitle}>{title || 'Untitled'}</Text>

                    {description ? (
                        <Text style={styles.sexyDesc} numberOfLines={2}>{description}</Text>
                    ) : (
                        <Text style={[styles.sexyDesc, { color: '#BDBDBD', fontStyle: 'italic' }]}>No additional details</Text>
                    )}

                    <View style={styles.sexyFooter}>
                        {isEvent ? (
                            <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                                <TouchableOpacity style={[styles.sexyEditBtn, { backgroundColor: accentColor }]} onPress={() => {
                                    setEventForm({
                                        id: item.id,
                                        title: item.title,
                                        description: item.description,
                                        start_time: new Date(item.start_time || item.sortDate),
                                        end_time: new Date(item.end_time || item.sortDate)
                                    });
                                    setShowEventModal(true);
                                }}>
                                    <Ionicons name="create-outline" size={18} color="white" />
                                    <Text style={styles.sexyActionText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.sexyDeleteBtn} onPress={() => handleDeleteEvent(item.id)}>
                                    <Ionicons name="trash-outline" size={18} color="#FF5252" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', gap: 10, flex: 1, alignItems: 'center' }}>
                                {item.status === 'pending' ? (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.sexyEditBtn, { backgroundColor: '#4CAF50', flex: 1 }]}
                                            onPress={() => handleApprove(item.id)}
                                        >
                                            <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                                            <Text style={styles.sexyActionText}>Approve</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.sexyEditBtn, { backgroundColor: '#F44336', flex: 1 }]}
                                            onPress={() => handleDecline(item.id)}
                                        >
                                            <Ionicons name="close-circle-outline" size={18} color="white" />
                                            <Text style={styles.sexyActionText}>Decline</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : item.status === 'accepted' && item.start_url ? (
                                    <TouchableOpacity
                                        style={[styles.sexyEditBtn, { backgroundColor: COLORS.primary, flex: 1 }]}
                                        onPress={() => handleStartCall(item)}
                                    >
                                        <Ionicons name="videocam-outline" size={18} color="white" />
                                        <Text style={styles.sexyActionText}>Join Video Call</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={[styles.sexyBadge, { backgroundColor: getStatusStyle(item.status).backgroundColor, flex: 1, paddingVertical: 8 }]}>
                                        <Text style={[styles.sexyBadgeText, { textAlign: 'center' }]}>STATUS: {item.status.toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {item.doctor_notes && (
                        <Text style={[styles.sexyDesc, { marginTop: 10, fontSize: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 8 }]}>
                            <Text style={{ fontWeight: 'bold' }}>Notes: </Text>{item.doctor_notes}
                        </Text>
                    )}
                </View>
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
                        <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} style={styles.dateIconWrapper}>
                            <Ionicons name={viewMode === 'list' ? "calendar" : "list"} size={22} color={viewMode === 'calendar' ? COLORS.primary : "#666"} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onRefresh}>
                            <Ionicons name="refresh" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                            const baseDate = selectedDate || new Date();
                            const start = new Date(baseDate);
                            start.setHours(9, 0, 0, 0);
                            const end = new Date(baseDate);
                            end.setHours(10, 0, 0, 0);
                            setEventForm({ id: null, title: '', description: '', start_time: start, end_time: end });
                            setShowEventModal(true);
                        }}>
                            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
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

                {viewMode === 'calendar' ? (
                    <View style={{ flex: 1 }}>
                        <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 8, marginBottom: 15 }}>
                            <Calendar
                                onDayPress={(day) => {
                                    setSelectedDate(new Date(day.timestamp));
                                    // Removed setViewMode('list') so the calendar stays open
                                }}
                                markedDates={{
                                    ...Object.fromEntries(
                                        allAppointments.concat(calendarEvents).map(e => {
                                            const d = new Date(e.requested_date || e.appointment_date || e.scheduled_at || e.start_time || e.event_date);
                                            if (isNaN(d.getTime())) return [];
                                            const dateK = d.toISOString().split('T')[0];
                                            return [dateK, {
                                                selected: true,
                                                selectedColor: COLORS.primary + '20',
                                                selectedTextColor: COLORS.primary,
                                                marked: true,
                                                dotColor: COLORS.primary
                                            }];
                                        }).filter(x => x.length > 0)
                                    ),
                                    ...(selectedDate ? {
                                        [selectedDate.toISOString().split('T')[0]]: {
                                            selected: true,
                                            selectedColor: COLORS.primary,
                                            selectedTextColor: 'white'
                                        }
                                    } : {}),
                                }}
                                theme={{
                                    selectedDayBackgroundColor: COLORS.primary,
                                    selectedDayTextColor: '#ffffff',
                                    todayTextColor: COLORS.primary,
                                    arrowColor: COLORS.primary,
                                    calendarBackground: 'transparent',
                                    textDayFontWeight: '500',
                                    textMonthFontWeight: 'bold',
                                    textDayHeaderFontWeight: '600',
                                }}
                            />
                        </View>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                            }
                        >
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => renderItem(item))
                            ) : (
                                <View style={styles.emptyState}>
                                    <Ionicons name="calendar-outline" size={48} color="#DDD" />
                                    <Text style={styles.emptyText}>No events on this date</Text>
                                    <Text style={styles.emptySubtext}>
                                        Select another date or add a new event
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                    >
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => renderItem(item))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="calendar-outline" size={64} color="#DDD" />
                                <Text style={styles.emptyText}>No events or appointments</Text>
                                <Text style={styles.emptySubtext}>
                                    Events will appear here when scheduled
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}

            <Modal visible={showEventModal} animationType="fade" transparent={true} onRequestClose={() => setShowEventModal(false)}>
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{eventForm.id ? "Edit Event" : "New Event"}</Text>
                            <TouchableOpacity onPress={() => setShowEventModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Event Title</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Type title..."
                            value={eventForm.title}
                            onChangeText={(val) => setEventForm(prev => ({ ...prev, title: val }))}
                        />

                        <Text style={styles.inputLabel}>Description (Optional)</Text>
                        <TextInput
                            style={[styles.modalInput, styles.modalInputMulti]}
                            placeholder="Type description..."
                            multiline
                            numberOfLines={3}
                            value={eventForm.description}
                            onChangeText={(val) => setEventForm(prev => ({ ...prev, description: val }))}
                        />

                        <View style={{ marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <Text style={styles.inputLabel}>Event Schedule</Text>
                                <View style={{ backgroundColor: COLORS.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: 'bold' }}>
                                        {eventForm.start_time.toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.inputLabel, { fontSize: 11, marginBottom: 4 }]}>START TIME</Text>
                                    <TouchableOpacity
                                        style={styles.timePickerButton}
                                        onPress={() => setPickerConfig({ show: true, field: 'start', mode: 'time' })}
                                    >
                                        <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.timePickerText}>
                                            {eventForm.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.inputLabel, { fontSize: 11, marginBottom: 4 }]}>END TIME</Text>
                                    <TouchableOpacity
                                        style={styles.timePickerButton}
                                        onPress={() => setPickerConfig({ show: true, field: 'end', mode: 'time' })}
                                    >
                                        <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.timePickerText}>
                                            {eventForm.end_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {Platform.OS !== 'ios' && pickerConfig.show && (
                            <DateTimePicker
                                value={pickerConfig.field === 'start' ? eventForm.start_time : eventForm.end_time}
                                mode={pickerConfig.mode}
                                display="default"
                                onChange={(e, d) => {
                                    setPickerConfig(prev => ({ ...prev, show: false }));
                                    if (e.type === 'set' && d) {
                                        setEventForm(prev => {
                                            const targetField = pickerConfig.field === 'start' ? 'start_time' : 'end_time';
                                            const baseDate = prev[targetField];
                                            const mergedDate = new Date(baseDate);
                                            if (pickerConfig.mode === 'date') {
                                                mergedDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                                            } else {
                                                mergedDate.setHours(d.getHours(), d.getMinutes());
                                            }
                                            return { ...prev, [targetField]: mergedDate };
                                        });
                                    }
                                }}
                            />
                        )}

                        <TouchableOpacity style={styles.mainActionBtn} onPress={handleSaveEvent}>
                            <Text style={styles.mainActionBtnText}>Save Event</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: '100%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    inputLabel: { fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '600' },
    modalInput: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, marginBottom: 16, color: '#333' },
    modalInputMulti: { height: 80, textAlignVertical: 'top' },
    mainActionBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    mainActionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

    // Sexy Card Styles
    sexyEventCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        marginBottom: 20,
        flexDirection: 'row',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 6,
    },
    sexyCardSide: {
        width: 6,
        backgroundColor: COLORS.primary,
    },
    sexyCardContent: {
        flex: 1,
        padding: 20,
    },
    sexyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sexyTimeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '10',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 6,
    },
    sexyTimeText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.primary,
    },
    sexyBadge: {
        backgroundColor: '#673AB715',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    sexyBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#673AB7',
    },
    sexyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#263238',
        marginBottom: 8,
    },
    sexyDesc: {
        fontSize: 14,
        color: '#607D8B',
        lineHeight: 20,
        marginBottom: 20,
    },
    sexyFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sexyEditBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 8,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
    },
    sexyActionText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    sexyDeleteBtn: {
        backgroundColor: '#FFEBEE',
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F7FA',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: '#E1E8EE',
    },
    timePickerText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
});
