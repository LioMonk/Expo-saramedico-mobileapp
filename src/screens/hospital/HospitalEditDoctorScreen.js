import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { hospitalAPI } from '../../services/api';

export default function HospitalEditDoctorScreen({ route, navigation }) {
    const { doctor } = route.params;
    const [loading, setLoading] = useState(false);

    // Initial state from doctor object
    const [formData, setFormData] = useState({
        name: doctor.name || '',
        department: doctor.department || '',
        department_role: doctor.department_role || '',
        specialty: doctor.specialty || '',
        license_number: doctor.license_number || ''
    });

    const [originalData] = useState({ ...formData });

    const handleUpdate = async () => {
        // Find changed fields only
        const changedFields = {};
        Object.keys(formData).forEach(key => {
            if (formData[key] !== originalData[key]) {
                changedFields[key] = formData[key];
            }
        });

        if (Object.keys(changedFields).length === 0) {
            Alert.alert('No Changes', 'Please modify at least one field to update the profile.');
            return;
        }

        setLoading(true);
        try {
            await hospitalAPI.updateDoctorProfile(doctor.id, changedFields);
            Alert.alert(
                'Success',
                'Doctor profile updated successfully.',
                [{ text: 'Dismiss', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            const msg = error.response?.data?.detail || 'Failed to update professional profile.';
            Alert.alert('Update Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const renderInput = (label, key, placeholder, icon) => (
        <View style={styles.inputContainer} key={key}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputWrapper}>
                <Ionicons name={icon} size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    value={formData[key]}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, [key]: val }))}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.contentContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={28} color="#333" />
                        </TouchableOpacity>
                        <View style={styles.titleGroup}>
                            <Text style={styles.headerTitle}>Edit Clinician</Text>
                            <Text style={styles.headerSub}>Modifying professional credentials</Text>
                        </View>
                        <View style={{ width: 28 }} />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.formCard}>
                            <Text style={styles.formSectionTitle}>Clinical Profile</Text>

                            {renderInput('Full Name', 'name', 'e.g. Dr. John Smith', 'person-outline')}
                            {renderInput('Clinical Specialty', 'specialty', 'e.g. Pediatric Surgery', 'medical-outline')}
                            {renderInput('Department', 'department', 'e.g. Cardiology', 'business-outline')}
                            {renderInput('Department Role', 'department_role', 'e.g. Senior Consultant', 'shield-checkmark-outline')}
                            {renderInput('Medical License #', 'license_number', 'MED-12345678', 'document-text-outline')}

                            <TouchableOpacity
                                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                                onPress={handleUpdate}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text style={styles.submitBtnText}>Update Profile</Text>
                                        <Ionicons name="cloud-upload-outline" size={18} color="white" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                        <View style={{ height: 100 }} />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    contentContainer: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
    titleGroup: { flex: 1, marginLeft: 15 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
    headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },

    formCard: { backgroundColor: 'white', borderRadius: 32, padding: 24, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    formSectionTitle: { fontSize: 15, fontWeight: '800', color: '#94A3B8', marginBottom: 25, textTransform: 'uppercase', letterSpacing: 1.5 },

    inputContainer: { marginBottom: 22 },
    inputLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 6 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 18, height: 60 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: '#0F172A', fontSize: 16, fontWeight: '600' },

    submitBtn: { backgroundColor: COLORS.primary, height: 64, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: 'white', fontSize: 17, fontWeight: '800', marginRight: 10 }
});
