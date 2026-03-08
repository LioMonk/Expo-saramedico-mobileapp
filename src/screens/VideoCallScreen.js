import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import zoomService from '../services/zoomService';
import { getUserData, consultationAPI } from '../services/api';

/**
 * VideoCallScreen - Embedded Zoom video call
 * 
 * Doctor Flow: Auto-join with account credentials
 * Patient Flow: Enter name → join as participant
 */
export default function VideoCallScreen({ route, navigation }) {
  const { appointment, role } = route?.params || {}; // appointment contains meeting details

  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  const [showSoapNote, setShowSoapNote] = useState(false);
  const [soapNoteText, setSoapNoteText] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await getUserData();
      setUserData(data);

      if (data) {
        let name = '';
        if (data.role === 'doctor') {
          name = data.name || data.full_name ||
            (data.first_name ? `Dr. ${data.first_name} ${data.last_name || ''}` : 'Doctor');
        } else {
          name = data.full_name || data.name ||
            (data.first_name ? `${data.first_name} ${data.last_name || ''}` : 'Patient');
        }

        // Final safety check against stringified undefined
        if (name.includes('undefined')) {
          name = data.full_name || data.name || (data.role === 'doctor' ? 'Doctor' : 'Patient');
        }

        setUserName(name.trim());
      }
    } catch (error) {
      console.error('Error loading user data for video call:', error);
    }
  };

  /**
   * Extract meeting number from Zoom URL or use meeting_id
   */
  const getMeetingNumber = () => {
    if (appointment.meeting_id) {
      return appointment.meeting_id;
    }

    // Extract from join_url if needed
    // Example: https://zoom.us/j/1234567890?pwd=xxx
    const match = (appointment.join_url || appointment.start_url)?.match(/\/j\/(\d+)/);
    return match ? match[1] : null;
  };

  /**
   * Helper to identify if it's a Google Meet link
   */
  const getMeetUrl = () => {
    // Aggressively check for anything that looks like a URL in common fields
    const candidates = [
      appointment.meetLink,
      appointment.meet_link,
      appointment.google_meet_link,
      appointment.joinLink,
      appointment.meeting?.start_url,
      appointment.meeting?.join_url,
      appointment.meeting?.google_meet_link,
      appointment.consultation?.meetLink,
      appointment.consultation?.google_meet_link,
      appointment.start_url,
      appointment.join_url,
      appointment.link
    ];

    // Return first non-null string that starts with http
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.toLowerCase().startsWith('http')) {
        return c;
      }
    }

    return null;
  };

  /**
   * Handle joining the meeting
   */
  const handleJoinMeeting = async () => {
    if (!userName.trim()) {
      Alert.alert('Name Required', 'Please enter your name to join the meeting');
      return;
    }

    setLoading(true);

    try {
      // Check if the backend provided a Google Meet link
      const meetUrl = getMeetUrl();

      // If there's a Google Meet link, redirect to browser or Meet app
      if (meetUrl) {
        const supported = await Linking.canOpenURL(meetUrl);
        if (supported) {
          await Linking.openURL(meetUrl);
          setIsInMeeting(true); // Keep ui state friendly so they can return and leave
        } else {
          // If for some reason canOpenURL fails but it's clearly a URL, try it anyway
          try {
            await Linking.openURL(meetUrl);
            setIsInMeeting(true);
          } catch (e) {
            Alert.alert('Error', `Could not open Google Meet: ${meetUrl}`);
          }
        }
        return;
      }

      // Existing Zoom logic fallback
      const meetingNumber = getMeetingNumber();

      // If it's literally a URL and not a meeting number, try to open it 
      if (!meetingNumber && appointment.join_url) {
        await Linking.openURL(appointment.join_url);
        setIsInMeeting(true);
        return;
      }

      if (!meetingNumber) {
        // One final fallback: try ANY url on the object
        const anyUrl = getMeetUrl() || appointment.join_url || appointment.start_url;
        if (anyUrl && typeof anyUrl === 'string' && anyUrl.startsWith('http')) {
          await Linking.openURL(anyUrl);
          setIsInMeeting(true);
          return;
        }
        throw new Error('Meeting link or ID is not available for this session yet. Please contact your doctor or wait for them to start the session.');
      }

      const meetingData = {
        meetingNumber: meetingNumber,
        password: appointment.meeting_password || '',
        displayName: userName.trim(),
      };

      let result;

      // Doctor joins as host with ZAK token (if available)
      if (userData?.role === 'doctor' && appointment.zak_token) {
        meetingData.zoomAccessToken = appointment.zak_token;
        result = await zoomService.joinMeetingAsHost(meetingData);
      } else {
        // Patient joins as participant
        result = await zoomService.joinMeetingAsParticipant(meetingData);
      }

      if (result.success) {
        setIsInMeeting(true);
      } else {
        Alert.alert('Failed to Join', result.error || 'Could not join the meeting');
      }
    } catch (error) {
      console.error('Join meeting error:', error);
      Alert.alert('Error', error.message || 'Failed to join meeting');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle leaving the meeting without completing
   */
  const handleLeaveMeeting = async () => {
    if (getMeetUrl()) {
      setIsInMeeting(false);
      navigation.goBack();
      return;
    }

    const result = await zoomService.leaveMeeting();
    // Only go back if not doing SOAP note polling
    if (result.success && !isGeneratingSoap) {
      setIsInMeeting(false);
      navigation.goBack();
    }
  };

  /**
   * Complete Consultation and trigger SOAP Note generation
   */
  const handleCompleteConsultation = async () => {
    try {
      if (getMeetUrl()) {
        // for Google meet we just mark as complete directly
        setIsGeneratingSoap(true);
        // Use meeting_id (Consultation ID) if available, fallback to appointment.id
        const consultId = appointment.meeting_id || appointment.meeting?.id || appointment.id;
        await consultationAPI.completeConsultation(consultId);
        pollForSoapNote(consultId);
      } else {
        // Fallback for Zoom
        const result = await zoomService.leaveMeeting();
        if (result.success) {
          setIsGeneratingSoap(true);
          const consultId = appointment.meeting_id || appointment.meeting?.id || appointment.id;
          await consultationAPI.completeConsultation(consultId);
          pollForSoapNote(consultId);
        }
      }
    } catch (error) {
      console.error('Complete consultation error:', error);
      Alert.alert('Error', 'Failed to complete consultation');
      setIsGeneratingSoap(false);
    }
  };

  const pollForSoapNote = async (consultationId) => {
    let attempts = 0;
    const maxAttempts = 40; // up to ~3.3 minutes

    const intervalId = setInterval(async () => {
      attempts++;
      try {
        const res = await consultationAPI.getSoapNote(consultationId);
        if (res.status === 200 && res.data?.soap_note) {
          clearInterval(intervalId);
          setIsGeneratingSoap(false);
          setSoapNoteText(res.data.soap_note);
          setShowSoapNote(true);
        }
      } catch (err) {
        if (err.response?.status !== 202) {
          console.warn('Polling error:', err);
        }
      }

      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        setIsGeneratingSoap(false);
        Alert.alert("Timeout", "Note generation timed out. Please check again later.");
      }
    }, 5000);
  };

  // If doctor, auto-join
  useEffect(() => {
    if (userData?.role === 'doctor' && userName && !isInMeeting && !loading) {
      handleJoinMeeting();
    }
  }, [userData, userName]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Call</Text>
        <View style={{ width: 40 }} />
      </View>

      {!isInMeeting ? (
        <View style={styles.preJoinContainer}>
          <Ionicons name="videocam" size={80} color={COLORS.primary} />
          <Text style={styles.meetingTitle}>
            {userData?.role === 'doctor' ? 'Starting consultation...' : 'Join Consultation'}
          </Text>

          {userData?.role !== 'doctor' && (
            <>
              <Text style={styles.instructionText}>
                Enter your name to join the video call
              </Text>

              <TextInput
                style={styles.nameInput}
                placeholder="Your Full Name"
                value={userName}
                onChangeText={setUserName}
                editable={!loading}
                autoCapitalize="words"
              />
            </>
          )}

          {userData?.role !== 'doctor' && (
            <TouchableOpacity
              style={[styles.joinButton, loading && styles.joinButtonDisabled]}
              onPress={handleJoinMeeting}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="videocam" size={24} color="white" />
                  <Text style={styles.joinButtonText}>Join Meeting</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {userData?.role === 'doctor' && loading && (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          )}

          <View style={styles.meetingInfo}>
            {getMeetingNumber() ? (
              <>
                <Text style={styles.infoLabel}>Meeting ID:</Text>
                <Text style={styles.infoValue}>{getMeetingNumber()}</Text>
                {appointment.meeting_password && (
                  <>
                    <Text style={styles.infoLabel}>Password:</Text>
                    <Text style={styles.infoValue}>{appointment.meeting_password}</Text>
                  </>
                )}
              </>
            ) : getMeetUrl() ? (
              <>
                <Text style={styles.infoLabel}>Meeting Platform:</Text>
                <Text style={styles.infoValue}>{getMeetUrl().toLowerCase().includes('meet.google.com') ? 'Google Meet' : 'Video Conference'}</Text>
                <Text style={styles.infoLabel}>Link:</Text>
                <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">{getMeetUrl()}</Text>
              </>
            ) : (
              <Text style={styles.infoLabel}>Meeting details unavailable for this session.</Text>
            )}
          </View>
        </View>
      ) : isGeneratingSoap ? (
        <View style={styles.inMeetingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 20 }} />
          <Text style={styles.meetingTitle}>Consultation Completed</Text>
          <Text style={styles.instructionText}>Generating AI SOAP Note...</Text>
          <Text style={styles.instructionText}>(This may take 2-4 minutes processing the Google Meet transcript)</Text>
        </View>
      ) : showSoapNote && soapNoteText ? (
        <ScrollView style={styles.soapContainer} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Ionicons name="document-text" size={32} color={COLORS.primary} />
            <Text style={styles.meetingTitle}>AI SOAP Note</Text>
          </View>

          <View style={styles.soapCard}>
            <Text style={styles.soapLabel}>Subjective</Text>
            <Text style={styles.soapText}>{soapNoteText.subjective || "No data collected"}</Text>
          </View>

          <View style={styles.soapCard}>
            <Text style={styles.soapLabel}>Objective</Text>
            <Text style={styles.soapText}>{soapNoteText.objective || "No data collected"}</Text>
          </View>

          <View style={styles.soapCard}>
            <Text style={styles.soapLabel}>Assessment</Text>
            <Text style={styles.soapText}>{soapNoteText.assessment || "No data collected"}</Text>
          </View>

          <View style={styles.soapCard}>
            <Text style={styles.soapLabel}>Plan</Text>
            <Text style={styles.soapText}>{soapNoteText.plan || "No data collected"}</Text>
          </View>

          <TouchableOpacity style={[styles.joinButton, { marginTop: 30 }]} onPress={() => navigation.goBack()}>
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text style={styles.joinButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.inMeetingContainer}>
          {/* Zoom SDK will render the meeting UI here */}
          <Ionicons name="videocam" size={80} color="#DDD" style={{ marginBottom: 20 }} />
          <Text style={styles.inMeetingText}>Meeting in progress...</Text>

          {userData?.role === 'doctor' && (
            <TouchableOpacity
              style={[styles.joinButton, { marginBottom: 16 }]}
              onPress={handleCompleteConsultation}
            >
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text style={styles.joinButtonText}>Mark Complete & Generate Note</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.leaveButton}
            onPress={handleLeaveMeeting}
          >
            <Ionicons name="exit" size={24} color="white" />
            <Text style={styles.leaveButtonText}>Leave Meeting</Text>
          </TouchableOpacity>
        </View>
      )}
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
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  preJoinContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  meetingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  nameInput: {
    width: '100%',
    maxWidth: 400,
    height: 56,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 24,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    minWidth: 200,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  meetingInfo: {
    marginTop: 40,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    marginTop: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inMeetingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inMeetingText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  leaveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  soapContainer: {
    flex: 1,
    backgroundColor: '#F9FAFC',
  },
  soapCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  soapLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  soapText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});