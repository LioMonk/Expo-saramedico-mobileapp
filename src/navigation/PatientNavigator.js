import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

// Screens
import PatientDashboard from '../screens/patient/PatientDashboard';
import MedicalRecordsScreen from '../screens/patient/MedicalRecordsScreen';
import ScheduleScreen from '../screens/patient/ScheduleScreen';
import MessagesScreen from '../screens/patient/MessagesScreen';
import SearchScreen from '../screens/patient/SearchScreen';
import PatientSettingsScreen from '../screens/patient/PatientSettingsScreen';
import PatientNotificationsScreen from '../screens/patient/PatientNotificationsScreen';
import DoctorSearchScreen from '../screens/patient/DoctorSearchScreen';
import AppointmentBookingScreen from '../screens/patient/AppointmentBookingScreen';
import AppointmentDetailScreen from '../screens/patient/AppointmentDetailScreen';

// Shared
import VideoCallScreen from '../screens/VideoCallScreen';
import AuditLogScreen from '../screens/common/AuditLogScreen';
import DeleteAccountScreen from '../screens/common/DeleteAccountScreen';
import FAQScreen from '../screens/common/FAQScreen';

const Stack = createStackNavigator();

export default function PatientNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="PatientDashboard"
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      {/* Main Screens */}
      <Stack.Screen name="PatientDashboard" component={PatientDashboard} />
      <Stack.Screen name="PatientNotificationsScreen" component={PatientNotificationsScreen} />
      <Stack.Screen name="MedicalRecordsScreen" component={MedicalRecordsScreen} />
      <Stack.Screen name="ScheduleScreen" component={ScheduleScreen} />
      <Stack.Screen name="MessagesScreen" component={MessagesScreen} />
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="PatientSettingsScreen" component={PatientSettingsScreen} />
      <Stack.Screen name="DoctorSearch" component={DoctorSearchScreen} />
      <Stack.Screen name="AppointmentBooking" component={AppointmentBookingScreen} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />

      {/* Shared */}
      <Stack.Screen name="VideoCallScreen" component={VideoCallScreen} />
      <Stack.Screen name="AuditLogScreen" component={AuditLogScreen} />
      <Stack.Screen name="DeleteAccountScreen" component={DeleteAccountScreen} />
      <Stack.Screen name="FAQScreen" component={FAQScreen} />
    </Stack.Navigator>
  );
}