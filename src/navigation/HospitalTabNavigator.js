import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Screens
import HospitalDashboard from '../screens/hospital/HospitalDashboard';
import HospitalTeamScreen from '../screens/hospital/HospitalTeamScreen';
import HospitalScheduleScreen from '../screens/hospital/HospitalScheduleScreen';
import HospitalSettingsScreen from '../screens/hospital/HospitalSettingsScreen';

const Tab = createBottomTabNavigator();

export default function HospitalTabNavigator() {
    return (
        <Tab.Navigator
            initialRouteName="Dashboard"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Dashboard') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Team') {
                        iconName = focused ? 'people' : 'people-outline';
                    } else if (route.name === 'Schedule') {
                        iconName = focused ? 'calendar' : 'calendar-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: '#999',
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: '#F0F0F0',
                    paddingBottom: 5,
                    paddingTop: 5,
                    backgroundColor: 'white',
                    height: 60,
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={HospitalDashboard} />
            <Tab.Screen name="Team" component={HospitalTeamScreen} />
            <Tab.Screen name="Schedule" component={HospitalScheduleScreen} />
            <Tab.Screen name="Settings" component={HospitalSettingsScreen} />
        </Tab.Navigator>
    );
}
