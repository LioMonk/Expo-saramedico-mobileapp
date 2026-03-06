import React, { useState, useEffect } from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import AuthService from '../services/authService';

// Onboarding
import DoctorSpecialtyScreen from '../screens/doctor/DoctorSpecialtyScreen';
import DoctorMicrophoneTestScreen from '../screens/doctor/DoctorMicrophoneTestScreen';

// Dashboard & Main
import DoctorDashboard from '../screens/doctor/DoctorDashboard';
import DoctorSearchScreen from '../screens/doctor/DoctorSearchScreen';
import DoctorProfileDetailScreen from '../screens/doctor/DoctorProfileDetailScreen';
import DoctorSettingsScreen from '../screens/doctor/DoctorSettingsScreen';

// Patient Management
import DoctorPatientDirectoryScreen from '../screens/doctor/DoctorPatientDirectoryScreen';
import DoctorAddPatientScreen from '../screens/doctor/DoctorAddPatientScreen';
import DoctorPatientDetailScreen from '../screens/doctor/DoctorPatientDetailScreen';
import DoctorPostVisitScreen from '../screens/doctor/DoctorPostVisitScreen';
import AppointmentDetailScreen from '../screens/patient/AppointmentDetailScreen';

// Tools & Schedule
import DoctorQuickUploadScreen from '../screens/doctor/DoctorQuickUploadScreen';
import DoctorUploadScreen from '../screens/doctor/DoctorUploadScreen';
import DoctorAnalyzedResultScreen from '../screens/doctor/DoctorAnalyzedResultScreen';
import DoctorDictateNotesScreen from '../screens/doctor/DoctorDictateNotesScreen';
import DoctorAIChatScreen from '../screens/doctor/DoctorAIChatScreen';
import DoctorAIChatListScreen from '../screens/doctor/DoctorAIChatListScreen';
import DoctorScheduleScreen from '../screens/doctor/DoctorScheduleScreen';
import DoctorAlertsScreen from '../screens/doctor/DoctorAlertsScreen';

// Shared
import VideoCallScreen from '../screens/VideoCallScreen';

// Settings Screens
import DoctorAvailabilityScreen from '../screens/doctor/DoctorAvailabilityScreen';
import DoctorCredentialsScreen from '../screens/doctor/DoctorCredentialsScreen';
import DoctorServicesScreen from '../screens/doctor/DoctorServicesScreen';
import DoctorChangePasswordScreen from '../screens/doctor/DoctorChangePasswordScreen';
import AuditLogScreen from '../screens/common/AuditLogScreen';
import DeleteAccountScreen from '../screens/common/DeleteAccountScreen';
import FAQScreen from '../screens/common/FAQScreen';

const Stack = createStackNavigator();

export default function DoctorNavigator({ navigation }) {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    checkFirstLogin();
  }, []);

  const checkFirstLogin = async () => {
    try {
      // Role & Status Guard
      const [role, status] = await Promise.all([
        AuthService.getCurrentRole(),
        AuthService.verifyAccountStatus()
      ]);

      if (role !== 'doctor' || !status.active) {
        console.warn('[Guard] Unauthorized access to DoctorNavigator');
        // Clear tokens and redirect handled by interceptors normally, 
        // but here we force a logout loop breaker by throwing
        throw new Error('Unauthorized');
      }

      const isFirstLogin = await AsyncStorage.getItem('doctor_first_login');
      if (isFirstLogin === 'true') {
        // First time login - go through onboarding
        setInitialRoute('DoctorSpecialty');
        // Clear the flag so next time they go to dashboard
        await AsyncStorage.removeItem('doctor_first_login');
      } else {
        // Returning user - go straight to dashboard
        setInitialRoute('DoctorDashboard');
      }
    } catch (error) {
      console.error('Error in DoctorNavigator guard:', error);
      // Failsafe: push them back to Auth
      if (navigation) {
        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
      } else {
        setInitialRoute('DoctorDashboard'); // Fallback if navigation not mounted
      }
    }
  };

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00A3FF" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      {/* 1. Onboarding Flow - No Upload Screen */}
      <Stack.Screen name="DoctorSpecialty" component={DoctorSpecialtyScreen} />
      <Stack.Screen name="DoctorSpecialtyScreen" component={DoctorSpecialtyScreen} />
      <Stack.Screen name="DoctorMicrophoneTestScreen" component={DoctorMicrophoneTestScreen} />

      {/* 2. Main Dashboard */}
      <Stack.Screen name="DoctorDashboard" component={DoctorDashboard} />
      <Stack.Screen name="DoctorSearchScreen" component={DoctorSearchScreen} />
      <Stack.Screen name="DoctorProfileDetailScreen" component={DoctorProfileDetailScreen} />
      <Stack.Screen name="DoctorSettingsScreen" component={DoctorSettingsScreen} />

      {/* 3. Patient Management */}
      <Stack.Screen name="DoctorPatientDirectoryScreen" component={DoctorPatientDirectoryScreen} />
      <Stack.Screen name="DoctorAddPatientScreen" component={DoctorAddPatientScreen} />
      <Stack.Screen name="DoctorPatientDetailScreen" component={DoctorPatientDetailScreen} />
      <Stack.Screen name="DoctorPostVisitScreen" component={DoctorPostVisitScreen} />

      {/* 4. Clinical Tools */}
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
      <Stack.Screen name="DoctorUploadScreen" component={DoctorUploadScreen} />
      <Stack.Screen name="DoctorQuickUploadScreen" component={DoctorQuickUploadScreen} />
      <Stack.Screen name="DoctorAnalyzedResultScreen" component={DoctorAnalyzedResultScreen} />
      <Stack.Screen name="DoctorDictateNotesScreen" component={DoctorDictateNotesScreen} />
      <Stack.Screen name="DoctorAIChatScreen" component={DoctorAIChatScreen} />
      <Stack.Screen name="DoctorAIChatListScreen" component={DoctorAIChatListScreen} />

      {/* 5. Schedule & Alerts */}
      <Stack.Screen name="DoctorScheduleScreen" component={DoctorScheduleScreen} />
      <Stack.Screen name="DoctorAlertsScreen" component={DoctorAlertsScreen} />

      {/* Shared */}
      <Stack.Screen name="VideoCallScreen" component={VideoCallScreen} />

      {/* Settings Detail Screens */}
      <Stack.Screen name="DoctorAvailabilityScreen" component={DoctorAvailabilityScreen} />
      <Stack.Screen name="DoctorCredentialsScreen" component={DoctorCredentialsScreen} />
      <Stack.Screen name="DoctorServicesScreen" component={DoctorServicesScreen} />
      <Stack.Screen name="DoctorChangePasswordScreen" component={DoctorChangePasswordScreen} />
      <Stack.Screen name="AuditLogScreen" component={AuditLogScreen} />
      <Stack.Screen name="DeleteAccountScreen" component={DeleteAccountScreen} />
      <Stack.Screen name="FAQScreen" component={FAQScreen} />
    </Stack.Navigator>
  );
}