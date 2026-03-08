import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

export default function PrescriptionScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Prescriptions</Text>
                <View style={{ width: 24 }} />
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.emptyContainer}>
                    <Ionicons name="bandage-outline" size={80} color="#DDD" />
                    <Text style={styles.emptyTitle}>No Prescriptions Found</Text>
                    <Text style={styles.emptyDesc}>
                        All active medication plans and prescriptions provided by your consulting doctors will be safely stored here for your reference.
                    </Text>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('MainDashboard', { screen: 'Medical Records' })}
                    >
                        <Text style={styles.actionBtnText}>Check Visit History</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    content: { flexGrow: 1, justifyContent: 'center', padding: 40 },
    emptyContainer: { alignItems: 'center' },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 20 },
    emptyDesc: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 10, lineHeight: 22 },
    actionBtn: { marginTop: 30, backgroundColor: COLORS.primary, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 12 },
    actionBtnText: { color: 'white', fontWeight: 'bold' }
});
