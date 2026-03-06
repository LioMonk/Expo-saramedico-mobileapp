import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert,
    ActivityIndicator, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { CustomButton } from '../../components/CustomComponents';
import * as DocumentPicker from 'expo-document-picker';
import { doctorAPI } from '../../services/api';

// ─── Categories accepted by the backend ───────────────────────────────────────
const DOCUMENT_CATEGORIES = [
    { label: 'Lab Result', value: 'lab-result', icon: 'flask', color: '#1976D2', bg: '#E3F2FD' },
    { label: 'Prescription', value: 'prescription', icon: 'medical', color: '#2E7D32', bg: '#E8F5E9' },
    { label: 'Imaging', value: 'imaging', icon: 'scan', color: '#6A1B9A', bg: '#F3E5F5' },
    { label: 'Clinical Report', value: 'clinical_report', icon: 'document-text', color: '#E65100', bg: '#FFF3E0' },
    { label: 'Other', value: 'other', icon: 'folder', color: '#455A64', bg: '#ECEFF1' },
];

export default function DoctorQuickUploadScreen({ navigation, route }) {
    const { patient } = route.params || {};
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    // ── File Picker ────────────────────────────────────────────────────────────
    const handleFilePick = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
                copyToCacheDirectory: true,
            });
            if (result.type === 'success' || !result.canceled) {
                const file = result.assets ? result.assets[0] : result;
                if (file.size && file.size > 100 * 1024 * 1024) {
                    Alert.alert('File Too Large', 'Maximum file size is 100MB');
                    return;
                }
                setSelectedFile(file);
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to select file');
        }
    };

    // ── Upload & Analyze ───────────────────────────────────────────────────────
    const handleAnalyze = async () => {
        const patientId = patient?.id;
        if (!patientId) {
            Alert.alert('Error', 'No patient ID found. Please open from a valid patient profile.');
            return;
        }
        if (!selectedFile) {
            Alert.alert('No File Selected', 'Please select a file to upload first');
            return;
        }

        setUploading(true);
        setUploadProgress('Uploading document...');

        try {
            let uploadRes;
            try {
                uploadRes = await doctorAPI.uploadDocumentDirect(selectedFile, patientId, {
                    title: selectedFile.name,
                    category: category.value,
                });
            } catch (uploadError) {
                if (!uploadError.response) {
                    Alert.alert('Upload Failed', uploadError.message || 'Network error. Check your connection.');
                    return;
                }
                const errData = uploadError.response?.data;
                const isRedisError = errData?.detail && typeof errData.detail === 'string' && errData.detail.includes('redis');
                if (isRedisError) {
                    const docId = errData?.id || errData?.document_id;
                    if (docId) {
                        setUploadProgress('Complete!');
                        setTimeout(() => navigation.navigate('DoctorAnalyzedResultScreen', {
                            documentId: docId, fileName: selectedFile.name, patient,
                        }), 500);
                        return;
                    }
                    Alert.alert('Upload Failed', 'The server background service is temporarily unavailable.');
                    return;
                }
                const detail = errData?.detail;
                Alert.alert('Upload Failed', typeof detail === 'object' ? JSON.stringify(detail) : (detail || 'Failed to upload document.'));
                return;
            }

            const document_id = uploadRes.data?.document_id || uploadRes.data?.id;
            if (!document_id) throw new Error('Upload successful but no document ID returned.');

            setUploadProgress('Requesting AI analysis...');
            try {
                await doctorAPI.analyzeDocument(document_id);
            } catch (analyzeError) {
                console.warn('[Analyze] Non-fatal error:', analyzeError.message);
            }

            setUploadProgress('Complete!');
            setTimeout(() => navigation.navigate('DoctorAnalyzedResultScreen', {
                documentId: document_id, fileName: selectedFile.name, patient,
            }), 500);

        } catch (error) {
            const detail = error.response?.data?.detail;
            Alert.alert('Upload Failed', typeof detail === 'object'
                ? JSON.stringify(detail)
                : (detail || error.message || 'Failed to upload document.'));
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Upload Documents</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Upload Card */}
                <View style={styles.uploadCard}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="cloud-upload" size={40} color={COLORS.primary} />
                    </View>
                    <Text style={styles.cardTitle}>
                        {selectedFile ? selectedFile.name : 'Upload Documents'}
                    </Text>
                    <Text style={styles.cardSub}>
                        {selectedFile
                            ? `Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                            : 'Tap to browse files.\nSupports PDF, JPG, PNG. Max 100MB.'}
                    </Text>

                    <TouchableOpacity style={styles.browseBtn} onPress={handleFilePick} disabled={uploading}>
                        <Ionicons name="folder-open" size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.browseText}>{selectedFile ? 'Change File' : 'Browse Files'}</Text>
                    </TouchableOpacity>

                    {selectedFile && !uploading && (
                        <TouchableOpacity style={styles.removeBtn} onPress={() => setSelectedFile(null)}>
                            <Text style={styles.removeText}>Remove File</Text>
                        </TouchableOpacity>
                    )}

                    {uploading && (
                        <View style={styles.uploadingContainer}>
                            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 15 }} />
                            <Text style={styles.uploadingText}>{uploadProgress}</Text>
                        </View>
                    )}
                </View>

                {/* Patient Info */}
                {patient && (
                    <View style={styles.patientCard}>
                        <View style={styles.patientIconBox}>
                            <Ionicons name="person" size={20} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.patientName}>{patient.name}</Text>
                            <Text style={styles.patientMrn}>MRN: {patient.mrn || 'N/A'}</Text>
                        </View>
                    </View>
                )}

                {/* Upload Settings: Category Dropdown */}
                <View style={styles.settingsCard}>
                    <Text style={styles.settingsTitle}>Upload Settings</Text>
                    <Text style={styles.settingsLabel}>DOCUMENT CATEGORY</Text>

                    <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => setShowCategoryModal(true)}
                        disabled={uploading}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={[styles.catIconBox, { backgroundColor: category.bg }]}>
                                <Ionicons name={category.icon} size={16} color={category.color} />
                            </View>
                            <Text style={styles.dropdownText}>{category.label}</Text>
                        </View>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>

                    <Text style={styles.categoryHint}>
                        The selected category organises this document in the patient's records.
                    </Text>
                </View>

                {/* Footer Buttons */}
                <View style={styles.footer}>
                    <CustomButton
                        title={uploading ? uploadProgress : 'Upload & Analyze'}
                        onPress={handleAnalyze}
                        disabled={uploading || !selectedFile}
                    />
                    {patient && (
                        <TouchableOpacity
                            style={styles.viewDocsBtn}
                            onPress={() => navigation.navigate('DoctorPatientDetailScreen', {
                                patient, initialTab: 'Documents'
                            })}
                        >
                            <Ionicons name="documents-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.viewDocsText}>View Patient Documents</Text>
                        </TouchableOpacity>
                    )}
                </View>

            </ScrollView>

            {/* ── Category Picker Modal ─────────────────────────────────────── */}
            <Modal
                visible={showCategoryModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCategoryModal(false)}
                />
                <View style={styles.modalSheet}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>Select Document Category</Text>
                    <Text style={styles.modalSub}>Choose the type that best describes this document</Text>

                    {DOCUMENT_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat.value}
                            style={[styles.catOption, category.value === cat.value && styles.catOptionActive]}
                            onPress={() => { setCategory(cat); setShowCategoryModal(false); }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.catOptionIcon, { backgroundColor: cat.bg }]}>
                                <Ionicons name={cat.icon} size={20} color={cat.color} />
                            </View>
                            <Text style={[
                                styles.catOptionLabel,
                                category.value === cat.value && { color: COLORS.primary, fontWeight: '700' }
                            ]}>
                                {cat.label}
                            </Text>
                            {category.value === cat.value && (
                                <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} style={{ marginLeft: 'auto' }} />
                            )}
                        </TouchableOpacity>
                    ))}
                    <View style={{ height: 24 }} />
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    content: { padding: 20, paddingBottom: 40 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },

    uploadCard: {
        backgroundColor: 'white', borderRadius: 20,
        borderStyle: 'dashed', borderWidth: 2, borderColor: '#DDD',
        padding: 30, alignItems: 'center', marginBottom: 16,
    },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', color: '#1A1A1A' },
    cardSub: { textAlign: 'center', color: '#666', marginBottom: 20, lineHeight: 20 },
    browseBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
    browseText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    removeBtn: { marginTop: 12 },
    removeText: { color: '#E53935', fontSize: 14, fontWeight: '600' },
    uploadingContainer: { marginTop: 15, alignItems: 'center' },
    uploadingText: { marginTop: 10, fontSize: 13, color: '#666' },

    patientCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
        borderRadius: 14, padding: 15, marginBottom: 16, borderWidth: 1, borderColor: '#EEE',
    },
    patientIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' },
    patientName: { fontSize: 15, fontWeight: '600', color: '#333' },
    patientMrn: { fontSize: 12, color: '#999', marginTop: 2 },

    settingsCard: {
        backgroundColor: 'white', borderRadius: 16, padding: 18,
        marginBottom: 20, borderWidth: 1, borderColor: '#EEE',
    },
    settingsTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
    settingsLabel: { fontSize: 11, color: '#999', fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },

    dropdown: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#F7F8FA', borderRadius: 12, paddingHorizontal: 14,
        height: 52, borderWidth: 1.5, borderColor: COLORS.primary + '40',
    },
    catIconBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    dropdownText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
    categoryHint: { fontSize: 11, color: '#BBB', marginTop: 10, lineHeight: 16 },

    footer: { marginTop: 4 },
    viewDocsBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15, paddingVertical: 10 },
    viewDocsText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    modalSheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        padding: 24, paddingBottom: 10,
    },
    modalHandle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
    modalSub: { fontSize: 13, color: '#888', marginBottom: 20 },

    catOption: {
        flexDirection: 'row', alignItems: 'center',
        padding: 14, borderRadius: 12, marginBottom: 8,
        borderWidth: 1.5, borderColor: '#EEE', backgroundColor: '#FAFAFA', gap: 12,
    },
    catOptionActive: { borderColor: COLORS.primary, backgroundColor: '#EBF5FF' },
    catOptionIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    catOptionLabel: { fontSize: 15, fontWeight: '500', color: '#333' },
});
