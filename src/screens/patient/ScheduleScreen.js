import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import BottomNavBar from '../../components/BottomNavBar';
import { patientAPI } from '../../services/api';
import ErrorHandler from '../../services/errorHandler';

export default function ScheduleScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);

    try {
      const response = await patientAPI.getMyAppointments();
      const allAppointments = response.data || [];

      // Filter out past accepted appointments
      const now = new Date();
      const filteredAppointments = allAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.requested_date);

        // Keep all pending and declined appointments (for history)
        if (appointment.status !== 'accepted') {
          return true;
        }

        // For accepted appointments, only show current or future ones
        return appointmentDate >= now;
      });

      setAppointments(filteredAppointments);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments(true);
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return { backgroundColor: '#E3F2FD', color: '#2196F3' };
      case 'pending':
        return { backgroundColor: '#FFF3E0', color: '#FF9800' };
      case 'declined':
        return { backgroundColor: '#FFEBEE', color: '#F44336' };
      default:
        return { backgroundColor: '#F5F5F5', color: '#666' };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
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
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Schedule</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('DoctorSearch')}
            style={styles.headerAddBtn}
          >
            <Ionicons name="add-circle" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Appointments List */}
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {appointments.length > 0 ? (
            appointments.map((appt) => {
              const statusStyle = getStatusStyle(appt.status);
              return (
                <TouchableOpacity
                  key={appt.id}
                  style={styles.appointmentCard}
                  onPress={() => navigation.navigate('AppointmentDetail', { appointment: appt })}
                >
                  {/* Date Header */}
                  <View style={styles.dateHeader}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.dateText}>
                      {formatDate(appt.requested_date)}
                    </Text>
                  </View>

                  {/* Appointment Details */}
                  <View style={styles.appointmentContent}>
                    <View style={styles.timeSection}>
                      <Text style={styles.timeText}>
                        {formatTime(appt.requested_date)}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusStyle.backgroundColor },
                        ]}
                      >
                        <Text
                          style={[styles.statusText, { color: statusStyle.color }]}
                        >
                          {appt.status?.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.doctorSection}>
                      <Image
                        source={{
                          uri: appt.doctor_photo_url ||
                            'https://ui-avatars.com/api/?name=Doctor&background=random',
                        }}
                        style={styles.doctorImage}
                      />
                      <View style={styles.doctorInfo}>
                        <Text style={styles.doctorName}>
                          {appt.doctor_name || 'Doctor'}
                        </Text>
                        <Text style={styles.reasonText}>
                          {appt.reason || 'Consultation'}
                        </Text>
                      </View>
                    </View>

                    {/* Join Call Button (only for accepted appointments) */}
                    {appt.status === 'accepted' && appt.join_url && (
                      <TouchableOpacity
                        style={styles.joinButton}
                        onPress={() => {
                          navigation.navigate('VideoCallScreen', {
                            appointment: appt,
                            role: 'patient',
                          });
                        }}
                      >
                        <Ionicons name="videocam" size={20} color="white" />
                        <Text style={styles.joinButtonText}>Join Video Call</Text>
                      </TouchableOpacity>
                    )}

                    {/* Meeting Info (if available) */}
                    {appt.meeting_password && (
                      <View style={styles.meetingInfo}>
                        <Text style={styles.meetingLabel}>Meeting Password:</Text>
                        <Text style={styles.meetingValue}>
                          {appt.meeting_password}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#DDD" />
              <Text style={styles.emptyText}>No appointments scheduled</Text>
              <Text style={styles.emptySubtext}>
                Schedule an appointment with a doctor to get started
              </Text>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => navigation.navigate('DoctorSearch')}
              >
                <Text style={styles.bookButtonText}>Book New Schedule</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      <BottomNavBar navigation={navigation} activeRoute="Schedule" />
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
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerAddBtn: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F7FA',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  appointmentContent: {
    padding: 16,
  },
  timeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  doctorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  doctorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  meetingInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
  },
  meetingLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  meetingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
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
  },
  bookButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});