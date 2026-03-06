import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
    ActivityIndicator, RefreshControl, Platform, Modal, TextInput, KeyboardAvoidingView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { calendarAPI, teamAPI, patientAPI } from '../../services/api';
import ErrorHandler from '../../services/errorHandler';

/**
 * HospitalAppointmentsScreen
 * Modernized version matching Doctor and Patient panels
 * Features both List and Calendar views for Organization-wide schedule
 */
export default function HospitalAppointmentsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'appointments', 'events'
    const [selectedDate, setSelectedDate] = useState(null);

    const [allEvents, setAllEvents] = useState([]);
    const [hospitalStaffIds, setHospitalStaffIds] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);

    // Event Modal State
    const [showEventModal, setShowEventModal] = useState(false);
    const [eventForm, setEventForm] = useState({
        id: null,
        title: '',
        description: '',
        start_time: new Date(),
        end_time: new Date(Date.now() + 3600000)
    });
    const [pickerConfig, setPickerConfig] = useState({ show: false, field: 'start', mode: 'date' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            // 1. Fetch Staff (decrypted names for Doctors/Admins)
            const staffRes = await teamAPI.getTeamMembers();
            const staff = staffRes.data || [];
            const staffMap = {};
            const hospIds = staff
                .filter(s => {
                    const r = s.role?.toLowerCase() || '';
                    staffMap[s.id] = s.name; // Keep name mapping
                    return r.includes('hospital') || r.includes('admin');
                })
                .map(s => s.id);
            setHospitalStaffIds(hospIds);

            // 2. Fetch Patients (decrypted names)
            // Fetch top 100 recent patients to resolve names in current schedule
            let patientMap = {};
            try {
                const patRes = await patientAPI.listPatients({ limit: 100 });
                const pats = patRes.data?.items || patRes.data?.patients || [];
                pats.forEach(p => {
                    patientMap[p.id] = p.full_name || p.name || 'Patient';
                });
            } catch (e) { console.warn('Could not fetch patient list for name mapping'); }

            // 3. Fetch Events for a wide range
            const now = new Date();
            const startStr = new Date(now.getFullYear(), 0, 1).toISOString();
            const endStr = new Date(now.getFullYear(), 11, 31).toISOString();

            const response = await calendarAPI.getOrgEvents(startStr, endStr);
            const eventsArr = response.data || [];

            // 4. Transform, Deduplicate and Filter
            // For appointments, we group events by ID to combine Doctor+Patient names
            const apptGroups = {};
            const finalNormalized = [];

            eventsArr.forEach(ev => {
                const isAppointment = ev.event_type === 'appointment' || ev.appointment_id;

                if (isAppointment) {
                    const aid = ev.appointment_id;
                    if (!apptGroups[aid]) {
                        apptGroups[aid] = {
                            ...ev,
                            foundDoctor: null,
                            foundPatient: null,
                            itemType: 'appointment',
                            sortDate: new Date(ev.start_time)
                        };
                    }
                    // Try to identify doctor/patient
                    if (staffMap[ev.user_id]) apptGroups[aid].foundDoctor = staffMap[ev.user_id];
                    else if (patientMap[ev.user_id]) apptGroups[aid].foundPatient = patientMap[ev.user_id];
                } else if (ev.event_type === 'custom' && hospIds.includes(ev.user_id)) {
                    finalNormalized.push({
                        ...ev,
                        sortDate: new Date(ev.start_time),
                        itemType: 'calendar_event',
                    });
                }
            });

            // Reconstruct appointment titles for readability
            Object.values(apptGroups).forEach(appt => {
                let cleanTitle = appt.title || 'Appointment';
                if (appt.foundDoctor && appt.foundPatient) {
                    cleanTitle = `Dr. ${appt.foundDoctor} with ${appt.foundPatient}`;
                } else if (appt.foundDoctor) {
                    cleanTitle = `Dr. ${appt.foundDoctor}'s Appointment`;
                } else if (appt.foundPatient) {
                    cleanTitle = `Appointment with ${appt.foundPatient}`;
                }
                appt.title = cleanTitle;
                finalNormalized.push(appt);
            });

            setAllEvents(finalNormalized);
        } catch (error) {
            console.error('Failed to load org schedule:', error);
            if (!isRefreshing) ErrorHandler.handleError(error);
        } finally {
            setLoading(false);
            if (isRefreshing) setRefreshing(false);
        }
    };

    const applyFilters = useCallback(() => {
        let items = allEvents.filter(ev => {
            // Tab filtering
            if (activeTab === 'appointments' && ev.itemType !== 'appointment') return false;
            if (activeTab === 'events' && ev.itemType !== 'calendar_event') return false;

            // Date filtering (if selected)
            if (selectedDate) {
                const evDate = new Date(ev.start_time);
                return (
                    evDate.getFullYear() === selectedDate.getFullYear() &&
                    evDate.getMonth() === selectedDate.getMonth() &&
                    evDate.getDate() === selectedDate.getDate()
                );
            }

            return true;
        });

        items.sort((a, b) => a.sortDate - b.sortDate);
        setFilteredItems(items);
    }, [allEvents, activeTab, selectedDate]);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData(true);
    };

    const handleSaveEvent = async () => {
        if (!eventForm.title.trim()) return Alert.alert('Error', 'Title is required');

        setLoading(true);
        try {
            const payload = {
                title: eventForm.title,
                description: eventForm.description,
                start_time: eventForm.start_time.toISOString(),
                end_time: eventForm.end_time.toISOString(),
            };

            if (eventForm.id) {
                await calendarAPI.updateEvent(eventForm.id, payload);
                Alert.alert('Success', 'Event updated successfully');
            } else {
                await calendarAPI.createEvent(payload);
                Alert.alert('Success', 'Organizational event created');
            }
            setShowEventModal(false);
            setEventForm({ id: null, title: '', description: '', start_time: new Date(), end_time: new Date(Date.now() + 3600000) });
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to save event');
        } finally {
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
                        loadData();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete event');
                        setLoading(false);
                    }
                }
            }
        ]);
    };

    const renderItem = (item) => {
        const isAppointment = item.itemType === 'appointment';
        const accentColor = isAppointment ? COLORS.primary : '#9C27B0';
        const tagLabel = isAppointment ? 'APPOINTMENT' : 'EVENT';

        const displayTime = item.sortDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const displayDate = item.sortDate.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

        return (
            <View key={`${item.itemType}-${item.id}`} style={styles.sexyCard}>
                <View style={[styles.sexySide, { backgroundColor: accentColor }]} />
                <View style={styles.sexyContent}>
                    <View style={styles.sexyHeader}>
                        <View style={styles.sexyBadgesRow}>
                            <View style={[styles.sexyBadge, { backgroundColor: accentColor + '10' }]}>
                                <Ionicons name="calendar-outline" size={12} color={accentColor} />
                                <Text style={[styles.sexyBadgeText, { color: accentColor }]}>{displayDate}</Text>
                            </View>
                            <View style={[styles.sexyBadge, { backgroundColor: accentColor + '10' }]}>
                                <Ionicons name="time-outline" size={12} color={accentColor} />
                                <Text style={[styles.sexyBadgeText, { color: accentColor }]}>{displayTime}</Text>
                            </View>
                        </View>
                        <View style={[styles.typeBadge, { backgroundColor: accentColor + '15' }]}>
                            <Text style={[styles.typeBadgeText, { color: accentColor }]}>{tagLabel}</Text>
                        </View>
                    </View>

                    <Text style={styles.sexyTitle}>{item.title || 'Untitled'}</Text>
                    {item.description ? (
                        <Text style={styles.sexyDesc} numberOfLines={2}>{item.description}</Text>
                    ) : null}

                    <View style={styles.sexyFooter}>
                        {!isAppointment ? (
                            <View style={styles.eventActions}>
                                <TouchableOpacity style={[styles.eventBtn, { backgroundColor: accentColor }]} onPress={() => {
                                    setEventForm({
                                        id: item.id,
                                        title: item.title,
                                        description: item.description,
                                        start_time: new Date(item.start_time),
                                        end_time: new Date(item.end_time)
                                    });
                                    setShowEventModal(true);
                                }}>
                                    <Ionicons name="pencil" size={14} color="white" />
                                    <Text style={styles.eventBtnText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteEvent(item.id)}>
                                    <Ionicons name="trash-outline" size={16} color="#FF5252" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={[styles.statusTag, { backgroundColor: accentColor + '15' }]}>
                                <Text style={[styles.statusTagText, { color: accentColor }]}>
                                    {(item.metadata?.appointment_status || 'SCHEDULED').toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading organization schedule...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Pre-calculate marked dates for calendar
    const markedDates = {};
    allEvents.forEach(item => {
        const dateStr = item.sortDate.toISOString().split('T')[0];
        markedDates[dateStr] = {
            marked: true,
            dotColor: item.itemType === 'appointment' ? COLORS.primary : '#9C27B0'
        };
    });
    if (selectedDate) {
        const selectedStr = selectedDate.toISOString().split('T')[0];
        markedDates[selectedStr] = { ...markedDates[selectedStr], selected: true, selectedColor: COLORS.primary };
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Calendar & Appointments</Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} style={styles.headerIconBtn}>
                            <Ionicons name={viewMode === 'list' ? "calendar" : "list"} size={22} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                            setEventForm({ id: null, title: '', description: '', start_time: new Date(), end_time: new Date(Date.now() + 3600000) });
                            setShowEventModal(true);
                        }} style={styles.addBtn}>
                            <Ionicons name="add" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Date Filter Indicator */}
                {selectedDate && (
                    <View style={styles.dateFilterChip}>
                        <Text style={styles.dateFilterText}>
                            Viewing: {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedDate(null)}>
                            <Ionicons name="close-circle" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Calendar View */}
                {viewMode === 'calendar' && (
                    <View style={styles.calendarContainer}>
                        <Calendar
                            onDayPress={(day) => setSelectedDate(new Date(day.timestamp))}
                            markedDates={markedDates}
                            theme={{
                                selectedDayBackgroundColor: COLORS.primary,
                                todayTextColor: COLORS.primary,
                                arrowColor: COLORS.primary,
                                dotColor: COLORS.primary,
                                textDayFontWeight: '500',
                                textMonthFontWeight: 'bold',
                                textDayHeaderFontWeight: '600',
                                calendarBackground: 'white',
                            }}
                        />
                    </View>
                )}

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    {['all', 'appointments', 'events'].map(tab => (
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
                </View>

                {/* List Content */}
                <ScrollView
                    style={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {filteredItems.length > 0 ? (
                        filteredItems.map(renderItem)
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={64} color="#DDD" />
                            <Text style={styles.emptyText}>Nothing scheduled</Text>
                            <Text style={styles.emptySubtext}>No activities found for this selection.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* Event Modal */}
            <Modal visible={showEventModal} animationType="slide" transparent onRequestClose={() => setShowEventModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{eventForm.id ? 'Edit Event' : 'New Org Event'}</Text>
                            <TouchableOpacity onPress={() => setShowEventModal(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <Text style={styles.inputLabel}>Event Title</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Hospital meeting, staff training..."
                                value={eventForm.title}
                                onChangeText={(t) => setEventForm(p => ({ ...p, title: t }))}
                            />

                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.modalInput, styles.textArea]}
                                placeholder="Enter details..."
                                multiline
                                numberOfLines={3}
                                value={eventForm.description}
                                onChangeText={(t) => setEventForm(p => ({ ...p, description: t }))}
                            />

                            <View style={styles.dateTimeContainer}>
                                <View style={styles.dateTimeBlock}>
                                    <Text style={styles.inputLabel}>DATE</Text>
                                    <TouchableOpacity style={styles.pickerToggle} onPress={() => setPickerConfig({ show: true, field: 'start', mode: 'date' })}>
                                        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.pickerValue}>{eventForm.start_time.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.dateTimeBlock}>
                                    <Text style={styles.inputLabel}>TIME</Text>
                                    <TouchableOpacity style={styles.pickerToggle} onPress={() => setPickerConfig({ show: true, field: 'start', mode: 'time' })}>
                                        <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.pickerValue}>{eventForm.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEvent}>
                                <Text style={styles.saveBtnText}>Save Event</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {pickerConfig.show && (
                            <DateTimePicker
                                value={eventForm.start_time}
                                mode={pickerConfig.mode}
                                display="default"
                                onChange={(e, d) => {
                                    setPickerConfig({ ...pickerConfig, show: Platform.OS === 'ios' });
                                    if (d) setEventForm(p => ({ ...p, start_time: d, end_time: new Date(d.getTime() + 3600000) }));
                                }}
                            />
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9FAFC' },
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerIconBtn: { padding: 4 },
    addBtn: {
        backgroundColor: COLORS.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    dateFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '15',
        margin: 16,
        marginBottom: 0,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 10,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    dateFilterText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
    calendarContainer: {
        backgroundColor: 'white',
        margin: 16,
        marginBottom: 0,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 16,
        gap: 10,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    activeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
    activeTabText: { color: 'white' },
    scrollContainer: { flex: 1, padding: 16 },
    sexyCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        marginBottom: 16,
        flexDirection: 'row',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    sexySide: { width: 6 },
    sexyContent: { flex: 1, padding: 16 },
    sexyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sexyBadgesRow: { flexDirection: 'row', gap: 6 },
    sexyBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    sexyBadgeText: { fontSize: 11, fontWeight: '700' },
    typeBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
    typeBadgeText: { fontSize: 9, fontWeight: 'bold' },
    sexyTitle: { fontSize: 17, fontWeight: 'bold', color: '#263238', marginBottom: 4 },
    sexyDesc: { fontSize: 13, color: '#607D8B', lineHeight: 18, marginBottom: 16 },
    sexyFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
    eventActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    eventBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 6 },
    eventBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
    deleteBtn: { backgroundColor: '#FFEBEE', padding: 8, borderRadius: 10 },
    statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusTagText: { fontSize: 11, fontWeight: 'bold' },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#666' },
    emptySubtext: { marginTop: 8, fontSize: 14, color: '#999' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    modalContent: { padding: 20 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#37474F', marginBottom: 8, marginTop: 12 },
    modalInput: { backgroundColor: '#F5F7FA', borderRadius: 12, padding: 15, fontSize: 15, color: '#333' },
    textArea: { height: 100, textAlignVertical: 'top' },
    dateTimeContainer: { flexDirection: 'row', gap: 12, marginTop: 10 },
    dateTimeBlock: { flex: 1 },
    pickerToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', padding: 12, borderRadius: 12, gap: 8 },
    pickerValue: { fontSize: 14, color: '#333' },
    saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 30 },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

