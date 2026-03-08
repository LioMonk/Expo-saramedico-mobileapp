import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Screens
import PatientDashboard from '../screens/patient/PatientDashboard';
import ScheduleScreen from '../screens/patient/ScheduleScreen';
import MedicalRecordsScreen from '../screens/patient/MedicalRecordsScreen';
import DoctorSearchScreen from '../screens/patient/DoctorSearchScreen';
import PatientSettingsScreen from '../screens/patient/PatientSettingsScreen';

const Tab = createBottomTabNavigator();

export default function PatientTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: '#999',
                tabBarStyle: {
                    height: 70,
                    paddingBottom: 10,
                    backgroundColor: '#FFF',
                    borderTopWidth: 1,
                    borderTopColor: '#F0F0F0',
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'PatientDashboard') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Appointments') {
                        iconName = focused ? 'calendar' : 'calendar-outline';
                    } else if (route.name === 'Medical Records') {
                        iconName = focused ? 'folder-open' : 'folder-open-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen
                name="PatientDashboard"
                component={PatientDashboard}
                options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen name="Appointments" component={ScheduleScreen} />
            <Tab.Screen
                name="Medical Records"
                component={MedicalRecordsScreen}
                options={{ tabBarLabel: 'Records' }}
            />
            <Tab.Screen name="Profile" component={PatientSettingsScreen} />
        </Tab.Navigator>
    );
}
