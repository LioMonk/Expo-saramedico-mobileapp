import React from 'react';
import { DrawerContentScrollView, DrawerItemList, createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { TouchableOpacity, StyleSheet, View, Text, Alert, Image } from 'react-native';
import { useNavigation, DrawerActions, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Drawer = createDrawerNavigator();


// Navigators & Screens
import PatientTabNavigator from './PatientTabNavigator';
import PatientNotificationsScreen from '../screens/patient/PatientNotificationsScreen';
import PatientSettingsScreen from '../screens/patient/PatientSettingsScreen';

const CustomDrawerContent = (props) => {
    const navigation = props.navigation;

    const handleSignOut = () => {
        Alert.alert(
            "Confirm Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        await AsyncStorage.clear();
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'Auth' }],
                            })
                        );
                    }
                }
            ]
        );
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Drawer Header - Outside ScrollView for edge-to-edge area */}
            <View style={styles.drawerHeader}>
                <Image
                    source={require('../../assets/logo_transparent.png')}
                    style={styles.drawerLogo}
                    resizeMode="contain"
                />
            </View>

            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
                {/* Only specific Drawer Screens will be rendered via DrawerItemList 
                    because we handle filtering in screenOptions or by hiding items */}
                <DrawerItemList {...props} />
            </DrawerContentScrollView>

            {/* Footer with Sign Out */}
            <View style={styles.drawerFooter}>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function PatientDrawerNavigator() {
    return (
        <Drawer.Navigator
            initialRouteName="MainDashboard"
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerActiveTintColor: COLORS.primary,
                drawerInactiveTintColor: '#333',
                drawerLabelStyle: {
                    fontSize: 15,
                    fontWeight: '500',
                    marginLeft: -10,
                },
                drawerStyle: {
                    width: '75%',
                },
            }}
        >
            <Drawer.Screen
                name="MainDashboard"
                component={PatientTabNavigator}
                options={{
                    title: 'Dashboard',
                    headerTitle: 'Patient Panel',
                    drawerIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />,
                    drawerItemStyle: { display: 'none' }
                }}
            />
            <Drawer.Screen
                name="Notifications"
                component={PatientNotificationsScreen}
                options={{
                    title: 'Notifications',
                    drawerIcon: ({ color }) => <Ionicons name="notifications-outline" size={22} color={color} />
                }}
            />

            <Drawer.Screen
                name="Settings"
                component={PatientSettingsScreen}
                options={{
                    title: 'Settings',
                    drawerIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} />,
                    drawerItemStyle: { display: 'none' }
                }}
            />
        </Drawer.Navigator>
    );
}

const styles = StyleSheet.create({
    drawerHeader: {
        backgroundColor: '#FFFFFF',
        padding: 10,
        paddingTop: 40,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        alignItems: 'center',
    },
    drawerLogo: {
        width: '110%',
        height: 100,
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
    }
});
