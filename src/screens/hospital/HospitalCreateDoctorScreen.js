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
    Platform,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { hospitalAPI } from '../../services/api';

export default function HospitalCreateDoctorScreen({ route, navigation }) {
    const { department } = route.params || {};
    const [loading, setLoading] = useState(false);

    // Department dropdown state
    const [departments, setDepartments] = useState([]);
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [loadingDeps, setLoadingDeps] = useState(true);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        department: department || '',
        department_role: '',
        license_number: ''
    });

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await hospitalAPI.getDepartments();
                setDepartments(response.data?.departments || []);
            } catch (err) {
                console.error("Failed to load departments:", err);
                // Fallback basic departments if offline or error
                setDepartments(['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Surgery', 'Emergency', 'Dermatology']);
            } finally {
                setLoadingDeps(false);
            }
        };
        fetchDepartments();
    }, []);

    const handleCreate = async () => {
        // Validation
        const required = ['email', 'password', 'name', 'department', 'department_role', 'license_number'];
        const missing = required.filter(key => !formData[key].trim());

        if (missing.length > 0) {
            Alert.alert('Incomplete Form', `Please fill in all clinical fields: ${missing.join(', ')}`);
            return;
        }

        setLoading(true);
        try {
            await hospitalAPI.createDoctorAccount(formData);
            Alert.alert(
                'Success',
                'Doctor account created successfully. Credentials have been sent to their email.',
                [{ text: 'Great', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            const msg = error.response?.data?.detail || 'Failed to onboard doctor. Please verify the license number or email.';
            Alert.alert('Onboarding Error', msg);
        } finally {
            setLoading(true); // Keep loading state for UX
            setLoading(false);
        }
    };

    const renderInput = (label, key, placeholder, icon, secure = false) => (
        <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputWrapper}>
                <Ionicons name={icon} size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    value={formData[key]}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, [key]: val }))}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={secure}
                    autoCapitalize={key === 'email' ? 'none' : 'words'}
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
                            <Ionicons name="close" size={28} color="#333" />
                        </TouchableOpacity>
                        <View style={styles.titleGroup}>
                            <Text style={styles.headerTitle}>Onboard Clinician</Text>
                            <Text style={styles.headerSub}>Create new professional profile</Text>
                        </View>
                        <View style={{ width: 28 }} />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.formCard}>
                            <Text style={styles.formSectionTitle}>Clinical Credentials</Text>

                            {renderInput('Full Name', 'name', 'e.g. Dr. John Smith', 'person-outline')}
                            {renderInput('Official Email', 'email', 'doctor@hospital.com', 'mail-outline')}
                            {renderInput('Initial Password', 'password', 'SecurePassword123!', 'lock-closed-outline', true)}

                            {/* Department Dropdown */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Department</Text>
                                <TouchableOpacity
                                    style={styles.inputWrapper}
                                    onPress={() => setShowDeptModal(true)}
                                >
                                    <Ionicons name="medical-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                    <View style={{ flex: 1, justifyContent: 'center' }}>
                                        <Text style={[styles.input, { color: formData.department ? '#1E293B' : '#94A3B8', marginTop: Platform.OS === 'ios' ? 0 : 0 }]}>
                                            {formData.department || 'Select Department'}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-down" size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            {renderInput('Department Role', 'department_role', 'e.g. Head of Unit', 'shield-checkmark-outline')}
                            {renderInput('Medical License #', 'license_number', 'MED-12345678', 'document-text-outline')}

                            <TouchableOpacity
                                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                                onPress={handleCreate}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text style={styles.submitBtnText}>Create Professional Account</Text>
                                        <Ionicons name="arrow-forward" size={18} color="white" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                        <View style={{ height: 100 }} />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            {/* Department Modal */}
            <Modal visible={showDeptModal} transparent animationType="fade" onRequestClose={() => setShowDeptModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDeptModal(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Department</Text>
                            <TouchableOpacity onPress={() => setShowDeptModal(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        {loadingDeps ? (
                            <ActivityIndicator size="small" color={COLORS.primary} style={{ padding: 20 }} />
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                                {departments.map((dep, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.modalItem}
                                        onPress={() => {
                                            setFormData(prev => ({ ...prev, department: dep }));
                                            setShowDeptModal(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.modalItemText,
                                            formData.department === dep && { color: COLORS.primary, fontWeight: '700' }
                                        ]}>
                                            {dep}
                                        </Text>
                                        {formData.department === dep && (
                                            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                                {departments.length === 0 && (
                                    <Text style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>No departments found</Text>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
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

    formCard: { backgroundColor: 'white', borderRadius: 32, padding: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    formSectionTitle: { fontSize: 16, fontWeight: '700', color: '#64748B', marginBottom: 25, textTransform: 'uppercase', letterSpacing: 1 },

    inputContainer: { marginBottom: 22 },
    inputLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 10, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 56 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: '#1E293B', fontSize: 16, fontWeight: '500' },

    submitBtn: { backgroundColor: COLORS.primary, height: 64, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15, elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: 'white', fontSize: 17, fontWeight: '800', marginRight: 10 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 24, width: '100%', padding: 24, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    modalItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalItemText: { fontSize: 16, color: '#334155', fontWeight: '500' }
});
