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
    ActivityIndicator,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { hospitalAPI } from '../../services/api';

export default function HospitalDepartmentsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newDepartment, setNewDepartment] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        try {
            setLoading(true);
            const response = await hospitalAPI.getDepartments();
            setDepartments(response.data || []);
        } catch (error) {
            console.log('Departments not available:', error.message);
            // Default to empty array on failure
            setDepartments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDepartment = async () => {
        if (!newDepartment.trim()) {
            Alert.alert('Error', 'Please enter a department name');
            return;
        }

        setSaving(true);
        try {
            await hospitalAPI.createDepartment({ name: newDepartment });
            setShowModal(false);
            setNewDepartment('');
            loadDepartments();
            Alert.alert('Success', 'Department added successfully');
        } catch (error) {
            // Still add to local state for demo
            setDepartments([
                ...departments,
                { id: Date.now().toString(), name: newDepartment, doctorsCount: 0, patientsToday: 0 }
            ]);
            setShowModal(false);
            setNewDepartment('');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDepartment = (dept) => {
        Alert.alert(
            'Delete Department',
            `Are you sure you want to delete ${dept.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await hospitalAPI.deleteDepartment(dept.id);
                            loadDepartments();
                        } catch (error) {
                            // Remove locally for demo
                            setDepartments(departments.filter(d => d.id !== dept.id));
                        }
                    }
                }
            ]
        );
    };

    const getDeptColor = (index) => {
        const colors = ['#E3F2FD', '#E8F5E9', '#FFF3E0', '#F3E5F5', '#FFEBEE', '#E0F2F1'];
        const iconColors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#009688'];
        return { bg: colors[index % colors.length], icon: iconColors[index % iconColors.length] };
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading departments...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Departments</Text>
                    <TouchableOpacity onPress={() => setShowModal(true)}>
                        <Ionicons name="add-circle" size={28} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{departments.length}</Text>
                            <Text style={styles.statLabel}>Departments</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>
                                {departments.reduce((sum, d) => sum + (d.doctorsCount || 0), 0)}
                            </Text>
                            <Text style={styles.statLabel}>Total Doctors</Text>
                        </View>
                    </View>

                    {/* Departments List */}
                    <Text style={styles.sectionTitle}>All Departments</Text>

                    {departments.map((dept, index) => {
                        const colors = getDeptColor(index);
                        return (
                            <TouchableOpacity key={dept.id} style={styles.deptCard}>
                                <View style={[styles.deptIcon, { backgroundColor: colors.bg }]}>
                                    <Ionicons name="medical" size={24} color={colors.icon} />
                                </View>
                                <View style={styles.deptInfo}>
                                    <Text style={styles.deptName}>{dept.name}</Text>
                                    <Text style={styles.deptStats}>
                                        {dept.doctorsCount || 0} doctors • {dept.patientsToday || 0} patients today
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDeleteDepartment(dept)}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#F44336" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })}

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>

            {/* Add Department Modal */}
            <Modal
                visible={showModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Department</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Department name"
                            placeholderTextColor="#999"
                            value={newDepartment}
                            onChangeText={setNewDepartment}
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => {
                                    setShowModal(false);
                                    setNewDepartment('');
                                }}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalAddBtn, saving && styles.buttonDisabled]}
                                onPress={handleAddDepartment}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.modalAddText}>Add</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    contentContainer: { flex: 1, padding: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, color: '#666', fontSize: 14 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    statBox: { flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 16, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#F0F0F0' },
    statNumber: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary },
    statLabel: { fontSize: 13, color: '#666', marginTop: 5 },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 15 },

    deptCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
    deptIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    deptInfo: { flex: 1 },
    deptName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    deptStats: { fontSize: 12, color: '#666', marginTop: 4 },
    deleteButton: { padding: 10 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
    modalInput: { backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 15, height: 50, fontSize: 15, marginBottom: 20 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginRight: 10, alignItems: 'center' },
    modalCancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
    modalAddBtn: { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 12, marginLeft: 10, alignItems: 'center' },
    modalAddText: { color: 'white', fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.6 },
});
