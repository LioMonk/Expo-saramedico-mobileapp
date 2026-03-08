import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
} from 'react-native';
import { Card, Chip, Button } from 'react-native-paper';
import { doctorAPI } from '../../services/api';
import ErrorHandler from '../../services/errorHandler';

/**
 * Patient Documents Screen
 * 
 * Allows doctors to view patient medical documents (permission-based)
 */
export default function PatientDocumentsScreen({ route, navigation }) {
    const { patientId } = route.params;

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPatientDocuments();
    }, []);

    /**
     * Load patient documents
     */
    const loadPatientDocuments = async () => {
        setLoading(true);
        try {
            const response = await doctorAPI.getPatientDocuments(patientId);
            const docsData = response.data?.documents || response.data;
            setDocuments(Array.isArray(docsData) ? docsData : []);
        } catch (error) {
            console.error('Load error:', error);
            const errorInfo = ErrorHandler.handleError(error);

            if (errorInfo.statusCode === 403) {
                Alert.alert(
                    'Access Denied',
                    'You do not have permission to view this patient\'s documents. The patient must grant access during appointment booking.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert('Load Failed', errorInfo.message);
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * Open document URL
     */
    const handleOpenDocument = async (document) => {
        try {
            const canOpen = await Linking.canOpenURL(document.presigned_url);
            if (canOpen) {
                await Linking.openURL(document.presigned_url);
            } else {
                Alert.alert('Error', 'Cannot open document URL');
            }
        } catch (error) {
            console.error('Open document error:', error);
            Alert.alert('Error', 'Failed to open document');
        }
    };

    /**
     * Get category color
     */
    const getCategoryColor = (category) => {
        const colors = {
            LAB_REPORT: '#2196f3',
            PRESCRIPTION: '#4caf50',
            IMAGING: '#ff9800',
            CONSULTATION_NOTES: '#9c27b0',
            DISCHARGE_SUMMARY: '#f44336',
            OTHER: '#757575',
        };
        return colors[category] || colors.OTHER;
    };

    /**
     * Format file size
     */
    const formatFileSize = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    /**
     * Render document card
     */
    const renderDocumentCard = ({ item }) => {
        const uploadedDate = new Date(item.uploaded_at);

        return (
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.header}>
                        <Text style={styles.fileName}>{item.file_name}</Text>
                        <Chip
                            mode="flat"
                            style={[
                                styles.categoryChip,
                                { backgroundColor: getCategoryColor(item.category) + '20' },
                            ]}
                            textStyle={[
                                styles.categoryChipText,
                                { color: getCategoryColor(item.category) },
                            ]}
                        >
                            {item.category.replace('_', ' ')}
                        </Chip>
                    </View>

                    {item.title && (
                        <Text style={styles.title}>{item.title}</Text>
                    )}

                    {item.notes && (
                        <Text style={styles.notes}>{item.notes}</Text>
                    )}

                    <View style={styles.metaContainer}>
                        <Text style={styles.metaText}>
                            Size: {formatFileSize(item.file_size)}
                        </Text>
                        <Text style={styles.metaText}>
                            Uploaded: {uploadedDate.toLocaleDateString()}
                        </Text>
                    </View>

                    <Button
                        mode="contained"
                        onPress={() => handleOpenDocument(item)}
                        style={styles.viewButton}
                        icon="eye"
                    >
                        View Document
                    </Button>

                    <Text style={styles.expiryText}>
                        ⚠️ Presigned URL expires in 15 minutes
                    </Text>
                </Card.Content>
            </Card>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6200ee" />
                <Text style={styles.loadingText}>Loading documents...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={documents}
                renderItem={renderDocumentCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshing={loading}
                onRefresh={loadPatientDocuments}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No documents found</Text>
                        <Text style={styles.emptySubtext}>
                            The patient has not uploaded any medical documents yet.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    listContainer: {
        padding: 16,
    },
    card: {
        marginBottom: 16,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    fileName: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 8,
    },
    categoryChip: {
        height: 28,
    },
    categoryChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    notes: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
        lineHeight: 20,
    },
    metaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    metaText: {
        fontSize: 12,
        color: '#999',
    },
    viewButton: {
        marginBottom: 8,
    },
    expiryText: {
        fontSize: 11,
        color: '#ff9800',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 48,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
});
