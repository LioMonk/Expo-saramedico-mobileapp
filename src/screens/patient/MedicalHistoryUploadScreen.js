import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Button, TextInput, Card } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { Picker } from '@react-native-picker/picker';
import { patientAPI } from '../../services/api';
import { DOCUMENT_CATEGORIES } from '../../services/config';
import FileUploadService from '../../services/fileUpload';
import ErrorHandler from '../../services/errorHandler';

/**
 * Medical History Upload Screen
 * 
 * Allows patients to upload medical documents (PDF, images, DICOM files)
 * with HIPAA-compliant security
 */
export default function MedicalHistoryUploadScreen({ navigation }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [category, setCategory] = useState(DOCUMENT_CATEGORIES.LAB_REPORT);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    /**
     * Handle file selection
     */
    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*', 'application/dicom'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];

                // Validate file
                const validation = FileUploadService.validateFile({
                    uri: asset.uri,
                    name: asset.name,
                    size: asset.size,
                    type: asset.mimeType,
                });

                if (!validation.valid) {
                    Alert.alert('Invalid File', validation.error);
                    return;
                }

                setSelectedFile({
                    uri: asset.uri,
                    name: asset.name,
                    size: asset.size,
                    type: asset.mimeType,
                });
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to select document');
        }
    };

    /**
     * Handle file upload
     */
    const handleUpload = async () => {
        if (!selectedFile) {
            Alert.alert('No File Selected', 'Please select a file to upload');
            return;
        }

        if (!category) {
            Alert.alert('Category Required', 'Please select a document category');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const response = await patientAPI.uploadMedicalHistory(
                selectedFile,
                category,
                title || selectedFile.name,
                description,
                (progress) => {
                    setUploadProgress(progress);
                }
            );

            const fileName = response.data?.file_name || response.data?.filename || selectedFile.name;
            Alert.alert(
                'Upload Successful',
                `${fileName} has been uploaded successfully`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setSelectedFile(null);
                            setTitle('');
                            setDescription('');
                            setUploadProgress(0);
                            navigation.goBack();
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Upload error:', error);
            // Check for Redis/Celery connectivity error — file may still have been saved
            const errData = error.response?.data;
            const isRedisError = errData?.detail && typeof errData.detail === 'string'
                && errData.detail.includes('redis');

            if (error.response?.status === 500 && isRedisError) {
                Alert.alert(
                    'Upload Completed',
                    'Your document was uploaded but AI processing is temporarily unavailable. You can still view it in your records.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                const errorInfo = ErrorHandler.handleError(error);
                Alert.alert('Upload Failed', errorInfo.message);
            }
        } finally {
            setUploading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <Text style={styles.title}>Upload Medical Document</Text>
                    <Text style={styles.subtitle}>
                        Upload your medical records securely. All files are encrypted and HIPAA-compliant.
                    </Text>

                    {/* File Picker */}
                    <TouchableOpacity
                        style={styles.filePickerButton}
                        onPress={pickDocument}
                        disabled={uploading}
                    >
                        <Text style={styles.filePickerText}>
                            {selectedFile ? selectedFile.name : 'Select File'}
                        </Text>
                        {selectedFile && (
                            <Text style={styles.fileSizeText}>
                                {FileUploadService.formatFileSize(selectedFile.size)}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Category Picker */}
                    <View style={styles.pickerContainer}>
                        <Text style={styles.label}>Document Category *</Text>
                        <Picker
                            selectedValue={category}
                            onValueChange={(value) => setCategory(value)}
                            enabled={!uploading}
                            style={styles.picker}
                        >
                            <Picker.Item label="Lab Report" value={DOCUMENT_CATEGORIES.LAB_REPORT} />
                            <Picker.Item label="Prescription" value={DOCUMENT_CATEGORIES.PRESCRIPTION} />
                            <Picker.Item label="Imaging (X-Ray, MRI, etc.)" value={DOCUMENT_CATEGORIES.IMAGING} />
                            <Picker.Item label="Consultation Notes" value={DOCUMENT_CATEGORIES.CONSULTATION_NOTES} />
                            <Picker.Item label="Discharge Summary" value={DOCUMENT_CATEGORIES.DISCHARGE_SUMMARY} />
                            <Picker.Item label="Other" value={DOCUMENT_CATEGORIES.OTHER} />
                        </Picker>
                    </View>

                    {/* Title Input */}
                    <TextInput
                        label="Title (Optional)"
                        value={title}
                        onChangeText={setTitle}
                        mode="outlined"
                        style={styles.input}
                        disabled={uploading}
                        placeholder="e.g., Blood Test Results - Jan 2026"
                    />

                    {/* Description Input */}
                    <TextInput
                        label="Description (Optional)"
                        value={description}
                        onChangeText={setDescription}
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                        style={styles.input}
                        disabled={uploading}
                        placeholder="Add any additional notes about this document"
                    />

                    {/* Upload Progress */}
                    {uploading && (
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressText}>Uploading: {uploadProgress}%</Text>
                            <ActivityIndicator size="large" color="#6200ee" />
                        </View>
                    )}

                    {/* Upload Button */}
                    <Button
                        mode="contained"
                        onPress={handleUpload}
                        disabled={!selectedFile || uploading}
                        style={styles.uploadButton}
                        loading={uploading}
                    >
                        {uploading ? 'Uploading...' : 'Upload Document'}
                    </Button>

                    {/* Info Text */}
                    <Text style={styles.infoText}>
                        Allowed file types: PDF, JPG, PNG, DICOM{'\n'}
                        Maximum file size: 100MB{'\n'}
                        Files are encrypted and stored securely
                    </Text>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    card: {
        margin: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
    },
    filePickerButton: {
        backgroundColor: '#e0e0e0',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        alignItems: 'center',
    },
    filePickerText: {
        fontSize: 16,
        color: '#333',
    },
    fileSizeText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    pickerContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    picker: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
    },
    input: {
        marginBottom: 16,
    },
    progressContainer: {
        alignItems: 'center',
        marginVertical: 16,
    },
    progressText: {
        fontSize: 16,
        marginBottom: 8,
        color: '#6200ee',
    },
    uploadButton: {
        marginTop: 8,
        marginBottom: 16,
    },
    infoText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
    },
});
