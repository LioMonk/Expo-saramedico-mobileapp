import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import { COLORS } from '../../constants/theme';
import { patientAPI, calendarAPI } from '../../services/api';
import ErrorHandler from '../../services/errorHandler';

const TEST_DOCTOR_BLACKLIST = [
  'soap tester',
  'sync test',
  'clinical flow',
  'test doctor',
  'medical specialist',
  'integration test',
  'notification tester'
];

const isBlacklisted = (name) => {
  if (!name) return false;
  const n = name.toLowerCase();
  return TEST_DOCTOR_BLACKLIST.some(black => n.includes(black));
};

export default function ScheduleScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // View & Filter State
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'appointments', 'events'

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
    loadAppointments();
  }, []);

  const loadAppointments = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);

    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 4, 0);

      const [appointmentsRes, eventsRes, consultationsRes, doctorsRes] = await Promise.all([
        patientAPI.getMyAppointments(),
        calendarAPI.getEvents({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }).catch(() => ({ data: [] })),
        patientAPI.getMyConsultations(50).catch(() => ({ data: [] })),
        patientAPI.getDoctors().catch(() => ({ data: [] }))
      ]);

      // Create map of doctor id -> name (matching website logic)
      const dMap = {};
      const directoryData = doctorsRes.data?.results || doctorsRes.data || [];
      const registerDoc = (d) => {
        if (!d.id) return;
        let name = (d.full_name || d.name || '').trim();

        // 1. Skip if it's a known test/garbage name
        if (isBlacklisted(name)) return;

        const lowerName = name.toLowerCase();

        // Check for encryption placeholders
        if (!name || lowerName === 'unknown doctor' || lowerName === 'encrypted' || name.startsWith('gAAAAA')) {
          if (d.email) {
            const prefix = d.email.split('@')[0];
            const cleanPrefix = prefix.split('.')[0].replace(/[0-9]/g, '');
            name = cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1);
          } else if (d.name && !isBlacklisted(d.name)) {
            name = d.name;
          } else {
            return; // Skip if no name and no email fallback
          }
        }

        if (!name.startsWith('Dr.')) name = `Dr. ${name}`;
        dMap[d.id] = name;
      };

      // 1. Register from directory
      if (Array.isArray(directoryData)) directoryData.forEach(registerDoc);

      // 2. Register from appointments themselves (Backend often provides decrypted names here)
      const rawAppts = appointmentsRes.data || [];
      if (Array.isArray(rawAppts)) {
        rawAppts.forEach(a => {
          if (a.doctor_id && a.doctor_name) {
            registerDoc({ id: a.doctor_id, name: a.doctor_name, email: a.doctor_email });
          }
        });
      }

      const rawConsults = consultationsRes.data?.consultations || consultationsRes.data || [];

      // Merge and enrich (matches website appointments/page.jsx)
      const enrichedAppts = Array.isArray(rawAppts) ? rawAppts.map(a => {
        let name = a.doctor_name || dMap[a.doctor_id] || "Doctor";
        if (name !== 'Doctor' && !name.startsWith('Dr.')) name = `Dr. ${name}`;

        return {
          ...a,
          itemType: 'appointment',
          is_consultation: false,
          doctor_name: name
        };
      }) : [];

      const enrichedConsults = Array.isArray(rawConsults) ? rawConsults.map(c => {
        let name = c.doctorName && c.doctorName !== "Unknown Doctor" ? c.doctorName : (dMap[c.doctorId] || "Doctor");
        if (name !== 'Doctor' && !name.startsWith('Dr.')) name = `Dr. ${name}`;

        return {
          ...c,
          id: c.id,
          itemType: 'appointment', // treat as appointment for list view
          is_consultation: true,
          doctor_name: name,
          requested_date: c.scheduledAt,
          status: c.status,
          meet_link: c.meetLink,
          reason: c.notes || "Instant meeting created by doctor"
        };
      }) : [];

      setAppointments([...enrichedAppts, ...enrichedConsults]);
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
    let items = [];

    // Process Appointments
    appointments.forEach(appt => {
      const date = new Date(appt.requested_date || appt.appointment_date || appt.scheduled_at);
      if (isNaN(date.getTime())) return;

      // Filter by tab
      if (activeTab === 'events') return;

      // Filter by date
      if (selectedDate && (
        date.getFullYear() !== selectedDate.getFullYear() ||
        date.getMonth() !== selectedDate.getMonth() ||
        date.getDate() !== selectedDate.getDate()
      )) return;

      items.push({
        ...appt,
        itemType: 'appointment',
        sortDate: date
      });
    });

    // Process Manual Events
    calendarEvents.forEach(evt => {
      if (evt.event_type === 'appointment' || evt.appointment_id) return;

      const date = new Date(evt.start_time || evt.event_date);
      if (isNaN(date.getTime())) return;

      // Filter by tab
      if (activeTab === 'appointments') return;

      // Filter by date
      if (selectedDate && (
        date.getFullYear() !== selectedDate.getFullYear() ||
        date.getMonth() !== selectedDate.getMonth() ||
        date.getDate() !== selectedDate.getDate()
      )) return;

      items.push({
        ...evt,
        itemType: 'calendar_event',
        sortDate: date
      });
    });

    // Sort: latest first (matches website parity)
    items.sort((a, b) => b.sortDate - a.sortDate);
    setFilteredItems(items);
  }, [appointments, calendarEvents, selectedDate, activeTab]);

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) return Alert.alert('Error', 'Title is required');

    setSaving(true);
    try {
      const payload = {
        title: eventForm.title,
        description: eventForm.description,
        start_time: eventForm.start_time.toISOString(),
        end_time: eventForm.end_time.toISOString(),
      };

      if (eventForm.id) {
        await calendarAPI.updateEvent(eventForm.id, payload);
        // We use a small timeout to let the modal close smoothly before showing success
        setTimeout(() => Alert.alert('Success', 'Event updated successfully'), 400);
      } else {
        await calendarAPI.createEvent(payload);
        setTimeout(() => Alert.alert('Success', 'Personal event created'), 400);
      }

      setShowEventModal(false);
      setEventForm({ id: null, title: '', description: '', start_time: new Date(), end_time: new Date(Date.now() + 3600000) });

      // Load appointments IN BACKGROUND (isRefreshing = true) to prevent full-screen spinner flicker
      loadAppointments(true);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save event. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = (id) => {
    Alert.alert('Delete Event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await calendarAPI.deleteEvent(id);
            loadAppointments();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete');
          }
        }
      }
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments(true);
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
      case 'scheduled':
      case 'active':
        return { backgroundColor: '#dcfce7', color: '#166534' }; // Website: #166534 on #dcfce7
      case 'completed':
        return { backgroundColor: '#e0f2fe', color: '#0369a1' }; // Website: #0369a1 on #e0f2fe
      case 'declined':
      case 'cancelled':
        return { backgroundColor: '#fee2e2', color: '#991b1b' }; // Website: #991b1b on #fee2e2
      case 'pending':
        return { backgroundColor: '#fef9c3', color: '#854d0e' }; // Website: #854d0e on #fef9c3
      default:
        return { backgroundColor: '#F5F5F5', color: '#666' };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Time';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderScheduleItem = (item) => {
    const isEvent = item.itemType === 'calendar_event';
    const accentColor = isEvent ? '#9C27B0' : COLORS.primary;
    const tagLabel = isEvent ? 'PERSONAL EVENT' : 'APPOINTMENT';

    const displayDate = formatDate(item.sortDate);
    const displayTime = formatTime(item.sortDate);

    return (
      <View key={`${item.itemType}-${item.id}`} style={styles.sexyCard}>
        <View style={[styles.sexySide, { backgroundColor: accentColor }]} />
        <View style={styles.sexyContent}>
          <View style={styles.sexyHeader}>
            <View style={[styles.sexyBadgesRow, { flex: 1, flexWrap: 'wrap' }]}>
              <View style={[styles.sexyBadge, { backgroundColor: accentColor + '10' }]}>
                <Ionicons name="calendar-outline" size={10} color={accentColor} />
                <Text style={[styles.sexyBadgeText, { color: accentColor }]}>{displayDate}</Text>
              </View>
              <View style={[styles.sexyBadge, { backgroundColor: accentColor + '10' }]}>
                <Ionicons name="time-outline" size={10} color={accentColor} />
                <Text style={[styles.sexyBadgeText, { color: accentColor }]}>{displayTime}</Text>
              </View>
            </View>
            <View style={[styles.typeBadge, {
              backgroundColor: isEvent ? '#9C27B015' : (item.is_consultation ? '#EFF6FF' : '#F8FAFC'),
              borderColor: isEvent ? '#9C27B030' : (item.is_consultation ? '#DBEAFE' : '#E2E8F0'),
              borderWidth: 1
            }]}>
              <Text style={[styles.typeBadgeText, { color: isEvent ? '#9C27B0' : (item.is_consultation ? '#3B82F6' : '#64748B') }]}>
                {isEvent ? 'PERSONAL EVENT' : (item.is_consultation ? 'INSTANT MEETING' : 'APPOINTMENT')}
              </Text>
            </View>
          </View>

          <Text style={styles.sexyTitle} numberOfLines={1} ellipsizeMode="tail">
            {isEvent ? item.title : (item.doctor_name || 'Doctor')}
          </Text>

          <Text style={styles.sexyDesc} numberOfLines={2} ellipsizeMode="tail">
            {isEvent ? item.description : item.reason || 'No reason provided'}
          </Text>

          <View style={styles.sexyFooter}>
            {isEvent ? (
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
              (item.status === 'accepted' || item.status === 'scheduled' || item.status === 'active') && (item.join_url || item.meet_link || item.meetLink) ? (
                <TouchableOpacity
                  style={[styles.joinButton, { backgroundColor: '#82c0ff' }]}
                  onPress={() => navigation.navigate('VideoCallScreen', {
                    appointment: { ...item, sortDate: item.sortDate ? item.sortDate.toISOString() : null },
                    consultationId: item.is_consultation ? item.id : null,
                    role: 'patient'
                  })}
                >
                  <Ionicons name="videocam" size={16} color="white" />
                  <Text style={styles.joinButtonText} numberOfLines={1}>Join Meeting</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.statusTag, { backgroundColor: getStatusStyle(item.status).backgroundColor }]}>
                  <Text style={[styles.statusTagText, { color: getStatusStyle(item.status).color }]}>
                    {item.status?.toUpperCase()}
                  </Text>
                </View>
              )
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Pre-calculate marked dates for calendar
  const markedDates = {};
  appointments.concat(calendarEvents).forEach(item => {
    const d = new Date(item.requested_date || item.appointment_date || item.start_time || item.scheduled_at);
    if (isNaN(d.getTime())) return;
    const dateStr = d.toISOString().split('T')[0];
    markedDates[dateStr] = {
      marked: true,
      dotColor: item.appointment_id || item.itemType === 'appointment' ? COLORS.primary : '#9C27B0'
    };
  });

  if (selectedDate) {
    const selectedStr = selectedDate.toISOString().split('T')[0];
    markedDates[selectedStr] = {
      ...markedDates[selectedStr],
      selected: true,
      selectedColor: COLORS.primary
    };
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingHorizontal: 8 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>Appointments</Text>
            <Text style={{ fontSize: 10, color: '#666' }} numberOfLines={1} ellipsizeMode="tail">Securely manage your visits.</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
              style={styles.headerIconBtn}
            >
              <Ionicons name={viewMode === 'list' ? "calendar" : "list"} size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Doctors')}
              style={styles.bookHeaderBtn}
            >
              <Ionicons name="calendar-outline" size={16} color="white" />
              <Text style={styles.bookHeaderText}>Book</Text>
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

        {/* View Mode Content */}
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
              style={styles.calendar}
            />
          </View>
        )}

        {/* Tabs */}
        <View style={{ marginTop: 8, height: 50 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'appointments' && styles.activeTab]}
              onPress={() => setActiveTab('appointments')}
            >
              <Text style={[styles.tabText, activeTab === 'appointments' && styles.activeTabText]}>Appointments</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'events' && styles.activeTab]}
              onPress={() => setActiveTab('events')}
            >
              <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Events</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* List */}
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredItems.length > 0 ? (
            filteredItems.map(renderScheduleItem)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#DDD" />
              <Text style={styles.emptyText}>Nothing scheduled</Text>
              <Text style={styles.emptySubtext}>
                {selectedDate
                  ? "No appointments or events for this date."
                  : "Your schedule is currently empty."}
              </Text>
              {!selectedDate && (
                <View style={styles.emptyActions}>
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => navigation.navigate('Doctors')}
                  >
                    <Text style={styles.bookButtonText}>Find Doctor</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* FAB for Personal Events - Only in 'All' or 'Events' tab */}
      {(activeTab === 'all' || activeTab === 'events') && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setEventForm({ id: null, title: '', description: '', start_time: new Date(), end_time: new Date(Date.now() + 3600000) });
            setShowEventModal(true);
          }}
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      )}

      <View style={{ height: 20 }} />

      {/* Event Creation Modal */}
      <Modal visible={showEventModal} animationType="slide" transparent={true} onRequestClose={() => setShowEventModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{eventForm.id ? 'Edit Personal Event' : 'New Personal Event'}</Text>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.inputLabel}>Event Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Take medicine, Personal checkup..."
                value={eventForm.title}
                onChangeText={(t) => setEventForm(p => ({ ...p, title: t }))}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Enter details here..."
                multiline
                numberOfLines={3}
                value={eventForm.description}
                onChangeText={(t) => setEventForm(p => ({ ...p, description: t }))}
              />

              <View style={styles.dateTimeContainer}>
                <View style={styles.dateTimeBlock}>
                  <Text style={styles.inputLabel}>DATE</Text>
                  <TouchableOpacity
                    style={styles.pickerToggle}
                    onPress={() => setPickerConfig({ show: true, field: 'start', mode: 'date' })}
                  >
                    <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.pickerValue}>{eventForm.start_time.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dateTimeBlock}>
                  <Text style={styles.inputLabel}>TIME</Text>
                  <TouchableOpacity
                    style={styles.pickerToggle}
                    onPress={() => setPickerConfig({ show: true, field: 'start', mode: 'time' })}
                  >
                    <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.pickerValue}>{eventForm.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSaveEvent}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Event</Text>
                )}
              </TouchableOpacity>
            </ScrollView>

            {pickerConfig.show && (
              <DateTimePicker
                value={eventForm[pickerConfig.field === 'start' ? 'start_time' : 'end_time']}
                mode={pickerConfig.mode}
                display="default"
                onChange={(e, d) => {
                  setPickerConfig({ ...pickerConfig, show: Platform.OS === 'ios' });
                  if (d) setEventForm(p => ({
                    ...p,
                    start_time: d,
                    end_time: new Date(d.getTime() + 3600000)
                  }));
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
  container: {
    flex: 1,
    backgroundColor: '#F9FAFC',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerIconBtn: {
    padding: 4,
  },
  bookHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  bookHeaderText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
  dateFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
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
  calendar: {
    paddingBottom: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
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
  sexySide: {
    width: 6,
  },
  sexyContent: {
    flex: 1,
    padding: 16,
  },
  sexyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sexyBadgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sexyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  sexyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  sexyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 4,
  },
  sexyDesc: {
    fontSize: 13,
    color: '#607D8B',
    lineHeight: 18,
    marginBottom: 16,
  },
  sexyFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  eventBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 10,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#9C27B0',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#9C27B0',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#F8F9FB',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#EAECEF',
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  dateTimeBlock: {
    flex: 1,
  },
  pickerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#EAECEF',
    gap: 10,
  },
  pickerValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 10,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#444',
  },
  emptySubtext: {
    marginTop: 10,
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 15,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});