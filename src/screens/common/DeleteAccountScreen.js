import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
    TextInput,
    Alert,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../services/config';

export default function DeleteAccountScreen({ navigation }) {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [password, setPassword] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDeleteAccount = async () => {
        if (confirmText.toLowerCase() !== 'delete') {
            Alert.alert('Error', 'Please type DELETE to confirm');
            return;
        }

        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        Alert.alert(
            'Final Confirmation',
            'This action cannot be undone. All your data will be permanently deleted. Are you absolutely sure?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete My Account',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const token = await AsyncStorage.getItem('userToken');

                            // Simulated account deletion - backend endpoint missing
                            // await axios.delete(`${API_CONFIG.BASE_URL}/users/me`, {
                            //     headers: { Authorization: `Bearer ${token}` },
                            //     data: {
                            //         password: password,
                            //         reason: reason,
                            //     },
                            // });

                            // Simulate delay
                            await new Promise(resolve => setTimeout(resolve, 800));

                            // Clear all local data
                            await AsyncStorage.clear();

                            Alert.alert(
                                'Account Deleted',
                                'Your account has been permanently deleted.',
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => {
                                            // Navigate to login screen
                                            navigation.reset({
                                                index: 0,
                                                routes: [{ name: 'LoginScreen' }],
                                            });
                                        },
                                    },
                                ]
                            );
                        } catch (error) {
                            console.error('Error deleting account:', error);
                            Alert.alert(
                                'Error',
                                error.response?.data?.detail || 'Failed to delete account. Please try again.'
                            );
                        } finally {
                            setLoading(false);
                            setShowConfirmModal(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Delete Account</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Warning Banner */}
                <View style={styles.warningBanner}>
                    <Ionicons name="warning" size={48} color="#EF4444" />
                    <Text style={styles.warningTitle}>Warning: This Action is Permanent</Text>
                    <Text style={styles.warningText}>
                        Deleting your account will permanently remove all your data, including:
                    </Text>
                </View>

                {/* What Will Be Deleted */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>What will be deleted:</Text>
                    <View style={styles.listItem}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                        <Text style={styles.listText}>Your profile and personal information</Text>
                    </View>
                    <View style={styles.listItem}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                        <Text style={styles.listText}>All medical records and documents</Text>
                    </View>
                    <View style={styles.listItem}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                        <Text style={styles.listText}>Appointment history</Text>
                    </View>
                    <View style={styles.listItem}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                        <Text style={styles.listText}>Messages and communications</Text>
                    </View>
                    <View style={styles.listItem}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                        <Text style={styles.listText}>All other associated data</Text>
                    </View>
                </View>

                {/* Reason (Optional) */}
                <View style={styles.section}>
                    <Text style={styles.inputLabel}>Reason for leaving (Optional):</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Help us improve by telling us why you're leaving..."
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Delete Button */}
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => setShowConfirmModal(true)}
                    disabled={loading}
                >
                    <Ionicons name="trash" size={20} color="#FFFFFF" />
                    <Text style={styles.deleteButtonText}>
                        {loading ? 'Deleting...' : 'Delete My Account'}
                    </Text>
                </TouchableOpacity>

                {/* Alternative Options */}
                <View style={styles.alternativeSection}>
                    <Text style={styles.alternativeTitle}>Not sure about deleting?</Text>
                    <Text style={styles.alternativeText}>
                        You can temporarily deactivate your account instead, or contact support for help.
                    </Text>
                    <TouchableOpacity style={styles.alternativeButton}>
                        <Text style={styles.alternativeButtonText}>Contact Support</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Confirmation Modal */}
            <Modal visible={showConfirmModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Ionicons name="warning" size={32} color="#EF4444" />
                            <Text style={styles.modalTitle}>Confirm Account Deletion</Text>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.modalText}>
                                To confirm deletion, please type <Text style={styles.boldText}>DELETE</Text> below:
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Type DELETE"
                                value={confirmText}
                                onChangeText={setConfirmText}
                                autoCapitalize="characters"
                            />

                            <Text style={styles.modalText}>Enter your password:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setShowConfirmModal(false);
                                    setConfirmText('');
                                    setPassword('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.confirmDeleteButton,
                                    (confirmText.toLowerCase() !== 'delete' || !password) && styles.disabledButton,
                                ]}
                                onPress={handleDeleteAccount}
                                disabled={confirmText.toLowerCase() !== 'delete' || !password || loading}
                            >
                                <Text style={styles.confirmDeleteButtonText}>
                                    {loading ? 'Deleting...' : 'Delete Account'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    warningBanner: {
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#FEE2E2',
    },
    warningTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#991B1B',
        marginTop: 12,
        marginBottom: 8,
        textAlign: 'center',
    },
    warningText: {
        fontSize: 14,
        color: '#B91C1C',
        textAlign: 'center',
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    listText: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#1F2937',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    deleteButton: {
        flexDirection: 'row',
        backgroundColor: '#EF4444',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    alternativeSection: {
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    alternativeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E40AF',
        marginBottom: 8,
    },
    alternativeText: {
        fontSize: 14,
        color: '#1E40AF',
        textAlign: 'center',
        marginBottom: 12,
    },
    alternativeButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    alternativeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        maxHeight: '80%',
    },
    modalHeader: {
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 12,
    },
    modalBody: {
        padding: 24,
    },
    modalText: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    boldText: {
        fontWeight: '700',
        color: '#EF4444',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    confirmDeleteButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        alignItems: 'center',
    },
    confirmDeleteButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    disabledButton: {
        backgroundColor: '#FCA5A5',
        opacity: 0.6,
    },
});
