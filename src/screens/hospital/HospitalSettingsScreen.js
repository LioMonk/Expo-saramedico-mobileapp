import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Switch,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Image,
    Platform,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { hospitalAPI, authAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_CONFIG } from '../../services/config';
import SignOutModal from '../../components/SignOutModal';

const PALETTE = {
    blue: '#3B82F6',
    bluLight: '#EFF6FF',
    green: '#10B981',
    red: '#EF4444',
    bg: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    sub: '#64748B',
    border: '#E2E8F0',
};

export default function HospitalSettingsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const [hospitalInfo, setHospitalInfo] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        avatar: null,
    });
    const [notifications, setNotifications] = useState({
        appointments: true,
        teamUpdates: true,
        patientAlerts: true,
    });

    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);

            // 1. Load Admin Profile
            let isUserAdmin = false;
            try {
                const profileRes = await authAPI.getCurrentUser();
                const u = profileRes.data || {};
                isUserAdmin = u.role === 'admin';
                setIsAdmin(isUserAdmin);
                setHospitalInfo(prev => ({
                    ...prev,
                    email: u.email || '',
                    name: u.full_name || u.name || '',
                    avatar: u.avatar_url || null,
                    phone: u.phone_number || '',
                }));
            } catch (e) { console.log('Profile fetch error'); }

            // 2. Load Organization Settings (Only for Admins)
            if (isUserAdmin) {
                try {
                    const settingsRes = await hospitalAPI.getSettings();
                    const org = settingsRes.data || {};
                    setHospitalInfo(prev => ({
                        ...prev,
                        name: org.name || prev.name, // Prefer org name if available
                    }));
                } catch (e) {
                    console.log('Org fetch info:', e.message);
                }
            }
        } catch (error) {
            console.log('Settings load error:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!hospitalInfo.name) {
            Alert.alert('Validation', 'Organization name is required.');
            return;
        }

        setSaving(true);
        try {
            // 1. Update Organization Settings
            await hospitalAPI.updateSettings({
                name: hospitalInfo.name,
                // These might be ignored by backend but we send them for completeness if needed
                timezone: 'UTC',
                date_format: 'DD/MM/YYYY'
            });

            // 2. Update Admin Profile (name)
            await hospitalAPI.updateAdminProfile({
                name: hospitalInfo.name,
                email: hospitalInfo.email
            });

            Alert.alert('✅ Success', 'Institutional profile updated successfully.');
            loadSettings();
        } catch (error) {
            console.error('Save error detailed:', error.response?.data || error.message);
            const msg = error.response?.data?.detail || 'Failed to sync changes with server.';
            Alert.alert('Update Failed', msg);
        } finally {
            setSaving(false);
        }
    };

    const handleImagePick = async () => {
        if (!isAdmin) return;
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/jpeg', 'image/png', 'image/jpg'],
                copyToCacheDirectory: true,
            });

            if (result.type === 'success' || !result.canceled) {
                const file = result.assets ? result.assets[0] : result;
                const imageUri = file.uri;
                setHospitalInfo(prev => ({ ...prev, avatar: imageUri }));

                try {
                    const uploadRes = await authAPI.uploadAvatar(imageUri);
                    if (uploadRes.data?.preview_url) {
                        setHospitalInfo(prev => ({ ...prev, avatar: uploadRes.data.preview_url }));
                    }
                } catch (err) {
                    Alert.alert('Upload Error', 'Failed to save profile picture.');
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
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
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={PALETTE.blue} />
                <Text style={styles.loadingText}>Loading configurations...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={PALETTE.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>System Settings</Text>
                {isAdmin ? (
                    <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveHeaderBtn}>
                        {saving ? <ActivityIndicator size="small" color={PALETTE.blue} /> : <Text style={styles.saveHeaderText}>Save</Text>}
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 44 }} />
                )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* ─── Profile Section ─── */}
                <View style={styles.profileSection}>
                    <TouchableOpacity style={styles.avatarWrapper} onPress={handleImagePick} activeOpacity={0.9} disabled={!isAdmin}>
                        <View style={styles.avatarContainer}>
                            {hospitalInfo.avatar ? (
                                <Image source={{ uri: hospitalInfo.avatar }} style={styles.avatarMain} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="business" size={40} color="white" />
                                </View>
                            )}
                        </View>
                        {isAdmin && (
                            <View style={styles.cameraIcon}>
                                <Ionicons name="camera" size={16} color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.profileName}>{hospitalInfo.name}</Text>
                    <View style={styles.badge}>
                        <Ionicons name="checkmark-circle" size={12} color={PALETTE.blue} />
                        <Text style={styles.badgeText}>Verified Institution</Text>
                    </View>
                </View>

                <Text style={styles.sectionLabel}>Institutional Profile</Text>
                <View style={styles.glassCard}>
                    <View style={styles.fieldRow}>
                        <Ionicons name="business-outline" size={20} color={PALETTE.sub} style={styles.fieldIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>Organization Name</Text>
                            <TextInput
                                style={[styles.input, !isAdmin && { color: PALETTE.sub }]}
                                value={hospitalInfo.name}
                                onChangeText={(t) => setHospitalInfo({ ...hospitalInfo, name: t })}
                                placeholder="Enter Name"
                                editable={isAdmin}
                            />
                        </View>
                    </View>
                    <View style={styles.fieldDivider} />
                    <View style={styles.fieldRow}>
                        <Ionicons name="mail-outline" size={20} color={PALETTE.sub} style={styles.fieldIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>Admin Email (Read-only)</Text>
                            <TextInput style={[styles.input, { color: PALETTE.sub }]} value={hospitalInfo.email} editable={false} />
                        </View>
                    </View>
                </View>

                {/* ─── Support & Actions ─── */}
                <Text style={styles.sectionLabel}>Advanced & Identity</Text>
                <View style={styles.glassCard}>
                    <TouchableOpacity style={styles.actionRowItem} onPress={() => setShowSignOutModal(true)}>
                        <Ionicons name="log-out-outline" size={20} color={PALETTE.red} />
                        <Text style={[styles.actionRowText, { color: PALETTE.red, fontWeight: '700' }]}>Sign Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.versionText}>SaraMedico Hospital Suite v1.4.2</Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <SignOutModal
                visible={showSignOutModal}
                onCancel={() => setShowSignOutModal(false)}
                onConfirm={handleSignOut}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PALETTE.bg },
    center: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, color: PALETTE.sub, fontSize: 13, fontWeight: '600' },
    scroll: { paddingHorizontal: 20, paddingTop: 10 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, marginBottom: 10 },
    backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: PALETTE.border },
    headerTitle: { fontSize: 18, fontWeight: '900', color: PALETTE.text },
    saveHeaderBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#E0F2FE' },
    saveHeaderText: { color: PALETTE.blue, fontWeight: '800', fontSize: 14 },

    profileSection: { alignItems: 'center', marginVertical: 25 },
    avatarWrapper: { position: 'relative' },
    avatarContainer: { width: 110, height: 110, borderRadius: 35, backgroundColor: 'white', padding: 4, borderWidth: 1, borderColor: PALETTE.border },
    avatarMain: { width: '100%', height: '100%', borderRadius: 32 },
    avatarPlaceholder: { flex: 1, backgroundColor: PALETTE.blue, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    cameraIcon: { position: 'absolute', bottom: -5, right: -5, width: 34, height: 34, borderRadius: 12, backgroundColor: PALETTE.text, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: PALETTE.bg },
    profileName: { fontSize: 22, fontWeight: '900', color: PALETTE.text, marginTop: 14 },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 8, gap: 5 },
    badgeText: { fontSize: 11, fontWeight: '800', color: PALETTE.blue, textTransform: 'uppercase' },

    sectionLabel: { fontSize: 13, fontWeight: '800', color: PALETTE.sub, marginBottom: 12, marginTop: 15, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
    glassCard: { backgroundColor: 'white', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: PALETTE.border, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },

    fieldRow: { flexDirection: 'row', gap: 15, paddingVertical: 10 },
    fieldIcon: { marginTop: 4 },
    inputLabel: { fontSize: 12, fontWeight: '700', color: PALETTE.sub, marginBottom: 2 },
    input: { fontSize: 15, fontWeight: '700', color: PALETTE.text, paddingVertical: 2 },
    fieldDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },

    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
    switchIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    switchTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.text },
    switchDesc: { fontSize: 12, color: PALETTE.sub, fontWeight: '500', marginTop: 1 },

    actionRowItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 12 },
    actionRowText: { flex: 1, fontSize: 15, fontWeight: '600', color: PALETTE.text },

    footer: { marginTop: 40, alignItems: 'center' },
    versionText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' }
});
