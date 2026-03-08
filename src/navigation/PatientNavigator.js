import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

// Root Navigators
import PatientDrawerNavigator from './PatientDrawerNavigator';

// Screens
import AppointmentBookingScreen from '../screens/patient/AppointmentBookingScreen';
import AppointmentDetailScreen from '../screens/patient/AppointmentDetailScreen';
import HealthMetricsScreen from '../screens/patient/HealthMetricsScreen';
import MedicalHistoryUploadScreen from '../screens/patient/MedicalHistoryUploadScreen';
import ConsultationDetailScreen from '../screens/patient/ConsultationDetailScreen';
import SearchScreen from '../screens/patient/SearchScreen';
import DoctorSearchScreen from '../screens/patient/DoctorSearchScreen';

// Shared
import VideoCallScreen from '../screens/VideoCallScreen';
import AuditLogScreen from '../screens/common/AuditLogScreen';
import DeleteAccountScreen from '../screens/common/DeleteAccountScreen';
import FAQScreen from '../screens/common/FAQScreen';

const Stack = createStackNavigator();

export default function PatientNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="PatientHome"
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      {/* 
          Main Root: The Drawer which contains the Tabs. 
          Website sidebar options are all contained in the Drawer and specialized Tabs.
      */}
      <Stack.Screen name="PatientHome" component={PatientDrawerNavigator} />

      {/* Stack-only Screens (not in sidebar/tabs directly) */}
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="AppointmentBooking" component={AppointmentBookingScreen} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
      <Stack.Screen name="HealthMetrics" component={HealthMetricsScreen} />
      <Stack.Screen name="MedicalHistoryUpload" component={MedicalHistoryUploadScreen} />
      <Stack.Screen name="ConsultationDetails" component={ConsultationDetailScreen} />
      <Stack.Screen name="Doctors" component={DoctorSearchScreen} />

      {/* Shared */}
      <Stack.Screen name="VideoCallScreen" component={VideoCallScreen} />
      <Stack.Screen name="AuditLogScreen" component={AuditLogScreen} />
      <Stack.Screen name="DeleteAccountScreen" component={DeleteAccountScreen} />
      <Stack.Screen name="FAQScreen" component={FAQScreen} />
    </Stack.Navigator>
  );
}