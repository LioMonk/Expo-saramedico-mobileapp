import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    Switch,
    Alert,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { hospitalAPI, authAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_CONFIG } from '../../services/config';
import SignOutModal from '../../components/SignOutModal';

export default function HospitalSettingsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const [hospitalInfo, setHospitalInfo] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
    });
    const [notifications, setNotifications] = useState({
        appointments: true,
        teamUpdates: true,
        patientAlerts: true,
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);

            // Load user profile
            try {
                const profileRes = await authAPI.getCurrentUser();
                setHospitalInfo({
                    name: profileRes.data?.name || profileRes.data?.full_name || 'City Hospital',
                    email: profileRes.data?.email || 'hospital@example.com',
                    phone: profileRes.data?.phone || profileRes.data?.phone_number || '',
                    address: profileRes.data?.address || '',
                });
            } catch (e) {
                // Use default values
                console.log('Using default hospital info');
            }

            // Try to load hospital settings
            try {
                const settingsRes = await hospitalAPI.getSettings();
                if (settingsRes.data?.notifications) {
                    setNotifications(settingsRes.data.notifications);
                }
            } catch (e) {
                // Keep default notifications - no need to log
            }

        } catch (error) {
            console.log('Settings load info:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await hospitalAPI.updateSettings({
                name: hospitalInfo.name,
                phone: hospitalInfo.phone,
                address: hospitalInfo.address,
                notifications,
            });
            Alert.alert('Success', 'Settings saved successfully');
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        setShowSignOutModal(false);
        try {
            await AsyncStorage.multiRemove([TOKEN_CONFIG.ACCESS_TOKEN_KEY, TOKEN_CONFIG.REFRESH_TOKEN_KEY]);
        } catch (e) {
            console.log('Sign out error:', e);
        }
        navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading settings...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Settings</Text>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={loadSettings} colors={[COLORS.primary]} />
                    }
                >
                    {/* Hospital Info */}
                    <Text style={styles.sectionTitle}>Hospital Information</Text>
                    <View style={styles.card}>
                        <View style={styles.inputRow}>
                            <Text style={styles.label}>Hospital Name</Text>
                            <TextInput
                                style={styles.input}
                                value={hospitalInfo.name}
                                onChangeText={(text) => setHospitalInfo({ ...hospitalInfo, name: text })}
                                placeholder="Hospital name"
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputRow}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={[styles.input, styles.inputDisabled]}
                                value={hospitalInfo.email}
                                editable={false}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputRow}>
                            <Text style={styles.label}>Phone</Text>
                            <TextInput
                                style={styles.input}
                                value={hospitalInfo.phone}
                                onChangeText={(text) => setHospitalInfo({ ...hospitalInfo, phone: text })}
                                placeholder="Phone number"
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputRow}>
                            <Text style={styles.label}>Address</Text>
                            <TextInput
                                style={styles.input}
                                value={hospitalInfo.address}
                                onChangeText={(text) => setHospitalInfo({ ...hospitalInfo, address: text })}
                                placeholder="Hospital address"
                                multiline
                            />
                        </View>
                    </View>

                    {/* Notifications */}
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <View style={styles.card}>
                        <View style={styles.switchRow}>
                            <View>
                                <Text style={styles.switchLabel}>Appointment Alerts</Text>
                                <Text style={styles.switchSubtext}>Receive notifications for appointments</Text>
                            </View>
                            <Switch
                                value={notifications.appointments}
                                onValueChange={(val) => setNotifications({ ...notifications, appointments: val })}
                                trackColor={{ false: "#E0E0E0", true: COLORS.primary }}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.switchRow}>
                            <View>
                                <Text style={styles.switchLabel}>Team Updates</Text>
                                <Text style={styles.switchSubtext}>Get notified when team changes occur</Text>
                            </View>
                            <Switch
                                value={notifications.teamUpdates}
                                onValueChange={(val) => setNotifications({ ...notifications, teamUpdates: val })}
                                trackColor={{ false: "#E0E0E0", true: COLORS.primary }}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.switchRow}>
                            <View>
                                <Text style={styles.switchLabel}>Patient Alerts</Text>
                                <Text style={styles.switchSubtext}>Important patient notifications</Text>
                            </View>
                            <Switch
                                value={notifications.patientAlerts}
                                onValueChange={(val) => setNotifications({ ...notifications, patientAlerts: val })}
                                trackColor={{ false: "#E0E0E0", true: COLORS.primary }}
                            />
                        </View>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.buttonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>

                    {/* Other Options */}
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.menuItem}>
                            <Ionicons name="shield-checkmark-outline" size={22} color="#333" />
                            <Text style={styles.menuText}>Security & Privacy</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.menuItem}>
                            <Ionicons name="help-circle-outline" size={22} color="#333" />
                            <Text style={styles.menuText}>Help & Support</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => setShowSignOutModal(true)}
                        >
                            <Ionicons name="log-out-outline" size={22} color="#F44336" />
                            <Text style={[styles.menuText, { color: '#F44336' }]}>Sign Out</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>

            <SignOutModal
                visible={showSignOutModal}
                onCancel={() => setShowSignOutModal(false)}
                onConfirm={handleSignOut}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    contentContainer: { flex: 1, padding: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, color: '#666', fontSize: 14 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 10, marginTop: 15, textTransform: 'uppercase', letterSpacing: 0.5 },

    card: { backgroundColor: 'white', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 10 },

    inputRow: { paddingVertical: 10 },
    label: { fontSize: 13, color: '#666', marginBottom: 8 },
    input: { fontSize: 15, color: '#333', paddingVertical: 5 },
    inputDisabled: { color: '#999' },

    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 5 },

    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    switchLabel: { fontSize: 15, fontWeight: '500', color: '#333' },
    switchSubtext: { fontSize: 12, color: '#999', marginTop: 2 },

    saveButton: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.6 },

    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    menuText: { flex: 1, fontSize: 15, color: '#333', marginLeft: 15 },
});
