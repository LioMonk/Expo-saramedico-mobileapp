import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const TEST_DOCTOR_BLACKLIST = [
    'soap tester',
    'sync test',
    'clinical flow',
    'test doctor',
    'medical specialist',
    'integration test',
    'notification tester'
];

const isBlacklisted = (name) => {
    if (!name) return false;
    const n = name.toLowerCase();
    return TEST_DOCTOR_BLACKLIST.some(black => n.includes(black));
};

// Direct API helper - fetches all doctors silently
async function fetchAllDoctors() {
    try {
        const res = await patientAPI.searchDoctors({});
        return res?.data?.results || res?.data?.doctors || res?.data || [];
    } catch (e) {
        console.log('[DoctorSearch] /doctors/directory failed:', e?.message);
        return [];
    }
}

/**
 * Doctor Search Screen
 * Shows all doctors immediately and allows search filtering.
 * Searches both locally and via backend query parameter.
 */
export default function DoctorSearchScreen({ navigation }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [allDoctors, setAllDoctors] = useState([]);
    const [filteredDoctors, setFilteredDoctors] = useState([]);
    const [doctorNameMap, setDoctorNameMap] = useState({}); // ID -> Decrypted Name
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const searchTimeout = useRef(null);

    useEffect(() => {
        loadAllDoctors();
    }, []);

    // Local filter applied whenever allDoctors or searchQuery changes
    const filterLocally = useCallback((doctors, query) => {
        if (!query.trim()) {
            return doctors;
        }
        const q = query.toLowerCase();
        return doctors.filter(doctor => {
            const name = (doctor.name || doctor.full_name || '').toLowerCase();
            const specialty = (doctor.specialty || '').toLowerCase();
            const email = (doctor.email || '').toLowerCase();
            return name.includes(q) || specialty.includes(q) || email.includes(q);
        });
    }, []);

    useEffect(() => {
        // Debounce: wait 400ms before running search
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            const q = searchQuery.trim();

            // If query is short enough, just filter locally
            if (q.length < 2) {
                setFilteredDoctors(filterLocally(allDoctors, q));
                return;
            }

            // Try backend search first, fall back to local
            try {
                const res = await patientAPI.searchDoctors({ query: q }).catch(() => ({ data: [] }));
                const backendList = res?.data?.results || res?.data?.doctors || res?.data || [];
                if (Array.isArray(backendList) && backendList.length > 0) {
                    // Merge backend results with local filter, dedup by ID only
                    const merged = [...backendList];
                    const seenIds = new Set(backendList.map(d => d.id?.toString()));
                    filterLocally(allDoctors, q).forEach(d => {
                        if (!seenIds.has(d.id?.toString())) {
                            merged.push(d);
                            seenIds.add(d.id?.toString());
                        }
                    });
                    setFilteredDoctors(merged);
                } else {
                    setFilteredDoctors(filterLocally(allDoctors, q));
                }
            } catch {
                setFilteredDoctors(filterLocally(allDoctors, q));
            }
        }, 400);

        return () => clearTimeout(searchTimeout.current);
    }, [searchQuery, allDoctors, filterLocally]);

    const loadAllDoctors = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch appointments to recover real names from history
            try {
                const apptsRes = await patientAPI.getMyAppointments();
                const appts = apptsRes?.data || [];
                const nameMap = {};
                appts.forEach(a => {
                    if (a.doctor_id && a.doctor_name) {
                        nameMap[a.doctor_id] = a.doctor_name;
                    }
                });
                setDoctorNameMap(nameMap);
            } catch (e) {
                console.log('[DoctorSearch] Failed to fetch appointments for name recovery');
            }

            const list = await fetchAllDoctors();

            // Deduplicate: ONLY use ID. We want to show all discrete accounts
            // even if they have the same name (e.g. test accounts or common names).
            const uniqueDoctors = [];
            const seenIds = new Set();   // id string

            list.forEach(doctor => {
                const idStr = doctor.id?.toString();
                const rawName = (doctor.name || doctor.full_name || '').trim();

                // 1. Skip if it's a known test/garbage name
                if (isBlacklisted(rawName)) return;

                // 2. Skip completely blank entries with no ID
                if (!rawName && !idStr) return;

                // Already seen by id → skip
                if (idStr && seenIds.has(idStr)) return;

                if (idStr) seenIds.add(idStr);
                uniqueDoctors.push(doctor);
            });

            setAllDoctors(uniqueDoctors);
            setFilteredDoctors(uniqueDoctors);

            if (uniqueDoctors.length === 0) {
                setError('No doctors are currently available. Please try again later.');
            }
        } catch (err) {
            console.error('Error loading doctors:', err);
            setError('Could not load doctors. Please check your connection and try again.');
            setAllDoctors([]);
            setFilteredDoctors([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDoctorPress = (doctor) => {
        navigation.navigate('AppointmentBooking', { doctor });
    };

    const getInitials = (name) => {
        if (!name || name.toLowerCase().includes('unknown')) return 'DR';
        const cleanName = name.replace(/^Dr\.\s+/i, '');
        const parts = cleanName.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
        }
        return cleanName.substring(0, 2).toUpperCase();
    };

    const AVATAR_COLORS = ['#4C6EF5', '#12B886', '#F76707', '#E64980', '#7048E8', '#0C8599'];
    const getAvatarColor = (name) => {
        const index = (name || '').charCodeAt(0) % AVATAR_COLORS.length;
        return AVATAR_COLORS[index];
    };

    const renderDoctorCard = ({ item }) => {
        const displayName = (() => {
            let n = (item.name || item.full_name || '').trim();
            const lowerN = n.toLowerCase();

            // Check for common encryption patterns or generic placeholders
            const isGarbage =
                !n ||
                lowerN === 'unknown doctor' ||
                lowerN === 'encrypted' ||
                n.startsWith('gAAAAA'); // Common Fernet prefix

            if (isGarbage) {
                // 1. Try recovery from appointment history
                if (doctorNameMap[item.id]) {
                    n = doctorNameMap[item.id];
                }
                // 2. Try to extract a name from the email (e.g. anurag@...)
                else if (item.email) {
                    const prefix = item.email.split('@')[0];
                    const cleanPrefix = prefix.split('.')[0].replace(/[0-9]/g, '');
                    n = cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1);
                } else {
                    // 2. Fallback to specialty
                    n = item.specialty || item.department_role || item.department || 'Medical Specialist';
                }
            }

            return n.startsWith('Dr. ') ? n : `Dr. ${n}`;
        })();
        const avatarColor = getAvatarColor(displayName);

        return (
            <TouchableOpacity style={styles.doctorCard} onPress={() => handleDoctorPress(item)} activeOpacity={0.7}>
                <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                    <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
                </View>
                <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.doctorSpecialty} numberOfLines={1}>
                        {item.specialty || item.department_role || 'Medical Specialist'}
                    </Text>
                    {item.email && <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{item.email}</Text>}
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Available</Text>
                    </View>
                </View>
                <View style={styles.bookBtnSmall}>
                    <Text style={styles.bookBtnSmallText}>Book</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Find a Doctor</Text>
                    <View style={{ width: 38 }} />
                </View>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={20} color="#94A3B8" />
                    <TextInput
                        placeholder="Search by name or specialty..."
                        placeholderTextColor="#94A3B8"
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                        autoCapitalize="none"
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Content */}
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading doctors...</Text>
                    </View>
                ) : error && filteredDoctors.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="wifi-outline" size={54} color="#CBD5E1" />
                        <Text style={styles.emptyText}>Unable to Load Doctors</Text>
                        <Text style={styles.emptySubtext}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={loadAllDoctors}>
                            <Text style={styles.retryBtnText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                ) : filteredDoctors.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="people-outline" size={54} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No Doctors Found</Text>
                        <Text style={styles.emptySubtext}>
                            {searchQuery ? `No results for "${searchQuery}"` : 'No doctors are available right now'}
                        </Text>
                        {searchQuery ? (
                            <TouchableOpacity style={styles.retryBtn} onPress={() => setSearchQuery('')}>
                                <Text style={styles.retryBtnText}>Clear Search</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.retryBtn} onPress={loadAllDoctors}>
                                <Text style={styles.retryBtnText}>Refresh</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <FlatList
                        data={filteredDoctors}
                        renderItem={renderDoctorCard}
                        keyExtractor={(item, index) => item.id?.toString() || `doctor-${index}`}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            <Text style={styles.resultCount}>
                                {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found
                                {searchQuery ? ` for "${searchQuery}"` : ''}
                            </Text>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
    container: { flex: 1, paddingHorizontal: 20 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#1E293B',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 60,
    },
    loadingText: { marginTop: 14, fontSize: 14, color: '#64748B' },
    emptyText: { fontSize: 17, fontWeight: '700', color: '#475569', marginTop: 16 },
    emptySubtext: { fontSize: 13, color: '#94A3B8', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: {
        marginTop: 20,
        paddingHorizontal: 28,
        paddingVertical: 12,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
    },
    retryBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
    listContainer: { paddingBottom: 100 },
    resultCount: { fontSize: 13, color: '#64748B', marginBottom: 14, fontWeight: '500' },
    doctorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarText: { color: 'white', fontSize: 18, fontWeight: '800' },
    doctorInfo: { flex: 1 },
    doctorName: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 3 },
    doctorSpecialty: { fontSize: 13, color: '#64748B', marginBottom: 6 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
    statusText: { fontSize: 11, color: '#16A34A', fontWeight: '600' },
    bookBtnSmall: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        marginLeft: 8,
    },
    bookBtnSmallText: { color: 'white', fontSize: 12, fontWeight: '700' },
});
