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
    amber: '#F59E0B', amberLight: '#FFFBEB',
    bg: '#F8FAFC', card: '#FFFFFF',
    text: '#0F172A', sub: '#64748B', border: '#E2E8F0',
};

export default function HospitalPatientsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState([]);
    const [metrics, setMetrics] = useState({ active: 0, today: 0, pending: 0 });
    const [consultations, setConsultations] = useState([]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            try {
                const res = await hospitalAPI.getPatientsData();
                const data = res.data || {};

                if (data.metrics) {
                    setMetrics({
                        active: data.metrics.activePatients || 0,
                        today: data.metrics.patientsToday || 0,
                        pending: data.metrics.pendingPatients || 0,
                    });
                }

                if (data.patients) {
                    setPatients(data.patients.map(p => ({
                        id: p.id,
                        name: p.name || 'Unknown',
                        mrn: p.mrn || 'N/A',
                        gender: p.gender || 'N/A',
                        email: p.email || '',
                        lastVisit: p.lastVisit || null,
                        status: p.lastVisit ? 'active' : 'new',
                    })));
                    return; // Skip fallback
                }
            } catch (err) {
                // Fallback to manual assembly if endpoint doesn't work
                console.log('Patients endpoint error, falling back to manual merge:', err.message);
            }

            // Fallback Manual Load
            const [membersRes, consRes] = await Promise.all([
                hospitalAPI.getOrgMembers(),
                hospitalAPI.getConsultations({ limit: 100 }),
            ]);

            const members = membersRes.data || [];
            const patientMembers = members.filter(m => m.role === 'patient');

            const consultationList = consRes.data?.consultations || [];
            setConsultations(consultationList);

            // Build last visit map from consultations
            const lastVisitMap = {};
            consultationList.forEach(c => {
                const pid = c.patientId || c.patient_id;
                if (pid && c.scheduledAt) {
                    if (!lastVisitMap[pid] || new Date(c.scheduledAt) > new Date(lastVisitMap[pid])) {
                        lastVisitMap[pid] = c.scheduledAt;
                    }
                }
            });

            const today = new Date().toDateString();
            let todayCount = 0;
            consultationList.forEach(c => {
                if (c.scheduledAt && new Date(c.scheduledAt).toDateString() === today) todayCount++;
            });

            const enriched = patientMembers.map(p => ({
                id: p.id,
                name: p.full_name || p.name || 'Unknown',
                mrn: p.mrn || 'N/A',
                gender: p.gender || 'N/A',
                email: p.email || '',
                lastVisit: lastVisitMap[p.id] || null,
                status: lastVisitMap[p.id] ? 'active' : 'new',
            }));

            setPatients(enriched);
            setMetrics({
                active: enriched.filter(p => p.status === 'active').length,
                today: todayCount,
                pending: enriched.filter(p => p.status === 'new').length,
            });
        } catch (err) {
            console.error('Patients load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const filtered = patients.filter(p => {
        const q = search.toLowerCase();
        return (p.name || '').toLowerCase().includes(q) ||
            (p.mrn || '').toLowerCase().includes(q) ||
            (p.email || '').toLowerCase().includes(q);
    });

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PALETTE.green} />
                    <Text style={{ color: PALETTE.sub, marginTop: 12 }}>Loading patients…</Text>
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
                <Text style={styles.headerTitle}>Patients</Text>
                <View style={{ width: 38 }} />
            </View>
            <View style={styles.headerSubtitleContainer}>
                <Text style={styles.headerSubtitleText}>Comprehensive registry of all clinical patients across hospital wings.</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PALETTE.green]} />}
            >
                {/* Metric Cards */}
                <View style={styles.metricsRow}>
                    {[
                        { label: 'Active Patients', value: metrics.active, color: PALETTE.green, bg: PALETTE.greenLight, icon: 'heart' },
                        { label: 'Patients Today', value: metrics.today, color: PALETTE.blue, bg: PALETTE.bluLight, icon: 'today' },
                        { label: 'Critical Alerts', value: 0, color: PALETTE.amber, bg: PALETTE.amberLight, icon: 'alert-circle' },
                    ].map(m => (
                        <View key={m.label} style={styles.metricCard}>
                            <View style={[styles.metricIcon, { backgroundColor: m.bg }]}>
                                <Ionicons name={m.icon} size={18} color={m.color} />
                            </View>
                            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
                            <Text style={styles.metricLabel}>{m.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={18} color={PALETTE.sub} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or MRN…"
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

                {/* Column Header */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 2 }]}>NAME / MRN</Text>
                    <Text style={[styles.th, { flex: 1 }]}>GENDER</Text>
                    <Text style={[styles.th, { flex: 1.5 }]}>LAST VISIT</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>ACTION</Text>
                </View>

                {/* Patient Rows */}
                {filtered.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={52} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No patients found</Text>
                    </View>
                ) : filtered.map((p, i) => (
                    <View key={p.id || i} style={[styles.row, i % 2 === 0 && styles.rowAlt]}>
                        <View style={{ flex: 2 }}>
                            <Text style={styles.name}>{p.name}</Text>
                            <Text style={styles.mrn}>MRN: {p.mrn}</Text>
                        </View>
                        <Text style={[styles.cell, { flex: 1 }]}>{p.gender}</Text>
                        <Text style={[styles.cell, { flex: 1.5 }]}>
                            {p.lastVisit
                                ? new Date(p.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : '—'}
                        </Text>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <TouchableOpacity
                                style={styles.viewRecordsBtn}
                                onPress={() => navigation.navigate('HospitalPatientDetailScreen', {
                                    patientId: p.id,
                                    patientName: p.name
                                })}
                            >
                                <Text style={styles.viewRecordsText}>View</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                <View style={{ height: 80 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PALETTE.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: PALETTE.card, borderBottomWidth: 1, borderBottomColor: PALETTE.border },
    backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: PALETTE.bg, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: PALETTE.text },
    headerSubtitleContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
    headerSubtitleText: { fontSize: 13, color: PALETTE.sub, fontWeight: '500' },

    metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    metricCard: { flex: 1, backgroundColor: PALETTE.card, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: PALETTE.border },
    metricIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    metricValue: { fontSize: 24, fontWeight: '800' },
    metricLabel: { fontSize: 10, color: PALETTE.sub, fontWeight: '600', textAlign: 'center', marginTop: 2 },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderWidth: 1, borderColor: PALETTE.border, marginBottom: 16 },
    searchInput: { flex: 1, fontSize: 14, color: PALETTE.text },

    tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 10, marginBottom: 4 },
    th: { fontSize: 10, fontWeight: '800', color: PALETTE.sub, letterSpacing: 0.5 },

    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10 },
    rowAlt: { backgroundColor: PALETTE.card },
    name: { fontSize: 14, fontWeight: '700', color: PALETTE.text },
    mrn: { fontSize: 11, color: PALETTE.sub, marginTop: 2 },
    cell: { fontSize: 13, color: PALETTE.sub },
    viewRecordsBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: PALETTE.border, backgroundColor: PALETTE.bg },
    viewRecordsText: { fontSize: 11, fontWeight: '700', color: PALETTE.text },

    emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: PALETTE.sub, fontWeight: '600' },
});
