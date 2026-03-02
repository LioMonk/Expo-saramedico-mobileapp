import React, { useState } from 'react';
import {
    View, Text, TextInput, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import AdminBottomNavBar from '../../components/AdminBottomNavBar';

export default function AdminEditUserScreen({ route, navigation }) {
    const { user } = route.params || {};
    const [selectedRole, setSelectedRole] = useState(user?.role || 'Administrator');
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit User Permissions</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="camera-outline" size={30} color="#999" />
                            </View>
                            <View style={styles.editBadge}>
                                <Ionicons name="pencil" size={12} color="white" />
                            </View>
                        </View>
                        <Text style={styles.userName}>{user?.name || 'Unknown User'}</Text>
                        <Text style={styles.userMeta}>Role: {user?.role || 'User'}</Text>
                    </View>

                    {/* Form Fields */}
                    <Text style={styles.label}>FULL NAME</Text>
                    <TextInput value={name} onChangeText={setName} placeholder="Your name" style={styles.input} />

                    <Text style={styles.label}>EMAIL ADDRESS</Text>
                    <TextInput value={email} onChangeText={setEmail} placeholder="yourmail@gmail.com" style={styles.input} />

                    {/* Role Selection (Reusing the card logic structure) */}
                    <Text style={styles.sectionHeader}>User Role</Text>
                    <View style={styles.roleContainer}>
                        <RoleCard
                            title="Administrator"
                            sub="Full Platform Access"
                            icon="lock-closed"
                            isActive={selectedRole === 'Administrator'}
                            onPress={() => setSelectedRole('Administrator')}
                            features={[
                                { text: 'Manage team & billing', allowed: true },
                                { text: 'Full patient record access', allowed: true },
                                { text: 'Configure AI settings', allowed: true },
                            ]}
                        />
                        <RoleCard
                            title="Member"
                            sub="Clinician & Staff"
                            icon="lock-closed"
                            isActive={selectedRole === 'Member'}
                            onPress={() => setSelectedRole('Member')}
                            features={[
                                { text: 'View assigned patients', allowed: true },
                                { text: 'Use AI diagnostic tool', allowed: true },
                                { text: 'No billing access', allowed: false },
                            ]}
                        />
                    </View>

                    {/* Footer Buttons */}
                    <View style={styles.footerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn}>
                            <Text style={styles.saveText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 40 }} />

                </ScrollView>
            </View>
            <AdminBottomNavBar navigation={navigation} activeTab="Records" />
        </SafeAreaView>
    );
}

// Reusing RoleCard Helper (Same as above)
const RoleCard = ({ title, sub, icon, isActive, onPress, features }) => (
    <TouchableOpacity
        style={[styles.roleCard, isActive && styles.roleCardActive]}
        onPress={onPress}
        activeOpacity={0.8}
    >
        <View style={styles.roleHeader}>
            <View style={styles.iconBox}>
                <Ionicons name={icon} size={16} color="#333" />
            </View>
            <View>
                <Text style={styles.roleTitle}>{title}</Text>
                <Text style={styles.roleSub}>{sub}</Text>
            </View>
        </View>
        <View style={styles.divider} />
        {features.map((f, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name={f.allowed ? "checkmark" : "close"} size={14} color={f.allowed ? COLORS.success : '#999'} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 11, color: '#666' }}>{f.text}</Text>
            </View>
        ))}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    contentContainer: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },

    profileSection: { alignItems: 'center', marginBottom: 25 },
    avatarContainer: { width: 100, height: 100, marginBottom: 15, position: 'relative' },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white', borderStyle: 'dashed' },
    editBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: COLORS.primary, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    userMeta: { fontSize: 13, color: '#999', marginTop: 4 },

    label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 8, textTransform: 'uppercase' },
    input: { backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#EEE', paddingHorizontal: 15, height: 50, marginBottom: 20 },

    sectionHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
    roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    roleCard: { width: '48%', backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EEE' },
    roleCardActive: { borderColor: COLORS.primary, borderWidth: 1.5 },
    roleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    iconBox: { width: 30, height: 30, backgroundColor: '#E3F2FD', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    roleTitle: { fontSize: 13, fontWeight: 'bold' },
    roleSub: { fontSize: 10, color: '#666' },
    divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 10 },

    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    cancelText: { fontWeight: 'bold', color: '#333', fontSize: 16, marginLeft: 20 },
    saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
    saveText: { color: 'white', fontWeight: 'bold' }
});