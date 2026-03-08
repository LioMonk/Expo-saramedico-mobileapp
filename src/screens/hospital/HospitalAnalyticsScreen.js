import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../services/config';
import { hospitalAPI } from '../../services/api';

const { width } = Dimensions.get('window');

export default function HospitalAnalyticsScreen({ navigation }) {
    const [metrics, setMetrics] = useState({
        totalPatients: 0,
        totalAppointments: 0,
        totalRevenue: 0,
        activeDoctors: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await hospitalAPI.getOverview();
            const data = response.data || {};
            setMetrics({
                totalPatients: data.metrics?.activePatients || data.total_patients || 0,
                totalAppointments: data.metrics?.totalAppointments || data.total_appointments || 0,
                totalRevenue: data.metrics?.revenue || 0,
                activeDoctors: data.metrics?.activeDoctors || data.total_doctors || 0,
            });
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const MetricCard = ({ icon, title, value, change, color }) => (
        <View style={[styles.metricCard, { borderLeftColor: color }]}>
            <View style={styles.metricHeader}>
                <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon} size={24} color={color} />
                </View>
                <Text style={styles.metricTitle}>{title}</Text>
            </View>
            <Text style={styles.metricValue}>{value}</Text>
            {change && (
                <View style={styles.changeContainer}>
                    <Ionicons
                        name={change > 0 ? 'trending-up' : 'trending-down'}
                        size={16}
                        color={change > 0 ? '#10B981' : '#EF4444'}
                    />
                    <Text style={[styles.changeText, { color: change > 0 ? '#10B981' : '#EF4444' }]}>
                        {Math.abs(change)}% {change > 0 ? 'increase' : 'decrease'}
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Analytics Dashboard</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={fetchAnalytics}>
                    <Ionicons name="refresh" size={24} color="#0066CC" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Key Metrics */}
                <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
                <View style={styles.metricsGrid}>
                    <MetricCard
                        icon="people"
                        title="Total Patients"
                        value={metrics.totalPatients.toLocaleString()}
                        change={12}
                        color="#3B82F6"
                    />
                    <MetricCard
                        icon="calendar"
                        title="Appointments"
                        value={metrics.totalAppointments.toLocaleString()}
                        change={8}
                        color="#8B5CF6"
                    />
                    <MetricCard
                        icon="cash"
                        title="Revenue"
                        value={`$${metrics.totalRevenue.toLocaleString()}`}
                        change={15}
                        color="#10B981"
                    />
                    <MetricCard
                        icon="medical"
                        title="Active Doctors"
                        value={metrics.activeDoctors.toLocaleString()}
                        change={5}
                        color="#F59E0B"
                    />
                </View>

                {/* Placeholder for Charts */}
                <Text style={styles.sectionTitle}>Trends & Insights</Text>
                <View style={styles.chartPlaceholder}>
                    <Ionicons name="bar-chart" size={48} color="#CCC" />
                    <Text style={styles.placeholderText}>Charts coming soon</Text>
                    <Text style={styles.placeholderSubtext}>
                        Detailed analytics and visualizations will be available here
                    </Text>
                </View>

                {/* Department Performance */}
                <Text style={styles.sectionTitle}>Department Performance</Text>
                <View style={styles.departmentCard}>
                    <View style={styles.departmentRow}>
                        <Text style={styles.departmentName}>Cardiology</Text>
                        <View style={styles.performanceBar}>
                            <View style={[styles.performanceFill, { width: '85%', backgroundColor: '#10B981' }]} />
                        </View>
                        <Text style={styles.performanceText}>85%</Text>
                    </View>
                    <View style={styles.departmentRow}>
                        <Text style={styles.departmentName}>Neurology</Text>
                        <View style={styles.performanceBar}>
                            <View style={[styles.performanceFill, { width: '72%', backgroundColor: '#3B82F6' }]} />
                        </View>
                        <Text style={styles.performanceText}>72%</Text>
                    </View>
                    <View style={styles.departmentRow}>
                        <Text style={styles.departmentName}>Pediatrics</Text>
                        <View style={styles.performanceBar}>
                            <View style={[styles.performanceFill, { width: '68%', backgroundColor: '#F59E0B' }]} />
                        </View>
                        <Text style={styles.performanceText}>68%</Text>
                    </View>
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
    refreshButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
        marginTop: 8,
    },
    metricsGrid: {
        gap: 12,
        marginBottom: 24,
    },
    metricCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    metricHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    metricTitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    metricValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    changeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    changeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    chartPlaceholder: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    placeholderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#9CA3AF',
        marginTop: 12,
    },
    placeholderSubtext: {
        fontSize: 13,
        color: '#D1D5DB',
        marginTop: 4,
        textAlign: 'center',
    },
    departmentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        gap: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    departmentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    departmentName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        width: 100,
    },
    performanceBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    performanceFill: {
        height: '100%',
        borderRadius: 4,
    },
    performanceText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        width: 40,
        textAlign: 'right',
    },
});
