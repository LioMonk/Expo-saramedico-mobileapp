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
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import AdminBottomNavBar from '../../components/AdminBottomNavBar';
import { authAPI, adminAPI, hospitalAPI, clearTokens } from '../../services/api';
import SignOutModal from '../../components/SignOutModal';

export default function AdminSettingsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSignOut, setShowSignOut] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [adminInfo, setAdminInfo] = useState({
        firstName: '',
        lastName: '',
        email: '',
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);

            // Load admin profile
            try {
                const profileRes = await authAPI.getCurrentUser();
                setAdminInfo({
                    firstName: profileRes.data?.first_name || '',
                    lastName: profileRes.data?.last_name || '',
                    email: profileRes.data?.email || '',
                });
                setMfaEnabled(profileRes.data?.mfa_enabled || false);
            } catch (e) {
                console.log('Using default admin info');
            }

        } catch (error) {
            console.log('Settings load:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            Alert.alert('Error', 'Please fill all password fields');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }

        setChangingPassword(true);
        try {
            await authAPI.changePassword({
                current_password: passwordData.currentPassword,
                new_password: passwordData.newPassword,
            });
            Alert.alert('Success', 'Password changed successfully');
            setShowPasswordModal(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            const message = error.response?.data?.detail || 'Failed to change password';
            Alert.alert('Error', message);
        } finally {
            setChangingPassword(false);
        }
    };

    const handleToggleMFA = async (value) => {
        // If turning OFF
        if (!value) {
            Alert.alert(
                "Disable MFA",
                "Are you sure you want to disable Two-Factor Authentication?",
                [
                    { text: "Cancel", style: "cancel", onPress: () => setMfaEnabled(true) },
                    {
                        text: "Disable",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                await authAPI.disableMFA();
                                setMfaEnabled(false);
                            } catch (error) {
                                Alert.alert('Error', 'Failed to disable MFA');
                                setMfaEnabled(true);
                            }
                        }
                    }
                ]
            );
            return;
        }

        // If turning ON
        Alert.alert(
            "Enable MFA",
            "MFA requires a setup flow with an authenticator app. Please use the web dashboard to complete the initial setup.",
            [{ text: "OK", onPress: () => setMfaEnabled(false) }]
        );
    };

    const handleSignOut = async () => {
        setShowSignOut(false);
        try {
            await clearTokens();
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
                <AdminBottomNavBar navigation={navigation} activeTab="Settings" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Profile Section */}
                    <Text style={styles.sectionTitle}>Profile</Text>
                    <View style={styles.card}>
                        <View style={styles.profileRow}>
                            <View style={styles.avatarLarge}>
                                <Ionicons name="person" size={32} color="#FFF" />
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={styles.profileName}>
                                    {adminInfo.firstName} {adminInfo.lastName}
                                </Text>
                                <Text style={styles.profileEmail}>{adminInfo.email}</Text>
                                <Text style={styles.profileRole}>Administrator</Text>
                            </View>
                        </View>
                    </View>

                    {/* Security Section */}
                    <Text style={styles.sectionTitle}>Security</Text>
                    <View style={styles.card}>
                        {/* Password */}
                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={() => setShowPasswordModal(true)}
                        >
                            <View style={styles.settingLeft}>
                                <View style={[styles.settingIcon, { backgroundColor: '#E3F2FD' }]}>
                                    <Ionicons name="key" size={20} color="#2196F3" />
                                </View>
                                <View>
                                    <Text style={styles.settingTitle}>Change Password</Text>
                                    <Text style={styles.settingSubtitle}>Update your account password</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* MFA Toggle */}
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <View style={[styles.settingIcon, { backgroundColor: '#E8F5E9' }]}>
                                    <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                                </View>
                                <View>
                                    <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
                                    <Text style={[styles.settingSubtitle, mfaEnabled && { color: COLORS.success }]}>
                                        {mfaEnabled ? 'Enabled' : 'Disabled'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={mfaEnabled}
                                onValueChange={handleToggleMFA}
                                trackColor={{ false: "#E0E0E0", true: COLORS.primary }}
                            />
                        </View>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate('AuditLogScreen')}
                        >
                            <Ionicons name="shield-checkmark-outline" size={22} color="#333" />
                            <Text style={styles.menuText}>Audit Logs</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {/* Admin Settings 
                    <Text style={styles.sectionTitle}>Admin Settings</Text>
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate('AdminOrganizationSettingsScreen')}
                        >
                            <Ionicons name="business-outline" size={22} color="#333" />
                            <Text style={styles.menuText}>Organization Settings</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate('AdminDeveloperSettingsScreen')}
                        >
                            <Ionicons name="code-slash-outline" size={22} color="#333" />
                            <Text style={styles.menuText}>Developer Settings</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate('AdminBackupSettingsScreen')}
                        >
                            <Ionicons name="cloud-upload-outline" size={22} color="#333" />
                            <Text style={styles.menuText}>Backup Settings</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionTitle}>Support</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.menuItem}>
                            <Ionicons name="help-circle-outline" size={22} color="#333" />
                            <Text style={styles.menuText}>Help & Support</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.menuItem}>
                            <Ionicons name="document-text-outline" size={22} color="#333" />
                            <Text style={styles.menuText}>Terms of Service</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.menuItem}>
                            <Ionicons name="shield-outline" size={22} color="#333" />
                            <Text style={styles.menuText}>Privacy Policy</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>
                    </View>
                    */}

                    {/* Sign Out */}
                    <TouchableOpacity
                        style={styles.signOutButton}
                        onPress={() => setShowSignOut(true)}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#F44336" />
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>Version 1.0.0</Text>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View >

            <AdminBottomNavBar navigation={navigation} activeTab="Settings" />

            {/* Password Change Modal */}
            <Modal
                visible={showPasswordModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Change Password</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Current Password</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Enter current password"
                                placeholderTextColor="#999"
                                secureTextEntry
                                value={passwordData.currentPassword}
                                onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>New Password</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Enter new password"
                                placeholderTextColor="#999"
                                secureTextEntry
                                value={passwordData.newPassword}
                                onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Confirm New Password</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Confirm new password"
                                placeholderTextColor="#999"
                                secureTextEntry
                                value={passwordData.confirmPassword}
                                onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => {
                                    setShowPasswordModal(false);
                                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                }}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalSaveBtn, changingPassword && styles.buttonDisabled]}
                                onPress={handleChangePassword}
                                disabled={changingPassword}
                            >
                                {changingPassword ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.modalSaveText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <SignOutModal
                visible={showSignOut}
                onCancel={() => setShowSignOut(false)}
                onConfirm={handleSignOut}
            />
        </SafeAreaView >
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

    profileRow: { flexDirection: 'row', alignItems: 'center' },
    avatarLarge: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    profileEmail: { fontSize: 13, color: '#666', marginTop: 2 },
    profileRole: { fontSize: 12, color: COLORS.primary, marginTop: 4, fontWeight: '600' },

    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    settingIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    settingTitle: { fontSize: 15, fontWeight: '500', color: '#333' },
    settingSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },

    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 5 },

    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    menuText: { flex: 1, fontSize: 15, color: '#333', marginLeft: 15 },

    signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEBEE', padding: 15, borderRadius: 12, marginTop: 15 },
    signOutText: { color: '#F44336', fontSize: 16, fontWeight: '600', marginLeft: 10 },

    versionText: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 20 },

    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
    inputGroup: { marginBottom: 15 },
    inputLabel: { fontSize: 13, color: '#666', marginBottom: 8 },
    modalInput: { backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 15, height: 50, fontSize: 15 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginRight: 10, alignItems: 'center' },
    modalCancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
    modalSaveBtn: { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, marginLeft: 10, alignItems: 'center' },
    modalSaveText: { color: 'white', fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.6 },
});