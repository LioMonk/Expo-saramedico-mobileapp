import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Image,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { SvgUri } from 'react-native-svg';
import { patientAPI, authAPI, notificationAPI } from '../../services/api';
import moment from 'moment';

const { width } = Dimensions.get('window');

export default function PatientDashboard({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientAvatar, setPatientAvatar] = useState(null);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [recentVisits, setRecentVisits] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [vitals, setVitals] = useState({});

  useEffect(() => {
    loadDashboardData();

    // Refresh data when screen comes into focus (e.g., returning from Profile)
    const unsubscribe = navigation.addListener('focus', () => {
      loadDashboardData();
    });

    return unsubscribe;
  }, [navigation]);

  const loadDashboardData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

      const [profileRes, aptRes, doctorsRes] = await Promise.all([
        authAPI.getCurrentUser().catch(() => ({ data: { full_name: 'Patient' } })),
        patientAPI.getMyAppointments().catch(() => ({ data: [] })),
        patientAPI.getDoctors().catch(() => ({ data: { results: [] } }))
      ]);

      const doctorsList = doctorsRes.data?.results || doctorsRes.data || [];
      const doctorsMap = {};
      if (Array.isArray(doctorsList)) {
        doctorsList.forEach(d => {
          if (d.id) {
            let dName = d.name || d.full_name;
            // Filter out placeholder names from directory as well
            if (dName && (dName.toLowerCase() === 'encrypted' || dName.toLowerCase() === 'unknown doctor')) {
              dName = null;
            }
            if (dName) doctorsMap[d.id.toString()] = dName;
          }
        });
      }

      const fullName = profileRes.data?.name || profileRes.data?.full_name || 'Patient';
      setPatientName(fullName);
      setPatientAvatar(profileRes.data?.avatar_url || null);

      const appointments = aptRes.data || [];
      const now = new Date();

      const upcoming = appointments
        .map(apt => {
          // Enrich with doctor name from map if missing
          if (!apt.doctor_name || apt.doctor_name === "Unknown Doctor" || apt.doctor_name.toLowerCase() === 'encrypted') {
            if (doctorsMap[apt.doctor_id]) {
              apt.doctor_name = doctorsMap[apt.doctor_id];
            }
          }
          return {
            ...apt,
            sortDate: new Date(apt.appointment_date || apt.requested_date || apt.scheduled_at)
          };
        })
        .filter(apt => {
          if (isNaN(apt.sortDate.getTime())) return false;
          const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
          return apt.sortDate >= twoHoursAgo && (apt.status === 'accepted' || apt.status === 'pending');
        })
        .sort((a, b) => a.sortDate - b.sortDate);

      setNextAppointment(upcoming.length > 0 ? upcoming[0] : null);

      try {
        const consultationsRes = await patientAPI.getMyConsultations(10).catch(() => ({ data: [] }));
        const consultations = consultationsRes.data?.consultations || consultationsRes.data || [];

        const visits = Array.isArray(consultations) ? consultations.map(c => {
          if (!c.doctorName || c.doctorName === "Unknown Doctor" || c.doctorName.toLowerCase() === 'encrypted') {
            // 1. Try map
            if (doctorsMap[c.doctorId || c.doctor_id]) {
              c.doctorName = doctorsMap[c.doctorId || c.doctor_id];
            }
            // 2. Try matching with appointments
            else {
              let match = appointments.find(a => a.id === c.appointment_id);
              if (!match) {
                match = appointments.find(a =>
                  (a.doctor_id === (c.doctorId || c.doctor_id)) &&
                  moment(a.requested_date || a.scheduled_at).isSame(moment(c.scheduledAt), 'hour')
                );
              }
              if (match && (match.doctor_name || match.doctor?.full_name)) {
                c.doctorName = match.doctor_name || match.doctor?.full_name;
              }
            }
          }
          return c;
        }) : [];

        if (visits.length === 0) {
          const lastApts = appointments
            .filter(a => a.status === 'completed')
            .slice(0, 3)
            .map(a => ({
              ...a,
              doctorName: a.doctor_name || doctorsMap[a.doctor_id] || 'Doctor',
              scheduledAt: a.requested_date || a.scheduled_at,
              status: 'completed'
            }));
          setRecentVisits(lastApts);
        } else {
          setRecentVisits(visits);
        }
      } catch (err) {
        setRecentVisits([]);
      }

      try {
        const statsRes = await patientAPI.getHealthMetrics(profileRes.data?.id).catch(() => ({ data: [] }));
        const metrics = Array.isArray(statsRes.data) ? statsRes.data : [];
        const latest = {};
        metrics.forEach(m => {
          if (!latest[m.metric_type]) {
            latest[m.metric_type] = m;
          }
        });
        setVitals({
          heartRate: latest['heart_rate']?.value || null,
          bloodPressure: latest['blood_pressure']?.value || null,
          weight: latest['weight']?.value || null,
          temperature: latest['temperature']?.value || null,
          respiratoryRate: latest['respiratory_rate']?.value || null,
          oxygenSaturation: latest['spo2']?.value || latest['oxygen_saturation']?.value || null,
        });
      } catch (err) { }

      try {
        const notifRes = await notificationAPI.getNotifications({ is_read: false, limit: 10 });
        const unreadList = Array.isArray(notifRes.data) ? notifRes.data : [];
        setUnreadCount(unreadList.length);
      } catch (err) { }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatAMPM = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return 'N/A';
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ampm;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Modern Header Section */}
        <View style={styles.headerHero}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.openDrawer()}>
              <Ionicons name="apps" size={24} color="#1E293B" />
            </TouchableOpacity>
            <View style={styles.headerRightActions}>
              <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
                <Ionicons name="notifications-outline" size={24} color="#1E293B" />
                {unreadCount > 0 && <View style={styles.unreadDot} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <View style={styles.pfpWrapper}>
                  {patientAvatar ? (
                    patientAvatar.toLowerCase().includes('.svg') ? (
                      <View style={styles.pfp}>
                        <SvgUri
                          width="100%"
                          height="100%"
                          uri={patientAvatar}
                          onError={(e) => console.error('❌ [Dashboard] SVG failed:', patientAvatar)}
                        />
                      </View>
                    ) : (
                      <Image source={{ uri: patientAvatar }} style={styles.pfp} />
                    )
                  ) : (
                    <View style={[styles.pfp, styles.pfpPlaceholder]}>
                      <Text style={styles.pfpInitial}>{patientName.charAt(0)}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.welcomeTextGroup}>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.nameText}>{patientName.split(' ')[0]} 👋</Text>
            <Text style={styles.dateSubText}>{moment().format('dddd, MMMM D').toUpperCase()}</Text>
          </View>
        </View>

        {/* Appointment Card - High Gloss / Modern */}
        {nextAppointment && (
          <View style={styles.appointmentContainer}>
            <TouchableOpacity
              style={styles.aptGlassCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Appointments')}
            >
              <View style={styles.aptBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.aptStatusText}>UPCOMING</Text>
              </View>

              <View style={styles.aptMainRow}>
                <View style={styles.docAvatarBox}>
                  <Ionicons name="videocam" size={22} color="white" />
                </View>
                <View style={styles.aptInfo}>
                  <Text style={styles.aptDocName}>Dr. {nextAppointment.doctor_name || (nextAppointment.doctor?.full_name && nextAppointment.doctor.full_name !== "Unknown Doctor" ? nextAppointment.doctor.full_name : 'Doctor')}</Text>
                  <Text style={styles.aptType}>{nextAppointment.reason || 'Medical Consult'}</Text>
                  <View style={styles.aptTimeLabel}>
                    <Ionicons name="time" size={14} color="#CBD5E1" />
                    <Text style={styles.aptTimeText}>
                      Today • {formatAMPM(nextAppointment.sortDate)}
                    </Text>
                  </View>
                </View>
              </View>

              {(nextAppointment.status === 'accepted' || nextAppointment.status === 'scheduled' || nextAppointment.status === 'active') &&
                (nextAppointment.meet_link || nextAppointment.meetLink || nextAppointment.join_url || nextAppointment.meeting?.join_url || nextAppointment.id) && (
                  <TouchableOpacity
                    style={styles.joinButtonSlim}
                    onPress={() => navigation.navigate('VideoCallScreen', {
                      appointment: { ...nextAppointment, sortDate: nextAppointment.sortDate ? nextAppointment.sortDate.toISOString() : null },
                      role: 'patient'
                    })}
                  >
                    <Text style={styles.joinButtonText}>Join Consultation Room</Text>
                  </TouchableOpacity>
                )}
            </TouchableOpacity>
          </View>
        )}

        {/* Vitals Horizontal Strip - Compact & Sexy */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Track Your Vitals</Text>
          <TouchableOpacity onPress={() => navigation.navigate('HealthMetrics')}>
            <Text style={styles.historyLink}>Full History</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vitalsScroller}>
          {[
            { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', icon: 'heart', color: '#F43F5E', bg: '#FFF1F2' },
            { key: 'bloodPressure', label: 'Blood Pressure', unit: 'mmHg', icon: 'fitness', color: '#3B82F6', bg: '#EFF6FF' },
            { key: 'oxygenSaturation', label: 'SpO2', unit: '%', icon: 'water', color: '#06B6D4', bg: '#ECFEFF' },
            { key: 'temperature', label: 'Temperature', unit: '°C', icon: 'thermometer', color: '#F59E0B', bg: '#FFFBEB' },
            { key: 'weight', label: 'Weight', unit: 'kg', icon: 'barbell', color: '#10B981', bg: '#ECFDF5' },
            { key: 'respiratoryRate', label: 'Respiratory', unit: 'br/m', icon: 'cloud', color: '#8B5CF6', bg: '#F5F3FF' },
          ].map((v) => (
            <TouchableOpacity
              key={v.key}
              style={styles.statPill}
              onPress={() => navigation.navigate('HealthMetrics')}
            >
              <View style={[styles.pillIcon, { backgroundColor: v.bg }]}>
                <Ionicons name={v.icon} size={16} color={v.color} />
              </View>
              <View>
                <Text style={styles.pillValue}>{vitals[v.key] || '—'}<Text style={styles.pillUnit}> {v.unit}</Text></Text>
                <Text style={styles.pillLabel}>{v.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Action Grid - Compact & Colorful */}
        <View style={styles.quickActionBox}>
          <Text style={styles.sectionTitle}>Main Actions</Text>
          <View style={styles.actionGridRow}>
            {[
              { id: 'book', label: 'Book Visit', icon: 'calendar-clear', color: '#4F46E5', bg: '#EEF2FF', screen: 'Appointments' },
              { id: 'records', label: 'My Records', icon: 'document-attach', color: '#7C3AED', bg: '#F5F3FF', screen: 'Medical Records' },
              { id: 'faq', label: 'Help Center', icon: 'help-buoy', color: '#475569', bg: '#F8FAFC', screen: 'FAQScreen' }
            ].map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionItem}
                onPress={() => navigation.navigate(action.screen)}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={styles.actionItemText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity - Minimalist List */}
        <View style={styles.recentView}>
          <Text style={styles.sectionTitle}>Recent Encounters</Text>
          <View style={styles.timelineBox}>
            {recentVisits.length > 0 ? (
              recentVisits.slice(0, 3).map((visit, index) => (
                <TouchableOpacity
                  key={visit.id || index}
                  style={styles.timelineRow}
                  onPress={() => navigation.navigate('Medical Records')}
                >
                  <View style={styles.timelineIcon}>
                    <Ionicons name="medical" size={16} color={COLORS.primary} />
                  </View>
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineDoc}>
                      {(() => {
                        let name = (visit.doctorName && !visit.doctorName.toLowerCase().includes('unknown') && !visit.doctorName.toLowerCase().includes('encrypted'))
                          ? visit.doctorName
                          : (visit.doctor_name || 'Doctor');
                        return name.startsWith('Dr. ') ? name : `Dr. ${name}`;
                      })()}
                    </Text>
                    <Text style={styles.timelineReason} numberOfLines={1}>{visit.diagnosis || visit.reason || 'Routine Checkup'}</Text>
                  </View>
                  <Text style={styles.timelineDate}>
                    {visit.scheduledAt ? moment(visit.scheduledAt).format('MMM D') : 'Recent'}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noEncounters}>No recent medical activity found.</Text>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFCFE' },
  loadingWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { paddingBottom: 60 },

  // Header Hero
  headerHero: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  notifBtn: { position: 'relative', padding: 4 },
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F43F5E',
    borderWidth: 1.5,
    borderColor: 'white'
  },
  pfpWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0'
  },
  pfp: { width: '100%', height: '100%' },
  pfpPlaceholder: {
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  pfpInitial: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  welcomeTextGroup: { marginTop: 4 },
  greetingText: { fontSize: 13, color: '#64748B', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  nameText: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  dateSubText: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginTop: 6, letterSpacing: 0.2 },

  // Appointment Container
  appointmentContainer: { paddingHorizontal: 20, marginBottom: 28 },
  aptGlassCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  aptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16
  },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  aptStatusText: { color: '#10B981', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  aptMainRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  docAvatarBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  aptInfo: { flex: 1 },
  aptDocName: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  aptType: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  aptTimeLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  aptTimeText: { fontSize: 13, color: '#CBD5E1', fontWeight: '600' },

  joinButtonSlim: {
    backgroundColor: '#3B82F6',
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center'
  },
  joinButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  // Section Headers
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 12
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  historyLink: { fontSize: 12, color: '#4F46E5', fontWeight: '700' },

  // Vitals Scroller
  vitalsScroller: { paddingLeft: 24, paddingRight: 8, gap: 12, paddingBottom: 10 },
  statPill: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 12,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  pillIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pillValue: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  pillUnit: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },
  pillLabel: { fontSize: 10, color: '#64748B', fontWeight: '500', marginTop: 1 },

  // Quick Action Box
  quickActionBox: { paddingHorizontal: 24, marginTop: 24 },
  actionGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12
  },
  actionItem: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionItemText: { fontSize: 11, fontWeight: '700', color: '#334155', textAlign: 'center' },

  // Recent Encounters
  recentView: { paddingHorizontal: 24, marginTop: 30 },
  timelineBox: {
    marginTop: 12,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  timelineBody: { flex: 1 },
  timelineDoc: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  timelineReason: { fontSize: 12, color: '#64748B', marginTop: 1 },
  timelineDate: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  noEncounters: { textAlign: 'center', padding: 20, color: '#94A3B8', fontSize: 13, fontStyle: 'italic' }
});