import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { doctorAPI } from '../../services/api';

export default function DoctorAIChatListScreen({ navigation }) {
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPatients();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredPatients(patients);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = patients.filter(p =>
                (p.name && p.name.toLowerCase().includes(query)) ||
                (p.full_name && p.full_name.toLowerCase().includes(query)) ||
                (p.mrn && p.mrn.toLowerCase().includes(query))
            );
            setFilteredPatients(filtered);
        }
    }, [searchQuery, patients]);

    const loadPatients = async () => {
        setLoading(true);
        try {
            const response = await doctorAPI.getPatients();
            const patientsList = response.data?.all_patients
                || response.data?.patients
                || (Array.isArray(response.data) ? response.data : [])
                || [];
            setPatients(patientsList);
            setFilteredPatients(patientsList);
        } catch (error) {
            console.error('Error loading patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePatientSelect = (patient) => {
        navigation.navigate('DoctorAIChatScreen', {
            patientId: patient.id,
            patientName: patient.name || patient.full_name
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AI Chat Contacts</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search patients by name or MRN..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : filteredPatients.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="people-outline" size={64} color="#E5E7EB" />
                    <Text style={styles.emptyText}>No patients found</Text>
                    <Text style={styles.emptySub}>Try searching with a different name</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
                    <Text style={styles.listTitle}>RECENT INTERACTIONS</Text>
                    {filteredPatients.map((patient) => (
                        <TouchableOpacity
                            key={patient.id}
                            style={styles.patientCard}
                            onPress={() => handlePatientSelect(patient)}
                        >
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {(patient.name || patient.full_name || 'H').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.patientInfo}>
                                <Text style={styles.patientName}>{patient.name || patient.full_name}</Text>
                                <Text style={styles.patientMeta}>MRN: {patient.mrn} • {patient.gender || 'Patient'}</Text>
                            </View>
                            <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.primary} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', margin: 16, paddingHorizontal: 12, height: 48, borderRadius: 12 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#1F2937' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
    emptySub: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
    listContainer: { paddingHorizontal: 16, paddingBottom: 24 },
    listTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 16 },
    patientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 5 },
    avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
    patientInfo: { flex: 1 },
    patientName: { fontSize: 16, fontWeight: '700', color: '#111827' },
    patientMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 }
});
