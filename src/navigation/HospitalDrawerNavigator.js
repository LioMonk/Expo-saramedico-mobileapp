import React, { useState } from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { useNavigation, DrawerActions, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SignOutModal from '../components/SignOutModal';

// Screens & Navigators
import HospitalTabNavigator from './HospitalTabNavigator';
import HospitalDepartmentsScreen from '../screens/hospital/HospitalDepartmentsScreen';

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

const CustomDrawerContent = (props) => {
    const [showSignOut, setShowSignOut] = useState(false);
    const navigation = props.navigation;

    const handleNavigation = (screenName) => {
        navigation.dispatch(DrawerActions.closeDrawer());
        if (screenName) navigation.navigate(screenName);
    };

    const confirmSignOut = async () => {
        setShowSignOut(false);
        await AsyncStorage.clear();
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
            })
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.drawerHeader}>
                <View style={styles.headerIcon}>
                    <Ionicons name="business" size={32} color="#FFF" />
                </View>
                <Text style={styles.hospitalText}>Hospital Panel</Text>
            </View>

            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
                {/* Standard Home/Dashboard link */}
                <DrawerItemList {...props} />

                {/* Manual Departments link to ensure it's the exact same screen/stack as Dashboard */}
                <TouchableOpacity
                    style={styles.manualMenuItem}
                    onPress={() => handleNavigation('HospitalDepartmentsScreen')}
                >
                    <Ionicons name="grid-outline" size={22} color="#333" />
                    <Text style={styles.manualMenuText}>Departments</Text>
                </TouchableOpacity>
            </DrawerContentScrollView>

            <View style={styles.drawerFooter}>
                <TouchableOpacity style={styles.signOutButton} onPress={() => setShowSignOut(true)}>
                    <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>

            <SignOutModal
                visible={showSignOut}
                onCancel={() => setShowSignOut(false)}
                onConfirm={confirmSignOut}
            />
        </View>
    );
};

export default function HospitalDrawerNavigator() {
    return (
        <Drawer.Navigator
            initialRouteName="HospitalHome"
            drawerContent={(props) => <CustomDrawerContent {...props} />}
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
            {/* Departments screen is handled manually in content to match Dashboard navigation */}
            <Drawer.Screen
                name="DepartmentsHidden"
                component={HospitalDepartmentsScreen}
                options={{
                    drawerItemStyle: { display: 'none' },
                    headerShown: false
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
    },
    drawerHeader: {
        backgroundColor: COLORS.primary,
        padding: 20,
        paddingTop: 50,
        paddingBottom: 30,
        alignItems: 'center',
    },
    headerIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    hospitalText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    drawerFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        marginBottom: 20,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    signOutText: {
        marginLeft: 15,
        fontSize: 15,
        color: '#FF3B30',
        fontWeight: '600',
    },
    manualMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 18,
        marginTop: 5,
    },
    manualMenuText: {
        fontSize: 15,
        marginLeft: 26,
        color: '#333',
        fontWeight: '500',
    }
});
