import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { doctorAPI } from '../../services/api';

export default function AdminDoctorsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [doctors, setDoctors] = useState([]);

    useEffect(() => {
        loadDoctors();
    }, []);

    const loadDoctors = async () => {
        try {
            setLoading(true);
            const response = await doctorAPI.getAllDoctors();
            setDoctors(response.data?.results || response.data || []);
        } catch (error) {
            // Demo data with valid UUIDs for backend compatibility during errors
            setDoctors([
                { id: '11111111-1111-1111-1111-111111111111', name: 'Arvind Shukla', specialty: 'Cardiology', email: 'arvind@example.com', status: 'active' },
                { id: '22222222-2222-2222-2222-222222222222', name: 'Avantika Gupta', specialty: 'Pediatrics', email: 'avantika@example.com', status: 'active' },
                { id: '33333333-3333-3333-3333-333333333333', name: 'Govind Sharma', specialty: 'Neurology', email: 'govind@example.com', status: 'pending' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadDoctors();
        setRefreshing(false);
    };

    const filteredDoctors = doctors.filter(doc => {
        const name = `${doc.name || ''}`.toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || doc.specialty?.toLowerCase().includes(query);
    });

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading doctors...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Doctors</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search doctors..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{doctors.length}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{doctors.filter(d => d.status === 'active').length}</Text>
                        <Text style={styles.statLabel}>Active</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{doctors.filter(d => d.status === 'pending').length}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                </View>

                {/* Doctors List */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                    }
                >
                    <Text style={styles.sectionTitle}>All Doctors ({filteredDoctors.length})</Text>

                    {filteredDoctors.map((doctor, index) => (
                        <TouchableOpacity
                            key={doctor.id || index}
                            style={styles.doctorCard}
                            onPress={() => navigation.navigate('AdminDoctorDetailScreen', { doctor })}
                        >
                            <View style={styles.doctorAvatar}>
                                <Ionicons name="medical" size={24} color="#4CAF50" />
                            </View>
                            <View style={styles.doctorInfo}>
                                <Text style={styles.doctorName}>Dr. {doctor.name || 'Unknown'}</Text>
                                <Text style={styles.doctorSpecialty}>{doctor.specialty || 'General'}</Text>
                                {doctor.email && <Text style={styles.doctorEmail}>{doctor.email}</Text>}
                            </View>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: doctor.status === 'active' ? '#E8F5E9' : '#FFF3E0' }
                            ]}>
                                <Text style={[
                                    styles.statusText,
                                    { color: doctor.status === 'active' ? '#4CAF50' : '#FF9800' }
                                ]}>
                                    {doctor.status || 'active'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}

                    <View style={{ height: 50 }} />
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

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#EEE', marginBottom: 15 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#333' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statBox: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#F0F0F0' },
    statNumber: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
    statLabel: { fontSize: 12, color: '#666', marginTop: 4 },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 15 },

    doctorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
    doctorAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    doctorInfo: { flex: 1 },
    doctorName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    doctorSpecialty: { fontSize: 13, color: '#666', marginTop: 2 },
    doctorEmail: { fontSize: 11, color: '#999', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
