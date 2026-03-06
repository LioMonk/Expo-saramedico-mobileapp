import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DoctorAvailabilityScreen({ navigation }) {
    const [availability, setAvailability] = useState({
        Monday: { enabled: true, start: '09:00', end: '17:00' },
        Tuesday: { enabled: true, start: '09:00', end: '17:00' },
        Wednesday: { enabled: true, start: '09:00', end: '17:00' },
        Thursday: { enabled: true, start: '09:00', end: '17:00' },
        Friday: { enabled: true, start: '09:00', end: '17:00' },
        Saturday: { enabled: false, start: '09:00', end: '13:00' },
        Sunday: { enabled: false, start: '09:00', end: '13:00' }
    });

    useEffect(() => {
        const loadAvailability = async () => {
            try {
                const stored = await AsyncStorage.getItem('doctor_availability');
                if (stored) {
                    setAvailability(JSON.parse(stored));
                }
            } catch (error) {
                console.error('Error loading local availability', error);
            }
        };
        loadAvailability();
    }, []);

    const toggleDay = (day) => {
        setAvailability(prev => ({
            ...prev,
            [day]: { ...prev[day], enabled: !prev[day].enabled }
        }));
    };

    const handleSave = async () => {
        try {
            await AsyncStorage.setItem('doctor_availability', JSON.stringify(availability));
            console.log('Saved availability locally');
        } catch (error) {
            console.error('Error saving local availability', error);
        }
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Availability</Text>
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.subtitle}>Set your working hours for each day</Text>

                    {DAYS.map((day) => (
                        <View key={day} style={styles.dayCard}>
                            <View style={styles.dayHeader}>
                                <Text style={styles.dayName}>{day}</Text>
                                <Switch
                                    value={availability[day].enabled}
                                    onValueChange={() => toggleDay(day)}
                                    trackColor={{ false: "#DDD", true: COLORS.primary }}
                                    thumbColor="white"
                                />
                            </View>
                            {availability[day].enabled && (
                                <View style={styles.timeRow}>
                                    <View style={styles.timeBox}>
                                        <Text style={styles.timeLabel}>Start</Text>
                                        <Text style={styles.timeValue}>{availability[day].start}</Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={20} color="#999" />
                                    <View style={styles.timeBox}>
                                        <Text style={styles.timeLabel}>End</Text>
                                        <Text style={styles.timeValue}>{availability[day].end}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    content: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    saveText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
    dayCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
    dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dayName: { fontSize: 16, fontWeight: '600', color: '#333' },
    timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    timeBox: { flex: 1, alignItems: 'center' },
    timeLabel: { fontSize: 12, color: '#999', marginBottom: 5 },
    timeValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary }
});
