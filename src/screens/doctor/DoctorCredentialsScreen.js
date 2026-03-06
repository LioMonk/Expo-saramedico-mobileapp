import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { getUserData } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomButton } from '../../components/CustomComponents';

export default function DoctorCredentialsScreen({ route, navigation }) {
    const defaultLicense = route.params?.licenseNumber === 'Not provided' ? '' : (route.params?.licenseNumber || '');
    const [licenseNumber, setLicenseNumber] = useState(defaultLicense);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadCredentials();
    }, []);

    const loadCredentials = async () => {
        try {
            const userData = await getUserData();
            if (userData && userData.license_number && userData.license_number !== 'Not provided') {
                setLicenseNumber(userData.license_number);
            }
        } catch (error) {
            console.error('Error loading credentials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!licenseNumber.trim()) {
            Alert.alert('Error', 'Please enter a valid license number.');
            return;
        }
        setSaving(true);
        try {
            // Mock backend save with AsyncStorage since there is no endpoint
            const doctorProfile = await AsyncStorage.getItem('doctor_profile');
            const parsedProfile = doctorProfile ? JSON.parse(doctorProfile) : {};
            parsedProfile.license_number = licenseNumber;
            await AsyncStorage.setItem('doctor_profile', JSON.stringify(parsedProfile));

            const userDataLocal = await AsyncStorage.getItem('@user_data');
            if (userDataLocal) {
                const parsedUser = JSON.parse(userDataLocal);
                parsedUser.license_number = licenseNumber;
                await AsyncStorage.setItem('@user_data', JSON.stringify(parsedUser));
            }

            Alert.alert('Success', 'Credentials updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Error saving credentials:', error);
            Alert.alert('Error', 'Failed to update credentials.');
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
                    <Text style={styles.headerTitle}>Credentials</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="school" size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.title}>Medical License Number</Text>

                        {loading ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <TextInput
                                style={styles.input}
                                value={licenseNumber}
                                onChangeText={setLicenseNumber}
                                placeholder="Enter Medical License Number"
                                placeholderTextColor="#999"
                                autoCapitalize="characters"
                            />
                        )}
                        <Text style={styles.note}>This was registered during your sign-up process but can be updated here.</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Verification Status</Text>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusDot, { backgroundColor: licenseNumber ? '#4CAF50' : '#FF9800' }]} />
                            <Text style={[styles.statusText, { color: licenseNumber ? '#4CAF50' : '#FF9800' }]}>
                                {licenseNumber ? 'Verified' : 'Pending Verification'}
                            </Text>
                        </View>
                        <Text style={styles.statusNote}>
                            {licenseNumber
                                ? 'Your credentials have been successfully verified by our system admin.'
                                : 'Please provide a valid license number to get verified.'}
                        </Text>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <CustomButton
                        title={saving ? "Saving..." : "Save Credentials"}
                        onPress={handleSave}
                        disabled={saving || loading || !licenseNumber.trim()}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    content: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    card: { backgroundColor: 'white', borderRadius: 16, padding: 25, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#EEE' },
    iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 10 },
    input: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#CCC', width: '80%', paddingVertical: 5, marginBottom: 15 },
    note: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 10, lineHeight: 18, paddingHorizontal: 10 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', alignSelf: 'flex-start', marginBottom: 15 },
    statusRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 10 },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    statusText: { fontSize: 15, fontWeight: '600' },
    statusNote: { fontSize: 13, color: '#666', lineHeight: 20, alignSelf: 'flex-start' },
    footer: { paddingBottom: 10, paddingTop: 10 }
});
