import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

export default function AdminOrgDetailScreen({ route, navigation }) {
    const { organization } = route.params || {};

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Organization Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="business" size={40} color={COLORS.primary} />
                    </View>
                    <Text style={styles.orgName}>{organization?.name || 'Unknown Organization'}</Text>
                    <Text style={styles.orgType}>{organization?.type?.toUpperCase() || 'UNKNOWN TYPE'}</Text>

                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{organization?.status || 'Active'}</Text>
                    </View>
                </View>

                <View style={styles.detailsCard}>
                    <Text style={styles.sectionTitle}>Details</Text>

                    <View style={styles.detailRow}>
                        <Ionicons name="mail" size={20} color="#666" />
                        <Text style={styles.detailText}>{organization?.email || 'No email provided'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Ionicons name="people" size={20} color="#666" />
                        <Text style={styles.detailText}>{organization?.members_count || 0} Members</Text>
                    </View>

                    {/* Add more details as needed */}
                </View>
            </ScrollView>
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
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    orgName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    orgType: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        marginBottom: 12,
    },
    statusBadge: {
        backgroundColor: '#DEF7EC',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        color: '#03543F',
        fontWeight: '600',
        fontSize: 14,
        textTransform: 'capitalize',
    },
    detailsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailText: {
        fontSize: 16,
        color: '#4B5563',
        marginLeft: 12,
    }
});
