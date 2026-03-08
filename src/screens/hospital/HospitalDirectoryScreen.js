import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { hospitalAPI } from '../../services/api';

const PALETTE = {
    blue: '#3B82F6', bluLight: '#EFF6FF',
    green: '#10B981', greenLight: '#F0FDF4',
    bg: '#F8FAFC', card: '#FFFFFF',
    text: '#0F172A', sub: '#64748B', border: '#E2E8F0',
};

export default function HospitalDirectoryScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('doctors'); // 'doctors' | 'patients'
    const [search, setSearch] = useState('');
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);

    useEffect(() => { loadDirectory(); }, []);

    const loadDirectory = async () => {
        try {
            setLoading(true);
            try {
                const dirRes = await hospitalAPI.getDirectory();
                const data = dirRes.data || {};

                if (data.doctors) {
                    setDoctors(data.doctors.map(d => ({
                        id: d.id,
                        name: d.name || 'Unknown',
                        specialty: d.specialty || 'General Practice',
                        email: d.email || '',
                        phone: d.phone || '',
                        joinedAt: d.joinedAt || '',
                    })));
                } else {
                    setDoctors([]);
                }

                if (data.patients) {
                    setPatients(data.patients.map(p => ({
                        id: p.id,
                        name: p.name || 'Unknown',
                        mrn: p.mrn || 'N/A',
                        gender: p.gender || 'N/A',
                        dateOfBirth: p.dateOfBirth || '',
                        email: p.email || '',
                        joinedAt: p.joinedAt || '',
                    })));
                } else {
                    setPatients([]);
                }
            } catch (err) {
                // Fallback if endpoint unavilable
                // Fetch doctors by other means if directory is standard
                const [docsRes, membersRes, statusRes] = await Promise.allSettled([
                    hospitalAPI.getDoctors(),
                    hospitalAPI.getOrgMembers(),
                    hospitalAPI.getDoctorsStatus()
                ]);

                const docList = docsRes.status === 'fulfilled' ? (docsRes.value.data?.results || docsRes.value.data || []) : [];
                const statusData = statusRes.status === 'fulfilled' ? [
                    ...(statusRes.value.data?.active_doctors || []),
                    ...(statusRes.value.data?.inactive_doctors || [])
                ] : [];

                setDoctors(docList.map(d => {
                    const statusInfo = statusData.find(s => s.id === d.id);
                    return {
                        id: d.id,
                        name: d.name || d.full_name || 'Unknown',
                        specialty: d.specialty || 'General Practice',
                        email: d.email || '',
                        phone: d.phone || '',
                        joinedAt: d.joinedAt || d.created_at || '',
                        status: statusInfo ? statusInfo.status : 'inactive'
                    };
                }));

                const members = membersRes.status === 'fulfilled' ? (membersRes.value.data || []) : [];
                const patientList = members.filter(m => m.role === 'patient').map(p => ({
                    id: p.id,
                    name: p.full_name || p.name || 'Unknown',
                    mrn: p.mrn || 'N/A',
                    gender: p.gender || 'N/A',
                    dateOfBirth: p.date_of_birth || p.dob || '',
                    email: p.email || '',
                    joinedAt: p.created_at || '',
                }));
                setPatients(patientList);
            }
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadDirectory();
        setRefreshing(false);
    }, []);

    const filtered = (activeTab === 'doctors' ? doctors : patients).filter(item => {
        const q = search.toLowerCase();
        return (item.name || '').toLowerCase().includes(q) ||
            (item.specialty || '').toLowerCase().includes(q) ||
            (item.email || '').toLowerCase().includes(q) ||
            (item.mrn || '').toLowerCase().includes(q);
    });

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PALETTE.blue} />
                    <Text style={{ color: PALETTE.sub, marginTop: 12 }}>Loading directory…</Text>
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
                <Text style={styles.headerTitle}>Directory</Text>
                <View style={{ width: 38 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {[
                    { key: 'doctors', label: `Doctors (${doctors.length})`, icon: 'medical' },
                    { key: 'patients', label: `Patients (${patients.length})`, icon: 'people' },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? PALETTE.blue : PALETTE.sub} />
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color={PALETTE.sub} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={activeTab === 'doctors' ? 'Search by name or specialty…' : 'Search by name or MRN…'}
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

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PALETTE.blue]} />}
            >
                {filtered.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={52} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No {activeTab === 'doctors' ? 'doctors' : 'patients'} found</Text>
                    </View>
                ) : activeTab === 'doctors' ? (
                    filtered.map((doc, i) => (
                        <View key={doc.id || i} style={styles.card}>
                            <View style={styles.avatarWrapper}>
                                <View style={[styles.avatar, { backgroundColor: PALETTE.bluLight }]}>
                                    <Text style={[styles.avatarText, { color: PALETTE.blue }]}>
                                        {(doc.name || 'D').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.statusIndicator,
                                    { backgroundColor: doc.status === 'active' ? PALETTE.green : PALETTE.sub }
                                ]} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.name}>{doc.name}</Text>
                                    {doc.status === 'inactive' && (
                                        <Text style={styles.awayText}>(Away)</Text>
                                    )}
                                </View>
                                <Text style={styles.sub}>{doc.specialty}</Text>
                                {doc.email ? <Text style={styles.meta}>{doc.email}</Text> : null}
                                {doc.phone ? <Text style={styles.meta}>{doc.phone}</Text> : null}
                            </View>
                            <View style={[styles.badge, { backgroundColor: doc.status === 'active' ? PALETTE.greenLight : PALETTE.bluLight }]}>
                                <Text style={[styles.badgeText, { color: doc.status === 'active' ? PALETTE.green : PALETTE.blue }]}>Doctor</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    filtered.map((pat, i) => (
                        <View key={pat.id || i} style={styles.card}>
                            <View style={[styles.avatar, { backgroundColor: PALETTE.greenLight }]}>
                                <Text style={[styles.avatarText, { color: PALETTE.green }]}>
                                    {(pat.name || 'P').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.name}>{pat.name}</Text>
                                <Text style={styles.sub}>MRN: {pat.mrn}</Text>
                                {pat.gender !== 'N/A' && <Text style={styles.meta}>{pat.gender}</Text>}
                                {pat.dateOfBirth ? <Text style={styles.meta}>DOB: {pat.dateOfBirth}</Text> : null}
                            </View>
                            <View style={[styles.badge, { backgroundColor: PALETTE.greenLight }]}>
                                <Text style={[styles.badgeText, { color: PALETTE.green }]}>Patient</Text>
                            </View>
                        </View>
                    ))
                )
                }
                <View style={{ height: 80 }} />
            </ScrollView >
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PALETTE.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: PALETTE.card, borderBottomWidth: 1, borderBottomColor: PALETTE.border },
    backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: PALETTE.bg, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: PALETTE.text },

    tabs: { flexDirection: 'row', backgroundColor: PALETTE.card, paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: PALETTE.bg },
    tabActive: { backgroundColor: PALETTE.bluLight },
    tabText: { fontSize: 13, fontWeight: '700', color: PALETTE.sub },
    tabTextActive: { color: PALETTE.blue },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.card, marginHorizontal: 20, marginVertical: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderWidth: 1, borderColor: PALETTE.border },
    searchInput: { flex: 1, fontSize: 14, color: PALETTE.text },

    list: { paddingHorizontal: 20 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.card, borderRadius: 16, padding: 14, marginBottom: 10, gap: 14, borderWidth: 1, borderColor: PALETTE.border },
    avatar: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    avatarWrapper: { position: 'relative' },
    statusIndicator: { position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: PALETTE.card },
    avatarText: { fontSize: 15, fontWeight: '800' },
    name: { fontSize: 15, fontWeight: '700', color: PALETTE.text },
    awayText: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic' },
    sub: { fontSize: 12, color: PALETTE.sub, marginTop: 2 },
    meta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '800' },
    emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: PALETTE.sub, fontWeight: '600' },
});
