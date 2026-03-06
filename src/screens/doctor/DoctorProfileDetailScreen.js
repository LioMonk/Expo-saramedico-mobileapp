import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

export default function DoctorProfileDetailScreen({ route, navigation }) {
    const { doctor } = route.params;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Doctor Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {doctor.photo_url ? (
                            <Image source={{ uri: doctor.photo_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Ionicons name="person" size={50} color="#CCC" />
                            </View>
                        )}
                    </View>
                    <Text style={styles.doctorName}>Dr. {doctor.full_name || doctor.name || 'Unknown'}</Text>
                    <Text style={styles.specialty}>{doctor.specialty || 'Medical Professional'}</Text>
                </View>

                {/* Info Sections */}
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Information</Text>

                    <View style={styles.infoRow}>
                        <View style={styles.iconBox}>
                            <Ionicons name="briefcase-outline" size={18} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.infoLabel}>Specialization</Text>
                            <Text style={styles.infoText}>{doctor.specialty || 'Not Specified'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.iconBox}>
                            <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.infoLabel}>Email</Text>
                            <Text style={styles.infoText}>{doctor.email || 'Contact through hospital'}</Text>
                        </View>
                    </View>

                    {doctor.organization_name && (
                        <View style={styles.infoRow}>
                            <View style={styles.iconBox}>
                                <Ionicons name="business-outline" size={18} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.infoLabel}>Organization</Text>
                                <Text style={styles.infoText}>{doctor.organization_name}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Additional Placeholder Section */}
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.aboutText}>
                        Dedicated healthcare professional providing high-quality care and expertise in {doctor.specialty || 'medical services'}.
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.primaryBtn]}
                        onPress={() => console.log('Contact through dashboard')}
                    >
                        <Ionicons name="chatbubble-outline" size={20} color="white" />
                        <Text style={styles.primaryBtnText}>Send Message</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE'
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    content: { padding: 20 },
    profileCard: {
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#EEE',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2
    },
    avatarContainer: {
        marginBottom: 15,
        borderRadius: 50,
        padding: 5,
        backgroundColor: '#F0F7FF'
    },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: {
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EEE'
    },
    doctorName: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 5 },
    specialty: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
    infoSection: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#EEE'
    },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F0F7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    infoLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
    infoText: { fontSize: 14, color: '#333', fontWeight: '500' },
    aboutText: { fontSize: 14, color: '#666', lineHeight: 22 },
    actionContainer: { marginTop: 10 },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 12,
        marginBottom: 10
    },
    primaryBtn: { backgroundColor: COLORS.primary },
    primaryBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 }
});
