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
import { organizationAPI } from '../../services/api';

export default function AdminOrganizationsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [organizations, setOrganizations] = useState([]);

    useEffect(() => {
        loadOrganizations();
    }, []);

    const loadOrganizations = async () => {
        try {
            setLoading(true);
            const response = await organizationAPI.getOrganizations();
            setOrganizations(response.data?.results || response.data || []);
        } catch (error) {
            // Suppressing 404 warning as admin global org view assumes mock for now
            // Demo data
            setOrganizations([
                { id: '1', name: 'City General Hospital', type: 'hospital', email: 'city@hospital.com', status: 'active', members_count: 45 },
                { id: '2', name: 'Metro Clinic', type: 'clinic', email: 'metro@clinic.com', status: 'active', members_count: 12 },
                { id: '3', name: 'HealthFirst Center', type: 'hospital', email: 'healthfirst@center.com', status: 'pending', members_count: 28 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadOrganizations();
        setRefreshing(false);
    };

    const filteredOrgs = organizations.filter(org => {
        const query = searchQuery.toLowerCase();
        return org.name?.toLowerCase().includes(query) || org.type?.toLowerCase().includes(query);
    });

    const getOrgIcon = (type) => {
        switch (type) {
            case 'hospital': return 'business';
            case 'clinic': return 'medkit';
            default: return 'business-outline';
        }
    };

    const getOrgColor = (type) => {
        switch (type) {
            case 'hospital': return '#9C27B0';
            case 'clinic': return '#2196F3';
            default: return '#666';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading organizations...</Text>
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
                    <Text style={styles.headerTitle}>Organizations</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search organizations..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{organizations.length}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{organizations.filter(o => o.type === 'hospital').length}</Text>
                        <Text style={styles.statLabel}>Hospitals</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{organizations.filter(o => o.type === 'clinic').length}</Text>
                        <Text style={styles.statLabel}>Clinics</Text>
                    </View>
                </View>

                {/* Organizations List */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                    }
                >
                    <Text style={styles.sectionTitle}>All Organizations ({filteredOrgs.length})</Text>

                    {filteredOrgs.map((org, index) => (
                        <TouchableOpacity
                            key={org.id || index}
                            style={styles.orgCard}
                            onPress={() => navigation.navigate('AdminOrgDetailScreen', { organization: org })}
                        >
                            <View style={[styles.orgIcon, { backgroundColor: getOrgColor(org.type) + '20' }]}>
                                <Ionicons name={getOrgIcon(org.type)} size={24} color={getOrgColor(org.type)} />
                            </View>
                            <View style={styles.orgInfo}>
                                <Text style={styles.orgName}>{org.name}</Text>
                                <Text style={styles.orgType}>{org.type || 'Organization'}</Text>
                                <View style={styles.orgMeta}>
                                    <Ionicons name="people-outline" size={12} color="#999" />
                                    <Text style={styles.orgMembers}>{org.members_count || 0} members</Text>
                                </View>
                            </View>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: org.status === 'active' ? '#E8F5E9' : '#FFF3E0' }
                            ]}>
                                <Text style={[
                                    styles.statusText,
                                    { color: org.status === 'active' ? '#4CAF50' : '#FF9800' }
                                ]}>
                                    {org.status || 'active'}
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

    orgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
    orgIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    orgInfo: { flex: 1 },
    orgName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    orgType: { fontSize: 13, color: '#666', marginTop: 2, textTransform: 'capitalize' },
    orgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    orgMembers: { fontSize: 11, color: '#999', marginLeft: 4 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
