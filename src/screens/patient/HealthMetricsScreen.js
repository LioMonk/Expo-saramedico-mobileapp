import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { COLORS } from '../../constants/theme';
import { patientAPI } from '../../services/api';
import ErrorHandler from '../../services/errorHandler';
import moment from 'moment';

const { width } = Dimensions.get('window');

export default function HealthMetricsScreen({ navigation }) {
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [patientId, setPatientId] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (isRefreshing = false) => {
        try {
            if (!isRefreshing) setLoading(true);
            const profileRes = await patientAPI.getProfile();
            const id = profileRes.data?.id;
            setPatientId(id);

            if (id) {
                const response = await patientAPI.getHealthMetrics(id);
                setMetrics(response.data || []);
            }
        } catch (error) {
            ErrorHandler.handleError(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData(true);
    };

    const groupedMetrics = metrics.reduce((acc, m) => {
        const type = m.metric_type.replace(/_/g, ' ').toUpperCase();
        if (!acc[type]) acc[type] = [];
        acc[type].push(m);
        return acc;
    }, {});

    const renderMetricCard = (type, data) => {
        if (!data || data.length === 0) return null;
        const latest = data[0];
        const iconName = type.includes('BLOOD PRESSURE') ? 'heart-outline' :
            type.includes('HEART') ? 'pulse-outline' :
                type.includes('TEMP') ? 'thermometer-outline' : 'fitness-outline';

        const accentColor = type.includes('BLOOD PRESSURE') ? '#F44336' :
            type.includes('HEART') ? '#E91E63' :
                type.includes('TEMP') ? '#FF9800' : COLORS.primary;

        // Prep data for chart (last 5 entries)
        let chartData = [...data].reverse().slice(-5);
        let labels = chartData.map(d => moment(d.recorded_at).format('DD/MM'));
        let values = chartData.map(d => {
            const val = parseFloat(d.value);
            return isNaN(val) ? 0 : val;
        });

        // Ensure at least 2 points for LineChart
        if (values.length === 1) {
            labels = [' ', labels[0]];
            values = [values[0], values[0]];
        }

        return (
            <View key={type} style={styles.metricCard}>
                <View style={styles.metricHeader}>
                    <View style={[styles.iconBox, { backgroundColor: accentColor + '15' }]}>
                        <Ionicons name={iconName} size={24} color={accentColor} />
                    </View>
                    <View style={styles.metricTitleBox}>
                        <Text style={styles.metricTitle}>{type}</Text>
                        <Text style={styles.lastUpdatedText}>
                            Last recorded: {moment(latest.recorded_at).fromNow()}
                        </Text>
                    </View>
                    <View style={styles.latestValueBox}>
                        <Text style={[styles.latestValue, { color: accentColor }]}>{latest.value}</Text>
                        <Text style={styles.unitText}>{latest.unit}</Text>
                    </View>
                </View>

                {values.length > 0 && (
                    <View style={styles.chartContainer}>
                        <LineChart
                            data={{
                                labels: labels,
                                datasets: [{ data: values }],
                            }}
                            width={width - 64}
                            height={160}
                            chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 1,
                                color: (opacity = 1) => accentColor,
                                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.5})`,
                                style: { borderRadius: 16 },
                                propsForDots: { r: "5", strokeWidth: "2", stroke: "#fff" }
                            }}
                            bezier
                            style={{ marginVertical: 8, borderRadius: 16 }}
                            fromZero={true}
                        />
                    </View>
                )}

                {latest.notes && (
                    <View style={styles.notesBox}>
                        <Ionicons name="information-circle-outline" size={16} color="#666" />
                        <Text style={styles.notesText}>{latest.notes}</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Health Vitals</Text>
                <TouchableOpacity onPress={() => loadData()} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Fetching your latest vitals...</Text>
                </View>
            ) : metrics.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Ionicons name="fitness-outline" size={80} color="#E0E0E0" />
                    <Text style={styles.emptyTitle}>No Vitals Found</Text>
                    <Text style={styles.emptySub}>Your medical team will record your vitals here.</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color={COLORS.primary} />}
                >
                    <Text style={styles.sectionDesc}>
                        Keep track of your key health metrics recorded by your medical team.
                    </Text>

                    {Object.keys(groupedMetrics).map(type => renderMetricCard(type, groupedMetrics[type]))}

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center' },
    refreshBtn: { padding: 4 },
    content: { flex: 1, padding: 16 },
    sectionDesc: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center', lineHeight: 20 },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, color: '#888', fontSize: 15 },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#444', marginTop: 24 },
    emptySub: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center' },
    metricCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    metricHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    metricTitleBox: { flex: 1 },
    metricTitle: { fontSize: 15, fontWeight: 'bold', color: '#263238' },
    lastUpdatedText: { fontSize: 11, color: '#90A4AE', marginTop: 2 },
    latestValueBox: { alignItems: 'flex-end' },
    latestValue: { fontSize: 20, fontWeight: 'bold' },
    unitText: { fontSize: 11, color: '#90A4AE', fontWeight: '600' },
    chartContainer: { marginTop: 10, alignItems: 'center' },
    chart: { marginVertical: 8, borderRadius: 16 },
    notesBox: { flexDirection: 'row', backgroundColor: '#F5F7F9', padding: 10, borderRadius: 8, marginTop: 12, gap: 8 },
    notesText: { flex: 1, fontSize: 12, color: '#546E7A', fontStyle: 'italic' },
});
