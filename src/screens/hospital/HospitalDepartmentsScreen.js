import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { hospitalAPI } from '../../services/api';

export default function HospitalDepartmentsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [staffCount, setStaffCount] = useState(0);

    useEffect(() => {
        loadDepartments();
    }, []);

    const loadDepartments = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            const [deptRes, membersRes] = await Promise.all([
                hospitalAPI.getDepartments(),
                hospitalAPI.getOrgMembers().catch(() => ({ data: [] }))
            ]);

            // Handle Departments
            const data = deptRes.data?.departments || [];
            if (data.length > 0) {
                setDepartments(data);
            } else {
                setDepartments(['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Surgery', 'Emergency', 'Dermatology']);
            }

            // Handle Staff Count
            const members = membersRes.data || [];
            const clinicians = members.filter(m => m.role !== 'patient').length;
            setStaffCount(clinicians);

        } catch (error) {
            console.log('Departments load issue:', error.message);
            setDepartments(['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Surgery', 'Emergency', 'Dermatology']);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadDepartments(true);
    };

    const getDeptColor = (index) => {
        const colors = ['#E3F2FD', '#E8F5E9', '#FFF3E0', '#F3E5F5', '#FFEBEE', '#E0F2F1'];
        const iconColors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#009688'];
        return { bg: colors[index % colors.length], icon: iconColors[index % iconColors.length] };
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Medical Departments</Text>
                    <View style={{ width: 24 }} />
                </View>

                {loading && !refreshing ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading departments...</Text>
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                    >
                        {/* Stats Summary */}
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{departments.length}</Text>
                                <Text style={styles.statLabel}>Total Units</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statNumber, { color: '#10B981' }]}>{staffCount}</Text>
                                <Text style={styles.statLabel}>Active Staffing</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Select Department</Text>

                        {departments.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="folder-open-outline" size={60} color="#E2E8F0" />
                                <Text style={styles.emptyText}>No departments found</Text>
                                <TouchableOpacity
                                    style={styles.emptyAddBtn}
                                    onPress={() => navigation.navigate('HospitalCreateDoctorScreen', { department: '' })}
                                >
                                    <Text style={styles.emptyAddBtnText}>Onboard Doctor Directly</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            departments.map((dept, index) => {
                                const colors = getDeptColor(index);
                                return (
                                    <TouchableOpacity
                                        key={dept}
                                        style={styles.deptCard}
                                        onPress={() => navigation.navigate('HospitalDoctorsByDeptScreen', { department: dept })}
                                    >
                                        <View style={[styles.deptIcon, { backgroundColor: colors.bg }]}>
                                            <Ionicons name="medical" size={24} color={colors.icon} />
                                        </View>
                                        <View style={styles.deptInfo}>
                                            <Text style={styles.deptName}>{dept}</Text>
                                            <Text style={styles.viewLink}>View Doctors →</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#CCC" />
                                    </TouchableOpacity>
                                );
                            })
                        )}

                        <View style={{ height: 100 }} />
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    contentContainer: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, color: '#666', fontSize: 14 },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    statBox: { flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 20, alignItems: 'center', marginHorizontal: 5, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
    statNumber: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
    statLabel: { fontSize: 13, color: '#64748B', marginTop: 5, fontWeight: '500' },

    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 15, marginLeft: 5 },

    deptCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 20, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
    deptIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    deptInfo: { flex: 1 },
    deptName: { fontSize: 17, fontWeight: '700', color: '#334155' },
    viewLink: { fontSize: 12, color: COLORS.primary, marginTop: 4, fontWeight: '600' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { marginTop: 15, color: '#94A3B8', fontSize: 16, fontWeight: '500' },
    emptyAddBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 15 },
    emptyAddBtnText: { color: 'white', fontWeight: '700' }
});
