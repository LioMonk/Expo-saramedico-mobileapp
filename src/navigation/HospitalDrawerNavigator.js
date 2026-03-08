import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';

// Screens & Navigators
import HospitalTabNavigator from './HospitalTabNavigator';
import HospitalDepartmentsScreen from '../screens/hospital/HospitalDepartmentsScreen';

// Custom Drawer Layout can be implemented if needed, but for now we rely on Native Drawer

const Drawer = createDrawerNavigator();

const HeaderLeft = () => {
    const navigation = useNavigation();
    return (
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>
    );
};

const HeaderRight = () => {
    const navigation = useNavigation();
    return (
        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('HospitalSettingsScreen')}>
            <View style={styles.avatarPlaceholder}>
                <Ionicons name="business" size={18} color="#FFF" />
            </View>
        </TouchableOpacity>
    );
};

export default function HospitalDrawerNavigator() {
    return (
        <Drawer.Navigator
            initialRouteName="HospitalHome"
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: '#F9FAFC',
                    elevation: 0, // Android
                    shadowOpacity: 0, // iOS
                },
                headerTitleStyle: {
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#333',
                },
                headerLeft: () => <HeaderLeft />,
                headerRight: () => <HeaderRight />,
                drawerActiveTintColor: COLORS.primary,
                drawerInactiveTintColor: '#333',
                drawerStyle: {
                    width: '75%',
                },
            }}
        >
            <Drawer.Screen
                name="HospitalHome"
                component={HospitalTabNavigator}
                options={{
                    title: 'Dashboard',
                    headerShown: false,
                    drawerIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />
                }}
            />
            <Drawer.Screen
                name="Departments"
                component={HospitalDepartmentsScreen}
                options={{
                    title: 'Departments',
                    drawerIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} />
                }}
            />
        </Drawer.Navigator>
    );
}

const styles = StyleSheet.create({
    menuButton: {
        marginLeft: 15,
        padding: 5,
    },
    profileButton: {
        marginRight: 15,
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
    }
});
