import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

import HospitalDrawerNavigator from './HospitalDrawerNavigator';

// Hospital Secondary Screens — all wired to real backend endpoints
import HospitalInviteTeamScreen from '../screens/hospital/HospitalInviteTeamScreen';
import HospitalDirectoryScreen from '../screens/hospital/HospitalDirectoryScreen';
import HospitalPatientsScreen from '../screens/hospital/HospitalPatientsScreen';
import HospitalStaffScreen from '../screens/hospital/HospitalStaffScreen';
import HospitalAppointmentsScreen from '../screens/hospital/HospitalAppointmentsScreen';
import HospitalNotificationsScreen from '../screens/hospital/HospitalNotificationsScreen';
import HospitalDoctorsByDeptScreen from '../screens/hospital/HospitalDoctorsByDeptScreen';
import HospitalCreateDoctorScreen from '../screens/hospital/HospitalCreateDoctorScreen';
import HospitalEditDoctorScreen from '../screens/hospital/HospitalEditDoctorScreen';
import HospitalMemberDetailScreen from '../screens/hospital/HospitalMemberDetailScreen';
import HospitalPatientDetailScreen from '../screens/hospital/HospitalPatientDetailScreen';

// Legacy screens kept for backward compatibility
import HospitalDepartmentsScreen from '../screens/hospital/HospitalDepartmentsScreen';
import HospitalSurgeryScreen from '../screens/hospital/HospitalSurgeryScreen';
import HospitalAnalyticsScreen from '../screens/hospital/HospitalAnalyticsScreen';
import HospitalMessagesScreen from '../screens/hospital/HospitalMessagesScreen';
import HospitalDoctorsScreen from '../screens/hospital/HospitalDoctorsScreen';
import HospitalNursesScreen from '../screens/hospital/HospitalNursesScreen';
import HospitalScheduleScreen from '../screens/hospital/HospitalScheduleScreen';
import HospitalSettingsScreen from '../screens/hospital/HospitalSettingsScreen';
import FAQScreen from '../screens/common/FAQScreen';

const Stack = createStackNavigator();

export default function HospitalNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="HospitalRoot"
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      <Stack.Screen name="HospitalRoot" component={HospitalDrawerNavigator} />

      {/* ─── New Synced Screens (Hospitalflow.pdf compliant) ─── */}
      <Stack.Screen name="HospitalDirectoryScreen" component={HospitalDirectoryScreen} />
      <Stack.Screen name="HospitalPatientsScreen" component={HospitalPatientsScreen} />
      <Stack.Screen name="HospitalStaffScreen" component={HospitalStaffScreen} />
      <Stack.Screen name="HospitalAppointmentsScreen" component={HospitalAppointmentsScreen} />
      <Stack.Screen name="HospitalInviteTeamScreen" component={HospitalInviteTeamScreen} />
      <Stack.Screen name="HospitalNotificationsScreen" component={HospitalNotificationsScreen} />
      <Stack.Screen name="HospitalDoctorsByDeptScreen" component={HospitalDoctorsByDeptScreen} />
      <Stack.Screen name="HospitalCreateDoctorScreen" component={HospitalCreateDoctorScreen} />
      <Stack.Screen name="HospitalEditDoctorScreen" component={HospitalEditDoctorScreen} />
      <Stack.Screen name="HospitalMemberDetailScreen" component={HospitalMemberDetailScreen} />
      <Stack.Screen name="HospitalPatientDetailScreen" component={HospitalPatientDetailScreen} />

      {/* ─── Legacy Screens ─── */}
      <Stack.Screen name="HospitalDepartmentsScreen" component={HospitalDepartmentsScreen} />
      <Stack.Screen name="HospitalSurgeryScreen" component={HospitalSurgeryScreen} />
      <Stack.Screen name="HospitalAnalyticsScreen" component={HospitalAnalyticsScreen} />
      <Stack.Screen name="HospitalMessagesScreen" component={HospitalMessagesScreen} />
      <Stack.Screen name="HospitalDoctorsScreen" component={HospitalDoctorsScreen} />
      <Stack.Screen name="HospitalNursesScreen" component={HospitalNursesScreen} />
      <Stack.Screen name="HospitalScheduleScreen" component={HospitalScheduleScreen} />
      <Stack.Screen name="HospitalSettingsScreen" component={HospitalSettingsScreen} />
      <Stack.Screen name="FAQScreen" component={FAQScreen} />
    </Stack.Navigator>
  );
}