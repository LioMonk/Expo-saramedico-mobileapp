import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { CustomButton } from '../../components/CustomComponents';

export default function MicrophoneTestScreen({ navigation }) {
  // State to toggle between the "Icon View" and "Text/Waveform View"
  const [isTesting, setIsTesting] = useState(false);

  // Navigation Handler
  const handleContinue = () => {
    // Navigate to the Dashboard
    navigation.replace('Dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Header: Back Arrow + Progress Bar */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: isTesting ? '60%' : '30%' }]} />
          </View>
        </View>

        {/* Title Section */}
        <Text style={styles.title}>Test Your Microphone</Text>
        <Text style={styles.subtitle}>
          Please speak a short sentence to ensure accurate transcription
        </Text>

        {/* --- DYNAMIC CONTENT AREA --- */}
        <View style={styles.dynamicContent}>

          {!isTesting ? (
            /* STATE 1: Big Microphone Icon */
            <View style={styles.micCircleOuter}>
              <View style={styles.micCircleMiddle}>
                <View style={styles.micCircleInner}>
                  <Ionicons name="mic" size={40} color="white" />
                </View>
              </View>
            </View>
          ) : (
            /* STATE 2: Text Box + Waveform */
            <View style={{ width: '100%', alignItems: 'center' }}>
              {/* Text Box */}
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionText}>
                  Audio system online. Testing default microphone input... Please speak clearly.
                </Text>
              </View>

              {/* Waveform Visualization (Mock) */}
              <View style={styles.waveformContainer}>
                {[10, 25, 15, 30, 20, 35, 25, 10, 30, 15, 25, 10, 20, 35, 15, 25].map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      { height: h, backgroundColor: COLORS.primary, opacity: 0.7 + (i % 2) * 0.3 }
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Language Selector */}
        <View style={styles.bottomSection}>
          <Text style={styles.label}>Choose Language</Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text style={styles.dropdownText}>English (USA)</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {/* Action Button */}
          <View style={{ marginTop: 30 }}>
            <CustomButton
              // If testing, show "Finish"; otherwise "Start Test"
              title={isTesting ? "Finish & Continue" : "Start Test"}
              onPress={() => {
                if (isTesting) {
                  handleContinue(); // Finish test -> Go to Dashboard
                } else {
                  setIsTesting(true); // Start test -> Show Waveform
                }
              }}
            />
          </View>

          {/* Skip Link */}
          {!isTesting && (
            <TouchableOpacity
              style={{ marginTop: 20, alignSelf: 'center' }}
              onPress={handleContinue} // Skip -> Go to Dashboard
            >
              <Text style={{ color: '#888' }}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 25, flex: 1 },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  progressBarTrack: { flex: 1, height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, marginLeft: 20 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },

  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },

  dynamicContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  micCircleOuter: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  micCircleMiddle: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  micCircleInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },

  transcriptionBox: { width: '100%', height: 180, borderWidth: 1, borderColor: '#DDD', borderRadius: 15, padding: 20, backgroundColor: 'white' },
  transcriptionText: { fontSize: 16, color: '#B0B0B0', lineHeight: 24, fontWeight: '500' },

  waveformContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, marginTop: 30 },
  waveBar: { width: 4, borderRadius: 2, marginHorizontal: 3 },

  bottomSection: { marginTop: 'auto' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 50, borderWidth: 1, borderColor: '#DDD', borderRadius: 10, paddingHorizontal: 15, backgroundColor: 'white' },
  dropdownText: { fontSize: 15, color: '#333' }
});