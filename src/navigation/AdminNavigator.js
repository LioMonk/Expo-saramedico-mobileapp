import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminAccountManagementScreen from '../screens/admin/AdminAccountManagementScreen';
import AdminScheduleScreen from '../screens/admin/AdminScheduleScreen';
import AdminMessagesScreen from '../screens/admin/AdminMessagesScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import AdminInviteMemberScreen from '../screens/admin/AdminInviteMemberScreen';
import AdminEditUserScreen from '../screens/admin/AdminEditUserScreen';
import AdminSearchScreen from '../screens/admin/AdminSearchScreen';
import AdminDoctorsScreen from '../screens/admin/AdminDoctorsScreen';
import AdminOrganizationsScreen from '../screens/admin/AdminOrganizationsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';
import AdminOrganizationSettingsScreen from '../screens/admin/AdminOrganizationSettingsScreen';
import AdminDeveloperSettingsScreen from '../screens/admin/AdminDeveloperSettingsScreen';
import AdminBackupSettingsScreen from '../screens/admin/AdminBackupSettingsScreen';
import AdminOrgDetailScreen from '../screens/admin/AdminOrgDetailScreen';
import AdminDoctorDetailScreen from '../screens/admin/AdminDoctorDetailScreen';
import AdminAuditLogScreen from '../screens/admin/AdminAuditLogScreen';
import FAQScreen from '../screens/common/FAQScreen';

const Stack = createStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      {/* Main Screens */}
      <Stack.Screen name="AdminFlow" component={AdminDashboard} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="AdminAccountManagementScreen" component={AdminAccountManagementScreen} />
      <Stack.Screen name="AdminSettingsScreen" component={AdminSettingsScreen} />

      {/* Directory Screens */}
      <Stack.Screen name="AdminDoctorsScreen" component={AdminDoctorsScreen} />
      <Stack.Screen name="AdminOrganizationsScreen" component={AdminOrganizationsScreen} />

      {/* Secondary Screens */}
      <Stack.Screen name="AdminScheduleScreen" component={AdminScheduleScreen} />
      <Stack.Screen name="AdminMessagesScreen" component={AdminMessagesScreen} />
      <Stack.Screen name="AdminInviteMemberScreen" component={AdminInviteMemberScreen} />
      <Stack.Screen name="AdminEditUserScreen" component={AdminEditUserScreen} />
      <Stack.Screen name="AdminSearchScreen" component={AdminSearchScreen} />
      <Stack.Screen name="AdminAnalyticsScreen" component={AdminAnalyticsScreen} />
      <Stack.Screen name="AdminOrganizationSettingsScreen" component={AdminOrganizationSettingsScreen} />
      <Stack.Screen name="AdminDeveloperSettingsScreen" component={AdminDeveloperSettingsScreen} />
      <Stack.Screen name="AdminBackupSettingsScreen" component={AdminBackupSettingsScreen} />
      <Stack.Screen name="AdminOrgDetailScreen" component={AdminOrgDetailScreen} />
      <Stack.Screen name="AdminDoctorDetailScreen" component={AdminDoctorDetailScreen} />
      <Stack.Screen name="AuditLogScreen" component={AdminAuditLogScreen} />
      <Stack.Screen name="FAQScreen" component={FAQScreen} />
    </Stack.Navigator>
  );
}