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

export default function HospitalNursesScreen({ navigation }) {
    const [nurses, setNurses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchNurses();
    }, []);

    const fetchNurses = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.get(`${API_CONFIG.BASE_URL}/staff/nurses`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNurses(response.data.nurses || []);
        } catch (error) {
            console.error('Error fetching nurses:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchNurses();
    };

    const filteredNurses = nurses.filter(
        (nurse) =>
            nurse.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            nurse.ward?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const NurseCard = ({ nurse }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{nurse.name?.charAt(0).toUpperCase() || 'N'}</Text>
                </View>
                <View style={styles.nurseInfo}>
                    <Text style={styles.nurseName}>{nurse.name || 'Unknown Nurse'}</Text>
                    <Text style={styles.ward}>{nurse.ward || 'General Ward'}</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: nurse.active ? '#10B981' : '#9CA3AF' }]} />
            </View>

            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Ionicons name="business" size={16} color="#6B7280" />
                    <Text style={styles.infoLabel}>Department:</Text>
                    <Text style={styles.infoValue}>{nurse.department || 'General'}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="time" size={16} color="#6B7280" />
                    <Text style={styles.infoLabel}>Shift:</Text>
                    <Text style={styles.infoValue}>{nurse.shift || 'Day Shift'}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="ribbon" size={16} color="#6B7280" />
                    <Text style={styles.infoLabel}>Certification:</Text>
                    <Text style={styles.infoValue}>{nurse.certification || 'RN'}</Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="calendar" size={18} color="#8B5CF6" />
                    <Text style={styles.actionText}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="create" size={18} color="#8B5CF6" />
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
                <Text style={styles.headerTitle}>Nurses Directory</Text>
                <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add-circle" size={28} color="#8B5CF6" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search nurses by name or ward..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                />
            </View>

            {/* Nurses List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Loading nurses...</Text>
                    </View>
                ) : filteredNurses.length > 0 ? (
                    filteredNurses.map((nurse, index) => <NurseCard key={index} nurse={nurse} />)
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="medkit" size={64} color="#CCC" />
                        <Text style={styles.emptyText}>No nurses found</Text>
                        <Text style={styles.emptySubtext}>Add nurses to get started</Text>
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
        backgroundColor: '#8B5CF6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    nurseInfo: {
        flex: 1,
    },
    nurseName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 2,
    },
    ward: {
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
        backgroundColor: '#F5F3FF',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B5CF6',
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
