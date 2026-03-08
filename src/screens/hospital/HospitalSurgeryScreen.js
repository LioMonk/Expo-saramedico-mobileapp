import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../services/config';

export default function HospitalSurgeryScreen({ navigation }) {
    const [surgeries, setSurgeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all'); // all, scheduled, in_progress, completed

    useEffect(() => {
        fetchSurgeries();
    }, [filter]);

    const fetchSurgeries = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.get(`${API_CONFIG.BASE_URL}/surgeries`, {
                headers: { Authorization: `Bearer ${token}` },
                params: filter !== 'all' ? { status: filter } : {},
            });
            setSurgeries(response.data.surgeries || []);
        } catch (error) {
            console.error('Error fetching surgeries:', error);
            Alert.alert('Error', 'Failed to load surgeries');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchSurgeries();
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'scheduled':
                return '#3B82F6';
            case 'in_progress':
                return '#F59E0B';
            case 'completed':
                return '#10B981';
            case 'cancelled':
                return '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const getRiskColor = (risk) => {
        switch (risk?.toLowerCase()) {
            case 'low':
                return '#10B981';
            case 'medium':
                return '#F59E0B';
            case 'high':
                return '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const SurgeryCard = ({ surgery }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
                <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{surgery.patient_name || 'Unknown Patient'}</Text>
                    <Text style={styles.surgeryType}>{surgery.surgery_type || 'General Surgery'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(surgery.status) }]}>
                    <Text style={styles.statusText}>{surgery.status || 'Scheduled'}</Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Ionicons name="person" size={16} color="#6B7280" />
                    <Text style={styles.infoLabel}>Doctor:</Text>
                    <Text style={styles.infoValue}>{surgery.doctor_name || 'Not assigned'}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="time" size={16} color="#6B7280" />
                    <Text style={styles.infoLabel}>Time:</Text>
                    <Text style={styles.infoValue}>
                        {surgery.scheduled_time ? new Date(surgery.scheduled_time).toLocaleString() : 'TBD'}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="business" size={16} color="#6B7280" />
                    <Text style={styles.infoLabel}>Theater:</Text>
                    <Text style={styles.infoValue}>{surgery.theater || 'Not assigned'}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="warning" size={16} color={getRiskColor(surgery.risk_level)} />
                    <Text style={styles.infoLabel}>Risk Level:</Text>
                    <View style={[styles.riskBadge, { backgroundColor: getRiskColor(surgery.risk_level) }]}>
                        <Text style={styles.riskText}>{surgery.risk_level || 'Medium'}</Text>
                    </View>
                </View>
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
                <Text style={styles.headerTitle}>Surgery Management</Text>
                <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add-circle" size={28} color="#0066CC" />
                </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['all', 'scheduled', 'in_progress', 'completed'].map((status) => (
                        <TouchableOpacity
                            key={status}
                            style={[styles.filterTab, filter === status && styles.filterTabActive]}
                            onPress={() => setFilter(status)}
                        >
                            <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>
                                {status.replace('_', ' ').toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Surgery List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Loading surgeries...</Text>
                    </View>
                ) : surgeries.length > 0 ? (
                    surgeries.map((surgery, index) => <SurgeryCard key={index} surgery={surgery} />)
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="medical" size={64} color="#CCC" />
                        <Text style={styles.emptyText}>No surgeries found</Text>
                        <Text style={styles.emptySubtext}>Schedule a new surgery to get started</Text>
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
    filterContainer: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    filterTabActive: {
        backgroundColor: '#0066CC',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    filterTextActive: {
        color: '#FFFFFF',
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
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    patientInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    surgeryType: {
        fontSize: 14,
        color: '#6B7280',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
        textTransform: 'capitalize',
    },
    cardBody: {
        gap: 8,
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
    riskBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    riskText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
        textTransform: 'capitalize',
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
