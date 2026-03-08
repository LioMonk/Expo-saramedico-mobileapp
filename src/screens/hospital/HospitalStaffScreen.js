import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { hospitalAPI, teamAPI } from '../../services/api';

const PALETTE = {
    blue: '#3B82F6', bluLight: '#EFF6FF',
    green: '#10B981', greenLight: '#F0FDF4',
    amber: '#F59E0B', amberLight: '#FFFBEB',
    red: '#EF4444', redLight: '#FEF2F2',
    purple: '#8B5CF6', purpleLight: '#EDE9FE',
    bg: '#F8FAFC', card: '#FFFFFF',
    text: '#0F172A', sub: '#64748B', border: '#E2E8F0',
};

const ROLE_COLORS = {
    doctor: { color: PALETTE.blue, bg: PALETTE.bluLight },
    patient: { color: PALETTE.green, bg: PALETTE.greenLight },
    hospital: { color: PALETTE.purple, bg: PALETTE.purpleLight },
    admin: { color: PALETTE.amber, bg: PALETTE.amberLight },
    default: { color: PALETTE.sub, bg: '#F1F5F9' },
};

export default function HospitalStaffScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [staff, setStaff] = useState([]);
    const [orgId, setOrgId] = useState(null);
    const [filterTab, setFilterTab] = useState('All');

    // Invite modal state
    const [showInvite, setShowInvite] = useState(false);
    const [invEmail, setInvEmail] = useState('');
    const [invName, setInvName] = useState('');
    const [invRole, setInvRole] = useState('MEMBER');
    const [invTitle, setInvTitle] = useState('');
    const [inviting, setInviting] = useState(false);

    useEffect(() => { loadStaff(); }, []);

    const loadStaff = async () => {
        try {
            setLoading(true);
            try {
                const res = await hospitalAPI.getStaffData();
                const data = res.data || {};

                if (data.staff) {
                    setStaff(data.staff.map(s => ({
                        id: s.id,
                        name: s.name || 'Unknown',
                        role: s.role || 'Staff',
                        specialty: s.specialty || '',
                        email: s.email || '',
                        phone: s.phone || '',
                        status: s.status || 'Active',
                    })));
                    const orgRes = await hospitalAPI.getOrganization();
                    if (orgRes.data?.id) setOrgId(orgRes.data.id);
                    return; // skip fallback
                }
            } catch (err) {
                console.log('Staff endpoint error, falling back:', err.message);
            }

            const [staffRes, orgRes, statusRes] = await Promise.allSettled([
                hospitalAPI.getStaff(),
                hospitalAPI.getOrganization(),
                hospitalAPI.getDoctorsStatus()
            ]);

            const staffList = staffRes.status === 'fulfilled' ? (staffRes.value.data || []) : [];
            const statusData = statusRes.status === 'fulfilled' ? [
                ...(statusRes.value.data?.active_doctors || []),
                ...(statusRes.value.data?.inactive_doctors || [])
            ] : [];

            setStaff(staffList.map(s => {
                const isDoctor = ['doctor', 'physician'].includes((s.role || '').toLowerCase());
                const statusInfo = isDoctor ? statusData.find(st => st.id === s.id) : null;

                return {
                    id: s.id,
                    name: s.name || s.full_name || 'Unknown',
                    role: s.role || 'Staff',
                    specialty: s.specialty || '',
                    email: s.email || '',
                    phone: s.phone || '',
                    status: statusInfo ? (statusInfo.status === 'active' ? 'Active' : 'Inactive') : (s.status || 'Active'),
                    lastAccessed: s.last_accessed || s.created_at || '',
                };
            }));
            if (orgRes.status === 'fulfilled' && orgRes.value.data?.id) setOrgId(orgRes.value.data.id);
        } catch (err) {
            console.error('Staff load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadStaff();
        setRefreshing(false);
    }, []);

    const handleInvite = async () => {
        if (!invEmail.trim() || !invName.trim()) {
            Alert.alert('Missing Fields', 'Email and full name are required.');
            return;
        }
        if (!invEmail.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }
        setInviting(true);
        try {
            await teamAPI.inviteTeamMember({
                email: invEmail.trim(),
                full_name: invName.trim(),
                role: invRole,
                department_id: orgId || '00000000-0000-0000-0000-000000000000',
                department_role: invTitle.trim() || (invRole === 'MEMBER' ? 'Physician' : 'Hospital Manager'),
            });
            Alert.alert('✅ Invitation Sent', `An invitation was sent to ${invEmail}.`);
            setShowInvite(false);
            setInvEmail(''); setInvName(''); setInvTitle(''); setInvRole('MEMBER');
            loadStaff();
        } catch (e) {
            const detail = e.response?.data?.detail;
            const msg = Array.isArray(detail) ? detail.map(d => d.msg).join('\n') : (detail || 'Failed to send invitation.');
            Alert.alert('Error', msg);
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveStaff = (member) => {
        Alert.alert(
            "Remove Staff member",
            `Are you sure you want to remove ${member.name}? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await teamAPI.removeTeamMember(member.id);
                            Alert.alert("Success", "Staff member removed successfully.");
                            loadStaff();
                        } catch (err) {
                            console.log('Remove staff error:', err);
                            const detail = err.response?.data?.detail;
                            const msg = Array.isArray(detail) ? detail.map(d => d.msg).join('\n') : (detail || 'Permission denied. Hospital administrators may need higher privileges for this action.');
                            Alert.alert("Removal Failed", msg);
                            // Refresh anyway in case it was partially successful or state is out of sync
                            loadStaff();
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const filtered = staff.filter(s => {
        const q = search.toLowerCase();
        const textMatch = (s.name || '').toLowerCase().includes(q) ||
            (s.role || '').toLowerCase().includes(q) ||
            (s.email || '').toLowerCase().includes(q) ||
            (s.specialty || '').toLowerCase().includes(q);

        if (filterTab === 'Active') {
            return textMatch && (s.status?.toLowerCase() === 'active' || s.status?.toLowerCase() === 'accepted' || s.is_active === true);
        }
        if (filterTab === 'Inactive') {
            const status = s.status?.toLowerCase();
            const isActive = status === 'active' || status === 'accepted' || s.is_active === true;
            return textMatch && !isActive;
        }
        return textMatch;
    });

    const getRoleColor = (role) => {
        const r = (role || '').toLowerCase();
        return ROLE_COLORS[r] || ROLE_COLORS.default;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PALETTE.blue} />
                    <Text style={{ color: PALETTE.sub, marginTop: 12 }}>Loading staff…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={PALETTE.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Staff Management</Text>
                <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowInvite(true)}>
                    <Ionicons name="person-add" size={18} color={PALETTE.blue} />
                </TouchableOpacity>
            </View>

            {/* Metrics */}
            <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{staff.length}</Text>
                    <Text style={styles.metricLabel}>Total Staff</Text>
                </View>
                <View style={styles.metricCard}>
                    <Text style={[styles.metricValue, { color: PALETTE.blue }]}>
                        {staff.filter(s => ['doctor', 'physician'].includes((s.role || '').toLowerCase())).length}
                    </Text>
                    <Text style={styles.metricLabel}>Doctors</Text>
                </View>
                <View style={styles.metricCard}>
                    <Text style={[styles.metricValue, { color: PALETTE.green }]}>
                        {staff.filter(s => {
                            const status = s.status?.toLowerCase();
                            return status === 'active' || status === 'accepted' || s.is_active === true;
                        }).length}
                    </Text>
                    <Text style={styles.metricLabel}>Active</Text>
                </View>
            </View>

            {/* Invite Button Banner */}
            <TouchableOpacity style={styles.inviteBanner} onPress={() => setShowInvite(true)}>
                <View style={styles.inviteBannerIcon}>
                    <Ionicons name="person-add-outline" size={20} color={PALETTE.blue} />
                </View>
                <Text style={styles.inviteBannerText}>Invite Doctor</Text>
                <Ionicons name="chevron-forward" size={18} color={PALETTE.blue} />
            </TouchableOpacity>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color={PALETTE.sub} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search staff, reports, notes..."
                    placeholderTextColor="#94A3B8"
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={18} color={PALETTE.sub} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabsContainer}>
                {['All', 'Active', 'Inactive'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.filterTab, filterTab === tab && styles.filterTabActive]}
                        onPress={() => setFilterTab(tab)}
                    >
                        <Text style={[styles.filterTabText, filterTab === tab && styles.filterTabTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PALETTE.blue]} />}
            >
                {filtered.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={52} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No staff members found</Text>
                    </View>
                ) : filtered.map((member, i) => {
                    const rc = getRoleColor(member.role);
                    return (
                        <View key={member.id || i} style={styles.card}>
                            <View style={[styles.avatar, { backgroundColor: rc.bg }]}>
                                <Text style={[styles.avatarText, { color: rc.color }]}>
                                    {(member.name || 'S').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.name}>{member.name}</Text>
                                <Text style={styles.email}>{member.email}</Text>
                                {member.specialty ? <Text style={styles.specialty}>{member.specialty}</Text> : null}
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                <View style={[styles.roleBadge, { backgroundColor: rc.bg }]}>
                                    <Text style={[styles.roleText, { color: rc.color }]}>{member.role}</Text>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    {
                                        backgroundColor: (() => {
                                            const status = member.status?.toLowerCase();
                                            const isActive = status === 'active' || status === 'accepted' || status === 'approved' || member.is_active === true;
                                            return isActive ? PALETTE.greenLight : PALETTE.amberLight;
                                        })()
                                    }
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        {
                                            color: (() => {
                                                const status = member.status?.toLowerCase();
                                                const isActive = status === 'active' || status === 'accepted' || status === 'approved' || member.is_active === true;
                                                return isActive ? PALETTE.green : PALETTE.amber;
                                            })()
                                        }
                                    ]}>
                                        {(() => {
                                            const status = member.status?.toLowerCase();
                                            const isActive = status === 'active' || status === 'accepted' || status === 'approved' || member.is_active === true;
                                            if (isActive) return 'Active';
                                            if (status === 'invited') return 'Pending';
                                            return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
                                        })()}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                    {['doctor', 'physician'].includes((member.role || '').toLowerCase()) && (
                                        <TouchableOpacity
                                            style={styles.manageBtn}
                                            onPress={() => navigation.navigate('HospitalEditDoctorScreen', { doctor: member })}
                                        >
                                            <Text style={styles.manageBtnText}>Manage</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.manageBtn, { borderColor: PALETTE.red + '40', backgroundColor: PALETTE.redLight, paddingHorizontal: 8 }]}
                                        onPress={() => handleRemoveStaff(member)}
                                    >
                                        <Ionicons name="trash-outline" size={14} color={PALETTE.red} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    );
                })}
                <View style={{ height: 80 }} />
            </ScrollView>

            {/* Invite Modal */}
            <Modal visible={showInvite} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Invite Doctor</Text>
                            <TouchableOpacity onPress={() => setShowInvite(false)}>
                                <Ionicons name="close" size={22} color={PALETTE.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.fieldLabel}>Full Name *</Text>
                        <TextInput style={styles.fieldInput} placeholder="Dr. Jane Smith" value={invName} onChangeText={setInvName} placeholderTextColor="#94A3B8" />
                        <Text style={styles.fieldLabel}>Email Address *</Text>
                        <TextInput style={styles.fieldInput} placeholder="doctor@example.com" value={invEmail} onChangeText={setInvEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#94A3B8" />
                        <Text style={styles.fieldLabel}>Title / Specialty</Text>
                        <TextInput style={styles.fieldInput} placeholder="e.g. Senior Physician / Cardiologist" value={invTitle} onChangeText={setInvTitle} placeholderTextColor="#94A3B8" />
                        <Text style={styles.fieldLabel}>Role</Text>
                        <View style={styles.roleRow}>
                            {[
                                { label: 'Doctor\n(MEMBER)', value: 'MEMBER' },
                                { label: 'Manager\n(ADMIN)', value: 'ADMINISTRATOR' },
                            ].map(r => (
                                <TouchableOpacity
                                    key={r.value}
                                    style={[styles.roleChip, invRole === r.value && styles.roleChipActive]}
                                    onPress={() => setInvRole(r.value)}
                                >
                                    <Text style={[styles.roleChipText, invRole === r.value && styles.roleChipTextActive]}>{r.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.note}>
                            ℹ️ Note from Hospitalflow.pdf: Use "MEMBER" for Doctors, "ADMINISTRATOR" for Hospital Managers.
                        </Text>
                        <TouchableOpacity style={[styles.createBtn, inviting && { opacity: 0.6 }]} onPress={handleInvite} disabled={inviting}>
                            {inviting ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Ionicons name="send" size={16} color="white" />
                                    <Text style={styles.createBtnText}>Send Invitation</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PALETTE.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { paddingHorizontal: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: PALETTE.card, borderBottomWidth: 1, borderBottomColor: PALETTE.border },
    backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: PALETTE.bg, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: PALETTE.text },
    inviteBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: PALETTE.bluLight, justifyContent: 'center', alignItems: 'center' },

    metricsRow: { flexDirection: 'row', padding: 20, gap: 10 },
    metricCard: { flex: 1, backgroundColor: PALETTE.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: PALETTE.border },
    metricValue: { fontSize: 24, fontWeight: '800', color: PALETTE.text },
    metricLabel: { fontSize: 11, color: PALETTE.sub, fontWeight: '600', marginTop: 2 },

    inviteBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.bluLight, marginHorizontal: 20, marginBottom: 16, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: '#BFDBFE' },
    inviteBannerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
    inviteBannerText: { flex: 1, fontSize: 14, fontWeight: '700', color: PALETTE.blue },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.card, marginHorizontal: 20, marginBottom: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderWidth: 1, borderColor: PALETTE.border },
    searchInput: { flex: 1, fontSize: 14, color: PALETTE.text },

    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.card, borderRadius: 16, padding: 14, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: PALETTE.border },
    avatar: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 15, fontWeight: '800' },
    name: { fontSize: 14, fontWeight: '700', color: PALETTE.text },
    email: { fontSize: 12, color: PALETTE.sub, marginTop: 2 },
    specialty: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    roleText: { fontSize: 10, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '800' },
    manageBtn: { marginTop: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: PALETTE.border, backgroundColor: PALETTE.bg },
    manageBtnText: { fontSize: 11, fontWeight: '700', color: PALETTE.text },

    filterTabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
    filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: PALETTE.border, backgroundColor: '#FFF' },
    filterTabActive: { backgroundColor: PALETTE.blue, borderColor: PALETTE.blue },
    filterTabText: { fontSize: 12, fontWeight: '700', color: PALETTE.sub },
    filterTabTextActive: { color: '#FFF' },

    emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: PALETTE.sub, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: PALETTE.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: PALETTE.text },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: PALETTE.text, marginBottom: 6, marginTop: 12 },
    fieldInput: { backgroundColor: PALETTE.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: PALETTE.text, borderWidth: 1, borderColor: PALETTE.border },
    roleRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    roleChip: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: PALETTE.border, alignItems: 'center', backgroundColor: PALETTE.bg },
    roleChipActive: { backgroundColor: PALETTE.bluLight, borderColor: PALETTE.blue },
    roleChipText: { fontSize: 12, fontWeight: '700', color: PALETTE.sub, textAlign: 'center' },
    roleChipTextActive: { color: PALETTE.blue },
    note: { fontSize: 11, color: PALETTE.sub, marginTop: 12, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10 },
    createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PALETTE.blue, borderRadius: 14, paddingVertical: 14, marginTop: 16 },
    createBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
