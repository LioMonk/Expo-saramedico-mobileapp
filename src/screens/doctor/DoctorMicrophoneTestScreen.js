import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { CustomButton } from '../../components/CustomComponents';

export default function DoctorMicrophoneTestScreen({ navigation }) {
  const [isTesting, setIsTesting] = React.useState(false);
  const [micLevel] = React.useState(new Animated.Value(1));
  const micAnimRef = React.useRef(null);

  const startTest = () => {
    Alert.alert(
      "Microphone Access",
      "Saramedico needs access to your microphone to perform this test.",
      [
        { text: "Deny", style: "cancel" },
        {
          text: "Allow",
          onPress: () => {
            setIsTesting(true);
            const animate = () => {
              Animated.sequence([
                Animated.timing(micLevel, {
                  toValue: 1 + Math.random() * 0.8,
                  duration: 150,
                  useNativeDriver: true
                }),
                Animated.timing(micLevel, {
                  toValue: 1,
                  duration: 150,
                  useNativeDriver: true
                })
              ]).start();
            };
            micAnimRef.current = setInterval(animate, 310);
          }
        }
      ]
    );
  };

  const stopTest = () => {
    setIsTesting(false);
    if (micAnimRef.current) {
      clearInterval(micAnimRef.current);
      micAnimRef.current = null;
    }
    Animated.timing(micLevel, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const handleNextStep = () => {
    stopTest();
    navigation.navigate('DoctorDashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Header: Back + Progress Bar (Step 2/4) */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: '60%' }]} />
          </View>
        </View>

        <Text style={styles.title}>Test Your Microphone</Text>
        <Text style={styles.subtitle}>
          {isTesting
            ? "Speak clearly. The circle will pulse if audio is detected."
            : "Please speak a short sentence to ensure accurate transcription"}
        </Text>

        {/* Mic Visualizer Area */}
        <View style={styles.micContainer}>
          <Animated.View style={[
            styles.micCircleOuter,
            { transform: [{ scale: micLevel }], borderColor: isTesting ? COLORS.primary : '#EEE' }
          ]}>
            <View style={[styles.micCircleInner, { backgroundColor: isTesting ? COLORS.primary : '#94A3B8' }]}>
              <Ionicons name={isTesting ? "mic" : "mic-outline"} size={40} color="white" />
            </View>
          </Animated.View>
          {isTesting && (
            <Text style={{ marginTop: 20, color: COLORS.primary, fontWeight: '700' }}>AUDIO DETECTED</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {!isTesting ? (
            <CustomButton title="Start Test" onPress={startTest} />
          ) : (
            <CustomButton title="Continue to Dashboard" onPress={handleNextStep} />
          )}
          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 15 }}
            onPress={handleNextStep}
          >
            <Text style={{ color: '#999', fontSize: 13 }}>Skip for now</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { flex: 1, padding: 25 },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  progressBarTrack: { flex: 1, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, marginLeft: 20 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },

  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },

  micContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 50 },
  micCircleOuter: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  micCircleInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },

  footer: { marginTop: 'auto', paddingBottom: 10 }
});