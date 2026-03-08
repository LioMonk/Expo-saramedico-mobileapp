import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Calendar,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import AdminBottomNavBar from '../../components/AdminBottomNavBar';

// --- MOCK DATA (Same structure as Patient Schedule) ---
const DATES = [
  { day: 'Mon', date: '12' },
  { day: 'Tue', date: '13' },
  { day: 'Wed', date: '14' },
  { day: 'Thu', date: '15' },
  { day: 'Fri', date: '16' },
  { day: 'Sat', date: '17' },
];

const APPOINTMENTS_DB = {
  '12': [
    {
      id: 'a1', time: '09:00', ampm: 'AM', duration: '30 min',
      doctor: 'Dr. Emily Chen', type: 'General Checkup',
      status: 'CONFIRMED', statusColor: '#E3F2FD', statusText: '#2196F3',
      img: 'https://i.pravatar.cc/100?img=5'
    }
  ],
  '13': [
    {
      id: 'b1', time: '14:00', ampm: 'PM', duration: '45 min',
      doctor: 'Dr. John Smith', type: 'Dental Cleaning',
      status: 'PENDING', statusColor: '#FFF3E0', statusText: '#FF9800',
      img: 'https://i.pravatar.cc/100?img=11'
    }
  ],
  '14': [
    {
      id: 'c1', time: '09:00', ampm: 'AM', duration: '54 min',
      doctor: 'Sarah Jenkins', type: 'General Consultation',
      status: 'CONFIRMED', statusColor: '#E3F2FD', statusText: '#2196F3',
      img: 'https://i.pravatar.cc/100?img=12'
    },
    {
      id: 'c2', time: '10:00', ampm: 'AM', duration: '54 min',
      doctor: 'Michael Ross', type: 'Post-Op Follow-Up',
      status: 'CHECKED-IN', statusColor: '#E8F5E9', statusText: '#2E7D32',
      img: 'https://i.pravatar.cc/100?img=33'
    },
    {
      id: 'c3', time: '11:30', ampm: 'AM', duration: '54 min',
      doctor: 'Rosevelt de Francis', type: 'Radiology Review',
      status: 'CHECKED-IN', statusColor: '#FFF8E1', statusText: '#F9A825',
      img: 'https://i.pravatar.cc/100?img=14'
    }
  ]
};

export default function AdminScheduleScreen({ navigation }) {
  // State for selected date (default 14th)
  const [selectedDate, setSelectedDate] = useState('14');

  // Get data for selected date
  const currentAppointments = APPOINTMENTS_DB[selectedDate] || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Date Selector Strip */}
        <View style={styles.calendarStrip}>
          {DATES.map((item, i) => {
            const isActive = item.date === selectedDate;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.dateBox, isActive && styles.activeDateBox]}
                onPress={() => setSelectedDate(item.date)}
              >
                <Text style={[styles.dateText, isActive && styles.activeDateText]}>{item.day}</Text>
                <Text style={[styles.dateNum, isActive && styles.activeDateText]}>{item.date}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Scrollable Appointment List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
        >
          {currentAppointments.length > 0 ? (
            currentAppointments.map((appt, index) => (
              <View key={appt.id}>
                {/* Logic for "Current Time" line (Demo purpose) */}
                {selectedDate === '14' && index === 2 && (
                  <View style={styles.currentTimeRow}>
                    <Text style={styles.currentTimeText}>11:35</Text>
                    <View style={styles.dot} />
                    <View style={styles.line} />
                  </View>
                )}

                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>{appt.time}{'\n'}{appt.ampm}</Text>
                  <View style={styles.timelineLine} />
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Image source={{ uri: appt.img }} style={styles.avatar} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.docName} numberOfLines={1} ellipsizeMode="tail">{appt.doctor}</Text>
                        <Text style={styles.docType} numberOfLines={1} ellipsizeMode="tail">{appt.type}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: appt.statusColor }]}>
                        <Text style={[styles.statusText, { color: appt.statusText }]} numberOfLines={1}>{appt.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.duration}>{appt.duration}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#DDD" />
              <Text style={styles.emptyText}>No appointments for this date</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <AdminBottomNavBar navigation={navigation} activeTab="Appointments" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFC' },
  contentContainer: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },

  calendarStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dateBox: { alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: 'white', minWidth: 50 },
  activeDateBox: { backgroundColor: COLORS.primary },
  dateText: { fontSize: 12, color: '#666', marginBottom: 4 },
  dateNum: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  activeDateText: { color: 'white' },

  timeRow: { flexDirection: 'row', marginBottom: 20 },
  timeLabel: { width: 50, fontSize: 12, color: '#999', textAlign: 'center', marginTop: 10 },
  timelineLine: { width: 1, backgroundColor: '#DDD', marginHorizontal: 10 },
  card: { flex: 1, backgroundColor: 'white', borderRadius: 15, padding: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  docName: { fontWeight: 'bold', fontSize: 14 },
  docType: { color: '#666', fontSize: 12 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  duration: { fontSize: 12, color: '#999', marginTop: 5 },

  currentTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  currentTimeText: { width: 50, fontSize: 12, color: COLORS.primary, fontWeight: 'bold', textAlign: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginLeft: 6 },
  line: { flex: 1, height: 1, backgroundColor: COLORS.primary },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 10, color: '#999' },
});