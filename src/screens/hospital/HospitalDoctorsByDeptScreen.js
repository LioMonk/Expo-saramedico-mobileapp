import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { hospitalAPI } from '../../services/api';

export default function HospitalDoctorsByDeptScreen({ route, navigation }) {
    const { department } = route.params;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [doctors, setDoctors] = useState([]);

    useEffect(() => {
        loadDoctors();
    }, [department]);

    const loadDoctors = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            // Fetch both for maximum coverage
            const [deptRes, statusRes] = await Promise.allSettled([
                hospitalAPI.getDoctorsByDepartment(department),
                hospitalAPI.getDoctorsStatus()
            ]);

            let sourceDoctors = [];
            if (statusRes.status === 'fulfilled') {
                const data = statusRes.value.data;
                sourceDoctors = [
                    ...(data?.active_doctors || []),
                    ...(data?.inactive_doctors || [])
                ];
            }

            // Filter logic: Match by department name OR specialty name (case-insensitive)
            const searchKey = (department || '').toLowerCase().trim();
            let filtered = sourceDoctors.filter(doc => {
                const docDept = (doc.department || '').toLowerCase().trim();
                const docSpec = (doc.specialty || '').toLowerCase().trim();
                return docDept === searchKey || docSpec === searchKey;
            });

            // If local filtering produced nothing, fallback to the direct department endpoint
            if (filtered.length === 0 && deptRes.status === 'fulfilled') {
                const deptResults = deptRes.value.data?.results || [];
                // Ensure they have the correct status if missing
                filtered = deptResults.map(doc => {
                    const statusInfo = sourceDoctors.find(s => s.id === doc.id);
                    return { ...doc, status: statusInfo ? statusInfo.status : (doc.status || 'inactive') };
                });
            }

            setDoctors(filtered);
        } catch (error) {
            console.log('Error fetching doctors:', error.message);
            setDoctors([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getInitials = (name) => {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'DR';
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <View style={styles.titleGroup}>
                        <Text style={styles.headerTitle}>{department} Department</Text>
                        <Text style={styles.headerSub}>Manage roles, permissions, and staff assignments for the {department.toLowerCase()} wing.</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => navigation.navigate('HospitalCreateDoctorScreen', { department })}
                    >
                        <Ionicons name="person-add" size={22} color="white" />
                    </TouchableOpacity>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Fetching clinicians...</Text>
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDoctors(true)} colors={[COLORS.primary]} />}
                    >
                        {doctors.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={80} color="#E2E8F0" />
                                <Text style={styles.emptyText}>No doctors registered in {department}</Text>
                                <TouchableOpacity
                                    style={styles.emptyAddBtn}
                                    onPress={() => navigation.navigate('HospitalCreateDoctorScreen', { department })}
                                >
                                    <Text style={styles.emptyAddBtnText}>Onboard First Doctor</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            doctors.map((doctor) => (
                                <TouchableOpacity
                                    key={doctor.id}
                                    style={styles.doctorCard}
                                    onPress={() => navigation.navigate('HospitalEditDoctorScreen', { doctor })}
                                >
                                    <View style={styles.doctorHeader}>
                                        <View style={styles.avatarContainer}>
                                            {doctor.photo_url ? (
                                                <Image source={{ uri: doctor.photo_url }} style={styles.avatar} />
                                            ) : (
                                                <View style={styles.initialsAvatar}>
                                                    <Text style={styles.initialsText}>{getInitials(doctor.name)}</Text>
                                                </View>
                                            )}
                                            <View style={[
                                                styles.activeBadge,
                                                { backgroundColor: doctor.status === 'active' ? '#10B981' : '#94A3B8' }
                                            ]} />
                                        </View>
                                        <View style={styles.doctorInfo}>
                                            <View style={styles.nameRow}>
                                                <Text style={styles.doctorName} numberOfLines={1}>{doctor.name}</Text>
                                                <View style={[
                                                    styles.statusTag,
                                                    { backgroundColor: doctor.status === 'active' ? '#ECFDF5' : '#F1F5F9' }
                                                ]}>
                                                    <Text style={[
                                                        styles.statusTagText,
                                                        { color: doctor.status === 'active' ? '#059669' : '#64748B' }
                                                    ]}>
                                                        {doctor.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.doctorRole}>{doctor.department_role || 'Staff Physician'}</Text>
                                            <View style={styles.specialtyRow}>
                                                <Ionicons name="medical-outline" size={14} color={COLORS.primary} />
                                                <Text style={styles.specialtyText}>{doctor.specialty || 'General Practitioner'}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.editBtn}
                                            onPress={() => navigation.navigate('HospitalEditDoctorScreen', { doctor })}
                                        >
                                            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                        <View style={{ height: 100 }} />
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    contentContainer: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
    titleGroup: { flex: 1, marginLeft: 15 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
    headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
    addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, color: '#64748B', fontSize: 14 },

    doctorCard: { backgroundColor: 'white', borderRadius: 24, padding: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 15, borderWidth: 1, borderColor: '#F1F5F9' },
    doctorHeader: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { position: 'relative' },
    avatar: { width: 64, height: 64, borderRadius: 20 },
    initialsAvatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
    initialsText: { fontSize: 20, fontWeight: 'bold', color: '#64748B' },
    activeBadge: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: 'white' },

    doctorInfo: { flex: 1, marginLeft: 16 },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    doctorName: { fontSize: 18, fontWeight: '700', color: '#1E293B', flex: 1 },
    statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 10 },
    statusTagText: { fontSize: 10, fontWeight: '800' },
    doctorRole: { fontSize: 14, color: '#64748B', marginTop: 2, fontWeight: '500' },
    specialtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    specialtyText: { fontSize: 12, color: COLORS.primary, marginLeft: 5, fontWeight: '600' },
    editBtn: { padding: 10, backgroundColor: '#F1F5F9', borderRadius: 12 },

    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
    emptyText: { marginTop: 15, color: '#94A3B8', fontSize: 16, textAlign: 'center', paddingHorizontal: 40 },
    emptyAddBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 15 },
    emptyAddBtnText: { color: 'white', fontWeight: '700' }
});
