import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { teamAPI, hospitalAPI } from '../../services/api';

export default function HospitalInviteTeamScreen({ navigation }) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [roles, setRoles] = useState([]);
    const [orgId, setOrgId] = useState(null);

    useEffect(() => {
        loadRoles();
        loadOrg();
    }, []);

    const loadOrg = async () => {
        try {
            const res = await hospitalAPI.getOrganization();
            if (res.data?.id) setOrgId(res.data.id);
        } catch (e) { /* silent */ }
    };

    const loadRoles = async () => {
        try {
            const response = await teamAPI.getTeamRoles();
            const rolesData = response.data || [];
            const roleStrings = rolesData.map(r => typeof r === 'string' ? r : r.role);
            setRoles(roleStrings);
        } catch (error) {
            // Use default roles
            setRoles(['Doctor', 'Nurse', 'Admin', 'Receptionist']);
        }
    };

    const handleInvite = async () => {
        if (!email || !fullName || !selectedRole) {
            Alert.alert('Missing Fields', 'Please fill all required fields');
            return;
        }

        if (!email.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            let backendRole = 'MEMBER';
            const upperRole = selectedRole.toUpperCase();
            if (upperRole.includes('ADMIN')) backendRole = 'ADMINISTRATOR';
            if (upperRole.includes('PATIENT')) backendRole = 'PATIENT';

            // Ensure we have a valid org ID before proceeding
            let currentOrgId = orgId;
            if (!currentOrgId) {
                const orgRes = await hospitalAPI.getOrganization();
                currentOrgId = orgRes.data?.id;
            }

            const payload = {
                email: email.trim().toLowerCase(),
                full_name: fullName.trim(),
                role: backendRole,
                department_id: currentOrgId || '00000000-0000-0000-0000-000000000000',
                department_role: selectedRole || 'Physician',
            };

            await teamAPI.inviteTeamMember(payload);

            // If it's a patient, also trigger an access request so they definitely get an in-app notification
            if (backendRole === 'PATIENT') {
                try {
                    await permissionsAPI.requestAccess({
                        patient_email: email.trim().toLowerCase(),
                        reason: `Hospital team invitation from ${fullName}`
                    });
                } catch (e) { console.log('Silent skip access request notification'); }
            }

            Alert.alert(
                'Success!',
                `An invitation and system notification have been sent to ${email}. They will appear in your team list as 'Pending' until they accept.`,
                [
                    { text: 'Understood', onPress: () => navigation.goBack() }
                ]
            );
        } catch (error) {
            console.error('Invite error:', error);
            const errorMessage = error.response?.data?.detail || 'Failed to send invitation. Please check your internet connection.';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const availableRoles = roles.length > 0 ? roles : ['Doctor', 'Nurse', 'Admin', 'Receptionist'];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Invite Team Member</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="person-add" size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.subtitle}>Send an invitation to join your hospital team</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <Text style={styles.label}>Email Address *</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color="#999" />
                            <TextInput
                                style={styles.input}
                                placeholder="email@example.com"
                                placeholderTextColor="#999"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.formRow}>
                            <Text style={styles.label}>Full Name *</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    placeholderTextColor="#999"
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Role *</Text>
                        <View style={styles.rolesContainer}>
                            {availableRoles.map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.roleChip,
                                        selectedRole === role && styles.roleChipSelected
                                    ]}
                                    onPress={() => setSelectedRole(role)}
                                >
                                    <Text style={[
                                        styles.roleChipText,
                                        selectedRole === role && styles.roleChipTextSelected
                                    ]}>
                                        {role}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Info Card */}
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={24} color={COLORS.primary} />
                        <Text style={styles.infoText}>
                            The invited member will receive an email with instructions to set up their account and join your hospital.
                        </Text>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.inviteButton, loading && styles.buttonDisabled]}
                            onPress={handleInvite}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Ionicons name="send" size={18} color="white" />
                                    <Text style={styles.inviteButtonText}>Send Invite</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 50 }} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    contentContainer: { flex: 1, padding: 20 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

    iconContainer: { alignItems: 'center', marginBottom: 30 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    subtitle: { fontSize: 14, color: '#666', textAlign: 'center' },

    form: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8, marginTop: 15 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#E0E0E0' },
    input: { flex: 1, marginLeft: 10, fontSize: 15, color: '#333' },

    row: { flexDirection: 'row', justifyContent: 'space-between' },
    halfInput: { width: '48%' },

    rolesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    roleChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#E0E0E0' },
    roleChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    roleChipText: { fontSize: 14, color: '#666', fontWeight: '500' },
    roleChipTextSelected: { color: 'white' },

    infoCard: { flexDirection: 'row', backgroundColor: '#E3F2FD', padding: 15, borderRadius: 12, marginBottom: 25 },
    infoText: { flex: 1, marginLeft: 10, fontSize: 13, color: '#1976D2', lineHeight: 20 },

    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginRight: 10, alignItems: 'center' },
    cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
    inviteButton: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, marginLeft: 10, alignItems: 'center', justifyContent: 'center' },
    inviteButtonText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 },
    buttonDisabled: { opacity: 0.6 },
});
