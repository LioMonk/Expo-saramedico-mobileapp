import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { teamAPI, hospitalAPI } from '../../services/api';

export default function HospitalTeamScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [roles, setRoles] = useState([]);

    useEffect(() => {
        loadTeamData();
    }, []);

    const loadTeamData = async () => {
        try {
            setLoading(true);

            // Load team members — use /team/staff (confirmed working ✅)
            try {
                const membersRes = await hospitalAPI.getStaff();
                setTeamMembers(membersRes.data || []);
            } catch (e) {
                console.log('Team members not available:', e.message);
                setTeamMembers([]);
            }

            // Load roles
            try {
                const rolesRes = await teamAPI.getTeamRoles();
                const rolesData = rolesRes.data || [];
                const roleStrings = rolesData.map(r => typeof r === 'string' ? r : r.role);
                setRoles(roleStrings);
            } catch (e) {
                console.log('Roles not available:', e.message);
                setRoles(['Doctor', 'Nurse', 'Admin', 'Receptionist']);
            }

        } catch (error) {
            console.error('Error loading team data:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTeamData();
        setRefreshing(false);
    };

    const handleRemoveMember = (member) => {
        Alert.alert(
            'Remove Team Member',
            `Are you sure you want to remove ${member.name} from the team?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await teamAPI.removeTeamMember(member.id);
                            loadTeamData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove team member');
                        }
                    }
                },
            ]
        );
    };

    const getRoleColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'doctor': return '#2196F3';
            case 'nurse': return '#4CAF50';
            case 'admin': return '#9C27B0';
            case 'receptionist': return '#FF9800';
            default: return '#666';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading team...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>
                {/* Header title only */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Team Management</Text>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                    }
                >
                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{teamMembers.length}</Text>
                            <Text style={styles.statLabel}>Total Members</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>
                                {teamMembers.filter(m => m.role === 'Doctor').length}
                            </Text>
                            <Text style={styles.statLabel}>Doctors</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>
                                {teamMembers.filter(m => m.status === 'active').length}
                            </Text>
                            <Text style={styles.statLabel}>Active</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.actionQuickBtn}
                            onPress={() => navigation.navigate('HospitalDepartmentsScreen')}
                        >
                            <Ionicons name="grid-outline" size={22} color={COLORS.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionQuickBtn, { flex: 2, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                            onPress={() => navigation.navigate('HospitalCreateDoctorScreen')}
                        >
                            <Ionicons name="medkit-outline" size={22} color="#16A34A" />
                            <Text style={[styles.actionQuickBtnText, { color: '#16A34A' }]}>Onboard Doctor</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionQuickBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
                            onPress={() => navigation.navigate('HospitalInviteTeamScreen')}
                        >
                            <Ionicons name="person-add-outline" size={22} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Team Members List */}
                    <Text style={styles.sectionTitle}>Team Members ({teamMembers.length})</Text>

                    {teamMembers.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={60} color="#DDD" />
                            <Text style={styles.emptyText}>No team members yet</Text>
                            <Text style={styles.emptySubtext}>Invite your first team member</Text>
                        </View>
                    ) : (
                        teamMembers.map((member, index) => (
                            <TouchableOpacity
                                key={member.id || index}
                                style={styles.memberCard}
                                onPress={() => navigation.navigate('HospitalMemberDetailScreen', { member })}
                            >
                                <View style={[styles.memberAvatar, { backgroundColor: getRoleColor(member.role) + '20' }]}>
                                    <Ionicons
                                        name={member.role === 'Doctor' ? 'medical' : 'person'}
                                        size={24}
                                        color={getRoleColor(member.role)}
                                    />
                                </View>
                                <View style={styles.memberInfo}>
                                    <Text style={styles.memberName}>{member.name}</Text>
                                    <Text style={styles.memberRole}>{member.role}</Text>
                                    {member.specialty && (
                                        <Text style={styles.memberSpecialty}>{member.specialty}</Text>
                                    )}
                                </View>
                                <View style={styles.memberActions}>
                                    <View style={[
                                        styles.statusBadge,
                                        { backgroundColor: member.status === 'active' ? '#E8F5E9' : '#FFF3E0' }
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            { color: member.status === 'active' ? '#4CAF50' : '#FF9800' }
                                        ]}>
                                            {member.status === 'active' ? 'Active' : 'Pending'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => handleRemoveMember(member)}
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#F44336" />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
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

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statBox: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#F0F0F0' },
    statNumber: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
    statLabel: { fontSize: 12, color: '#666', marginTop: 4 },

    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
    actionQuickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E3F2FD', height: 60, borderRadius: 16, borderWidth: 1, borderColor: '#BBDEFB' },
    actionQuickBtnText: { fontSize: 13, fontWeight: '700', marginLeft: 8 },
    inviteButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, height: 60, borderRadius: 16 },
    inviteButtonText: { color: 'white', fontSize: 15, fontWeight: '700', marginLeft: 8 },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 15 },

    emptyContainer: { alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#666', marginTop: 15 },
    emptySubtext: { fontSize: 13, color: '#999', marginTop: 5 },

    memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
    memberAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    memberRole: { fontSize: 13, color: '#666', marginTop: 2 },
    memberSpecialty: { fontSize: 11, color: '#999', marginTop: 2 },
    memberActions: { alignItems: 'flex-end' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
    statusText: { fontSize: 11, fontWeight: '600' },
    removeButton: { padding: 5 },
});
