import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { patientAPI } from '../../services/api';
import { COLORS } from '../../constants/theme';

/**
 * Doctor Search Screen
 * Shows all doctors immediately and allows search filtering
 */
export default function DoctorSearchScreen({ navigation }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [allDoctors, setAllDoctors] = useState([]);
    const [filteredDoctors, setFilteredDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAllDoctors();
    }, []);

    useEffect(() => {
        filterDoctors();
    }, [searchQuery, allDoctors]);

    const loadAllDoctors = async () => {
        setLoading(true);
        try {
            // Load all doctors without any query
            const response = await patientAPI.searchDoctors();
            let doctorsList = response.data?.results || response.data || [];

            // Deduplicate doctors by ID to prevent double entries
            const uniqueDoctors = [];
            const seenIds = new Set();

            doctorsList.forEach(doctor => {
                const docId = doctor.id?.toString();
                if (docId && !seenIds.has(docId)) {
                    seenIds.add(docId);
                    uniqueDoctors.push(doctor);
                } else if (!docId) {
                    // Fallback for items without ID
                    uniqueDoctors.push(doctor);
                }
            });

            setAllDoctors(uniqueDoctors);
            setFilteredDoctors(uniqueDoctors);
        } catch (error) {
            console.error('Error loading doctors:', error);
            setAllDoctors([]);
            setFilteredDoctors([]);
        } finally {
            setLoading(false);
        }
    };

    const filterDoctors = () => {
        if (!searchQuery.trim()) {
            setFilteredDoctors(allDoctors);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = allDoctors.filter(doctor => {
            const name = (doctor.full_name || doctor.name || '').toLowerCase();
            const specialty = (doctor.specialty || '').toLowerCase();
            return name.includes(query) || specialty.includes(query);
        });
        setFilteredDoctors(filtered);
    };

    const handleDoctorPress = (doctor) => {
        navigation.navigate('AppointmentBooking', { doctor });
    };

    const getInitials = (name) => {
        if (!name) return 'DR';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const getAvatarColor = (name) => {
        const colors = ['#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#00BCD4', '#E91E63'];
        const index = (name || '').length % colors.length;
        return colors[index];
    };

    const renderDoctorCard = ({ item }) => (
        <TouchableOpacity
            style={styles.doctorCard}
            onPress={() => handleDoctorPress(item)}
        >
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name || item.full_name) }]}>
                <Text style={styles.avatarText}>
                    {getInitials(item.name || item.full_name)}
                </Text>
            </View>
            <View style={styles.doctorInfo}>
                <Text style={styles.doctorName} numberOfLines={1}>
                    {(() => {
                        let dName = item.name || item.full_name || 'Doctor';
                        if (dName.toLowerCase() === 'encrypted' || dName.toLowerCase() === 'unknown doctor') dName = 'Doctor';
                        return dName.startsWith('Dr. ') ? dName : `Dr. ${dName}`;
                    })()}
                </Text>
                <Text style={styles.doctorSpecialty} numberOfLines={1}>{item.specialty || 'General Practice'}</Text>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Available</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Find a Doctor</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={20} color="#999" />
                    <TextInput
                        placeholder="Search doctors by name or specialty..."
                        placeholderTextColor="#999"
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Loading */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading doctors...</Text>
                    </View>
                ) : filteredDoctors.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={60} color="#DDD" />
                        <Text style={styles.emptyText}>No doctors found</Text>
                        <Text style={styles.emptySubtext}>
                            {searchQuery ? 'Try a different search term' : 'No doctors available'}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredDoctors}
                        renderItem={renderDoctorCard}
                        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            <Text style={styles.resultCount}>
                                {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found
                            </Text>
                        }
                    />
                )}
            </View>


        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F9FAFC',
    },
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: '#EEE',
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#333',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 14,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginTop: 15,
    },
    emptySubtext: {
        fontSize: 13,
        color: '#999',
        marginTop: 5,
        textAlign: 'center',
    },
    listContainer: {
        paddingBottom: 100,
    },
    resultCount: {
        fontSize: 13,
        color: '#666',
        marginBottom: 15,
    },
    doctorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    doctorInfo: {
        flex: 1,
    },
    doctorName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 3,
    },
    doctorSpecialty: {
        fontSize: 13,
        color: '#666',
        marginBottom: 6,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 11,
        color: '#4CAF50',
        fontWeight: '500',
    },
});
