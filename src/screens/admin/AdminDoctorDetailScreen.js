import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { adminAPI } from '../../services/api';

export default function AdminDoctorDetailScreen({ route, navigation }) {
    const { doctor } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState(null);

    useEffect(() => {
        loadDoctorDetails();
    }, []);

    const loadDoctorDetails = async () => {
        try {
            setLoading(true);
            if (!doctor?.id) {
                setLoading(false);
                return;
            }

            const response = await adminAPI.getDoctorDetails(doctor.id);
            if (response.data) {
                setDetails(response.data);
            } else {
                setDetails(doctor); // fallback if missing
            }
            setLoading(false);

        } catch (error) {
            console.error('Error loading real doctor details:', error);
            // Fallback to basic data so it still opens if backend fails
            setDetails(doctor);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Doctor Details</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Doctor Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                {/* Profile Header */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Ionicons name="medical" size={40} color={COLORS.primary} />
                    </View>
                    <Text style={styles.name}>Dr. {details?.first_name ? `${details?.first_name} ${details?.last_name || ''}` : (details?.name || 'Unknown')}</Text>
                    <Text style={styles.specialty}>{details?.specialty || 'General Practitioner'}</Text>

                    <View style={[styles.statusBadge, { backgroundColor: details?.status === 'active' ? '#E8F5E9' : '#FFF3E0' }]}>
                        <Text style={[styles.statusText, { color: details?.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                            {details?.status || 'Active'}
                        </Text>
                    </View>

                    <View style={styles.contactInfo}>
                        <View style={styles.contactRow}>
                            <Ionicons name="mail-outline" size={16} color="#666" />
                            <Text style={styles.contactText}>{details?.email || 'No email provided'}</Text>
                        </View>
                        <View style={styles.contactRow}>
                            <Ionicons name="call-outline" size={16} color="#666" />
                            <Text style={styles.contactText}>{details?.phone}</Text>
                        </View>
                        <View style={styles.contactRow}>
                            <Ionicons name="card-outline" size={16} color="#666" />
                            <Text style={styles.contactText}>License: {details?.license}</Text>
                        </View>
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{details?.stats?.totalPatients || 0}</Text>
                        <Text style={styles.statLabel}>Patients</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{details?.stats?.consultations || 0}</Text>
                        <Text style={styles.statLabel}>Consultations</Text>
                    </View>
                </View>

                {/* Upcoming Appointments */}
                <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                <View style={styles.listCard}>
                    {details?.appointments?.length > 0 ? details.appointments.map((apt, index) => (
                        <View key={index} style={[styles.listItem, index === details.appointments.length - 1 && { borderBottomWidth: 0 }]}>
                            <View style={styles.listIcon}>
                                <Ionicons name="calendar" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.listBody}>
                                <Text style={styles.listTitle}>{apt.patientName}</Text>
                                <Text style={styles.listSub}>{apt.time}</Text>
                            </View>
                            <View style={styles.listAction}>
                                <Text style={[styles.aptStatus, apt.status === 'Scheduled' && { color: COLORS.primary }]}>{apt.status}</Text>
                            </View>
                        </View>
                    )) : <Text style={styles.emptyText}>No upcoming appointments</Text>}
                </View>

                {/* Recent Patients */}
                <Text style={styles.sectionTitle}>Recent Patients</Text>
                <View style={styles.listCard}>
                    {details?.patients?.length > 0 ? details.patients.map((pat, index) => (
                        <View key={index} style={[styles.listItem, index === details.patients.length - 1 && { borderBottomWidth: 0 }]}>
                            <View style={styles.listIcon}>
                                <Ionicons name="person" size={20} color="#666" />
                            </View>
                            <View style={styles.listBody}>
                                <Text style={styles.listTitle}>{pat.name}</Text>
                                <Text style={styles.listSub}>{pat.condition} • {pat.lastVisit}</Text>
                            </View>
                            <TouchableOpacity style={styles.viewBtn}>
                                <Text style={styles.viewBtnText}>View</Text>
                            </TouchableOpacity>
                        </View>
                    )) : <Text style={styles.emptyText}>No recent patients</Text>}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    content: { flex: 1, padding: 20 },

    profileCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#F0F0F0' },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    name: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    specialty: { fontSize: 15, color: COLORS.primary, marginBottom: 15 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
    statusText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },

    contactInfo: { width: '100%', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 15 },
    contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    contactText: { fontSize: 14, color: '#666', marginLeft: 10 },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    statBox: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#F0F0F0' },
    statValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
    statLabel: { fontSize: 12, color: '#999', marginTop: 5 },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    listCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 25, borderWidth: 1, borderColor: '#F0F0F0' },
    listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    listIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    listBody: { flex: 1 },
    listTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    listSub: { fontSize: 13, color: '#999', marginTop: 2 },
    listAction: { paddingLeft: 10 },
    aptStatus: { fontSize: 12, fontWeight: '600' },
    viewBtn: { backgroundColor: '#F0F7FF', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 15 },
    viewBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', color: '#999', marginVertical: 15 }
});
