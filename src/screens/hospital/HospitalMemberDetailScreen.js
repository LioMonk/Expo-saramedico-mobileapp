import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { teamAPI } from '../../services/api';

export default function HospitalMemberDetailScreen({ route, navigation }) {
    const { member } = route.params;

    const handleRemove = () => {
        Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${member.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await teamAPI.removeTeamMember(member.id);
                            navigation.goBack();
                        } catch (error) {
                            console.log('Remove member error:', error);
                            const detail = error.response?.data?.detail;
                            const msg = Array.isArray(detail) ? detail.map(d => d.msg).join('\n') : (detail || 'Permission denied. Hospital administrators may need higher privileges for this action.');
                            Alert.alert('Removal Failed', msg);
                        }
                    }
                }
            ]
        );
    };

    const InfoRow = ({ label, value, icon }) => (
        <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Member Profile</Text>
                <TouchableOpacity onPress={handleRemove} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={22} color="#F44336" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarLarge}>
                        <Text style={styles.avatarTextLarge}>{member.name?.charAt(0)}</Text>
                    </View>
                    <Text style={styles.nameLarge}>{member.name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: COLORS.primary + '20' }]}>
                        <Text style={[styles.roleText, { color: COLORS.primary }]}>{member.role}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Information</Text>
                    <View style={styles.infoCard}>
                        <InfoRow label="Email Address" value={member.email} icon="mail-outline" />
                        <InfoRow label="Employee ID" value={member.id?.slice(0, 8)} icon="id-card-outline" />
                        <InfoRow
                            label="Status"
                            value={(() => {
                                const status = member.status?.toLowerCase();
                                const isActive = status === 'active' || status === 'accepted' || status === 'approved' || member.is_active === true;
                                if (isActive) return 'Active Account';
                                if (status === 'invited') return 'Sent - Waiting for Acceptance';
                                if (status === 'pending') return 'Profile Pending';
                                return 'Pending Invite';
                            })()}
                            icon="ellipse"
                        />
                        {member.specialty && (
                            <InfoRow label="Specialty" value={member.specialty} icon="medical-outline" />
                        )}
                    </View>
                </View>

                {member.role === 'Doctor' && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => navigation.navigate('HospitalEditDoctorScreen', { doctor: member })}
                        >
                            <Text style={styles.editBtnText}>Edit Clinical Details</Text>
                            <Ionicons name="create-outline" size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    backButton: { padding: 5 },
    deleteButton: { padding: 5 },

    profileHeader: { alignItems: 'center', paddingVertical: 30, backgroundColor: 'white', marginBottom: 20 },
    avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    avatarTextLarge: { fontSize: 40, fontWeight: 'bold', color: 'white' },
    nameLarge: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
    roleBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
    roleText: { fontWeight: '700', fontSize: 13 },

    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    infoCard: { backgroundColor: 'white', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#F0F0F0' },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    infoTextContainer: { flex: 1 },
    infoLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
    infoValue: { fontSize: 15, color: '#333', fontWeight: '600' },

    editBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, borderRadius: 12, gap: 10 },
    editBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
