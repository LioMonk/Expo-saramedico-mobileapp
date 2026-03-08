import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../services/config';

export default function HospitalDoctorsScreen({ navigation }) {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.get(`${API_CONFIG.BASE_URL}/staff/doctors`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDoctors(response.data.doctors || []);
        } catch (error) {
            console.error('Error fetching doctors:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDoctors();
    };

    const filteredDoctors = doctors.filter(
        (doctor) =>
            doctor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doctor.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const DoctorCard = ({ doctor }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{doctor.name?.charAt(0).toUpperCase() || 'D'}</Text>
                </View>
                <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{doctor.name || 'Unknown Doctor'}</Text>
                    <Text style={styles.specialty}>{doctor.specialty || 'General Medicine'}</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: doctor.active ? '#10B981' : '#9CA3AF' }]} />
            </View>

            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Ionicons name="briefcase" size={16} color="#6B7280" />
                    <Text style={styles.infoLabel}>Experience:</Text>
                    <Text style={styles.infoValue}>{doctor.experience || '5'} years</Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="time" size={16} color="#6B7280" />
                    <Text style={styles.infoLabel}>Shift:</Text>
                    <Text style={styles.infoValue}>{doctor.shift || 'Morning'}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="people" size={16} color="#6B7280" />
                    <Text style={styles.infoLabel}>Patients Today:</Text>
                    <Text style={styles.infoValue}>{doctor.patients_today || '0'}</Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="calendar" size={18} color="#0066CC" />
                    <Text style={styles.actionText}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="create" size={18} color="#0066CC" />
                    <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Doctors Directory</Text>
                <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add-circle" size={28} color="#0066CC" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search doctors by name or specialty..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                />
            </View>

            {/* Doctors List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Loading doctors...</Text>
                    </View>
                ) : filteredDoctors.length > 0 ? (
                    filteredDoctors.map((doctor, index) => <DoctorCard key={index} doctor={doctor} />)
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="medical" size={64} color="#CCC" />
                        <Text style={styles.emptyText}>No doctors found</Text>
                        <Text style={styles.emptySubtext}>Add doctors to get started</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    addButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1F2937',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#0066CC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    doctorInfo: {
        flex: 1,
    },
    doctorName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 2,
    },
    specialty: {
        fontSize: 14,
        color: '#6B7280',
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    cardBody: {
        gap: 8,
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: '#1F2937',
        flex: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#EFF6FF',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0066CC',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#9CA3AF',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#D1D5DB',
        marginTop: 4,
    },
});
