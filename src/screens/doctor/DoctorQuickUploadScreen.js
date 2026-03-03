import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { CustomButton } from '../../components/CustomComponents';
import * as DocumentPicker from 'expo-document-picker';
import { doctorAPI } from '../../services/api';

export default function DoctorQuickUploadScreen({ navigation, route }) {
    const { patient } = route.params || {};
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const handleFilePick = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
                copyToCacheDirectory: true,
            });

            if (result.type === 'success' || !result.canceled) {
                const file = result.assets ? result.assets[0] : result;

                // Check file size (max 100MB)
                if (file.size && file.size > 100 * 1024 * 1024) {
                    Alert.alert('File Too Large', 'Maximum file size is 100MB');
                    return;
                }

                setSelectedFile(file);
                Alert.alert('File Selected', `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to select file');
        }
    };

    const handleAnalyze = async () => {
        const patientId = patient?.id;

        if (!patientId) {
            Alert.alert('Error', 'No patient ID found. Please invoke this screen from a valid patient profile.');
            return;
        }

        if (!selectedFile) {
            Alert.alert('No File Selected', 'Please select a file to upload first');
            return;
        }

        setUploading(true);
        setUploadProgress('Requesting upload URL...');

        try {
            // Step 1: Request upload URL from backend
            const urlResponse = await doctorAPI.requestUploadUrl(
                patientId,
                selectedFile.name,
                selectedFile.mimeType || 'application/pdf',
                selectedFile.size
            );

            const { upload_url, document_id } = urlResponse.data;
            setUploadProgress('Uploading file...');

            // Step 2: Upload file to the signed URL (S3 or similar)
            const formData = new FormData();
            formData.append('file', {
                uri: selectedFile.uri,
                type: selectedFile.mimeType || 'application/pdf',
                name: selectedFile.name,
            });

            await fetch(upload_url, {
                method: 'PUT',
                body: formData,
                headers: {
                    'Content-Type': selectedFile.mimeType || 'application/pdf',
                },
            });

            setUploadProgress('Confirming upload...');

            // Step 3: Confirm upload with backend
            // Step 3: Confirm upload with backend
            await doctorAPI.confirmUpload(document_id);

            setUploadProgress('Analyzing document...');

            // Step 4: Trigger document analysis
            // Step 4: Trigger document analysis
            await doctorAPI.analyzeDocument(document_id);

            setUploadProgress('Complete!');

            // Navigate to analyzed result screen
            setTimeout(() => {
                navigation.navigate('DoctorAnalyzedResultScreen', {
                    documentId: document_id,
                    fileName: selectedFile.name,
                    documentId: document_id,
                    fileName: selectedFile.name,
                    patient: patient
                });
            }, 500);

        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert(
                'Upload Failed',
                typeof error.response?.data?.detail === 'object'
                    ? JSON.stringify(error.response.data.detail)
                    : (error.response?.data?.detail || 'Failed to upload and analyze document. Please try again.')
            );
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>

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

                    <TouchableOpacity
                        style={styles.browseBtn}
                        onPress={handleFilePick}
                        disabled={uploading}
                    >
                        <Ionicons name="folder-open" size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.browseText}>
                            {selectedFile ? 'Change File' : 'Browse Files'}
                        </Text>
                    </TouchableOpacity>

                    {selectedFile && !uploading && (
                        <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => setSelectedFile(null)}
                        >
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
                        <Ionicons name="person" size={20} color={COLORS.primary} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.patientName}>{patient.name}</Text>
                            <Text style={styles.patientMrn}>MRN: {patient.mrn || 'N/A'}</Text>
                        </View>
                    </View>
                )}

                {/* Settings */}
                <Text style={styles.label}>Upload Settings</Text>
                <Text style={styles.subLabel}>Document Category</Text>
                <View style={styles.dropdown}>
                    <Text style={{ color: '#333' }}>Clinical Report</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </View>

                {/* Footer Button */}
                <View style={styles.footer}>
                    <CustomButton
                        title={uploading ? uploadProgress : 'Upload & Analyze'}
                        onPress={handleAnalyze}
                        disabled={uploading || !selectedFile}
                    />

                    {patient && (
                        <TouchableOpacity
                            style={styles.viewDocsBtn}
                            onPress={() => navigation.navigate('DoctorPatientDetailScreen', { patient, initialTab: 'Documents' })}
                        >
                            <Ionicons name="documents-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.viewDocsText}>View Patient Documents</Text>
                        </TouchableOpacity>
                    )}
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

    uploadCard: { backgroundColor: 'white', borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#DDD', padding: 30, alignItems: 'center', marginBottom: 30 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    cardSub: { textAlign: 'center', color: '#666', marginBottom: 20, lineHeight: 20 },
    browseBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 },
    browseText: { color: 'white', fontWeight: 'bold' },
    removeBtn: { marginTop: 10 },
    removeText: { color: '#E53935', fontSize: 14, fontWeight: '600' },

    uploadingContainer: { marginTop: 15, alignItems: 'center' },
    uploadingText: { marginTop: 10, fontSize: 13, color: '#666' },

    patientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#EEE' },
    patientName: { fontSize: 15, fontWeight: '600', color: '#333' },
    patientMrn: { fontSize: 12, color: '#999', marginTop: 2 },

    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    subLabel: { fontSize: 12, color: '#666', marginBottom: 8 },
    dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#EEE', marginBottom: 20 },

    footer: { marginTop: 'auto' },
    viewDocsBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15, paddingVertical: 10 },
    viewDocsText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' }
});
