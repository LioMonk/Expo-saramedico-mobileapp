import React, { useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doctorAPI, getUserData } from '../../services/api';
import { TOKEN_CONFIG } from '../../services/config';

const SPECIALIZATIONS = [
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Orthopedics',
    'Neurology',
    'Psychiatry',
    'General Practice',
    'Internal Medicine',
    'Surgery',
    'Obstetrics & Gynecology'
];

export default function DoctorServicesScreen({ route, navigation }) {
    const { specialty: initialSpecialty } = route.params || {};
    const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty || 'General Practice');
    const [saving, setSaving] = useState(false);

    const handleSelectSpecialty = (spec) => {
        setSelectedSpecialty(spec);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Include credentials (license number) to verify doctor as requested
            const userData = await getUserData();
            await doctorAPI.updateProfile({
                specialty: selectedSpecialty,
                license_number: userData.license_number !== 'Not provided' ? userData.license_number : undefined
            });

            // Update local storage
            const doctorProfile = await AsyncStorage.getItem('doctor_profile');
            if (doctorProfile) {
                const profileData = JSON.parse(doctorProfile);
                profileData.specialty = selectedSpecialty;
                await AsyncStorage.setItem('doctor_profile', JSON.stringify(profileData));
            } else {
                await AsyncStorage.setItem('doctor_profile', JSON.stringify({ specialty: selectedSpecialty }));
            }

            // Sync with main user data key
            const userDataLocal = await AsyncStorage.getItem(TOKEN_CONFIG.USER_DATA_KEY);
            if (userDataLocal) {
                const parsedUser = JSON.parse(userDataLocal);
                parsedUser.specialty = selectedSpecialty;
                await AsyncStorage.setItem(TOKEN_CONFIG.USER_DATA_KEY, JSON.stringify(parsedUser));
            }

            Alert.alert('Success', 'Specialty updated successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Error saving specialty:', error);
            const detail = error.response?.data?.detail;
            const message = typeof detail === 'string' ? detail : 'Failed to update specialty. Please try again.';
            Alert.alert('Error', message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Services Available</Text>
                    <TouchableOpacity onPress={handleSave} disabled={saving}>
                        {saving ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <Text style={styles.saveText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.subtitle}>Select your specialization</Text>

                    <View style={styles.currentCard}>
                        <Ionicons name="medkit" size={32} color="white" />
                        <Text style={styles.currentSpecialty}>{selectedSpecialty}</Text>
                    </View>

                    <Text style={styles.sectionLabel}>ALL SPECIALIZATIONS</Text>

                    {SPECIALIZATIONS.map((spec, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.specItem, spec === selectedSpecialty && styles.specItemActive]}
                            onPress={() => handleSelectSpecialty(spec)}
                        >
                            <View style={styles.iconBox}>
                                <Ionicons name="medical-outline" size={20} color={spec === selectedSpecialty ? COLORS.primary : "#555"} />
                            </View>
                            <Text style={[styles.specText, spec === selectedSpecialty && styles.specTextActive]}>
                                {spec}
                            </Text>
                            {spec === selectedSpecialty && (
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    content: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    saveText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 12 },
    currentCard: { backgroundColor: COLORS.primary, borderRadius: 16, padding: 24, marginBottom: 24, alignItems: 'center' },
    currentSpecialty: { fontSize: 20, fontWeight: 'bold', color: 'white', marginTop: 12 },
    sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 12, letterSpacing: 0.5 },
    specItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' },
    specItemActive: { borderColor: COLORS.primary, backgroundColor: '#E3F2FD' },
    iconBox: { width: 36, height: 36, backgroundColor: '#F5F7F9', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    specText: { flex: 1, fontSize: 15, color: '#333' },
    specTextActive: { fontWeight: 'bold', color: COLORS.primary }
});
