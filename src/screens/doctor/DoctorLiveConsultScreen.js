/**
 * DoctorLiveConsultScreen.js
 * New Consultation Session — premium redesign
 * Same features as website /dashboard/doctor/live-consult
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, TextInput, ScrollView, StyleSheet,
    TouchableOpacity, ActivityIndicator, Alert, Animated,
    StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '../../constants/theme';
import { doctorAPI } from '../../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
    if (!iso) return 'N/A';
    try {
        return new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    } catch { return 'N/A'; }
};

const initials = (name = '') =>
    name.replace(/[^a-zA-Z\s]/g, '').trim()[0]?.toUpperCase() || 'P';

const ACCENT = '#6366F1';           // indigo
const ACCENT2 = '#8B5CF6';          // violet
const DANGER = '#EF4444';
const SUCCESS = '#10B981';
const CARD_BG = '#FFFFFF';
const PAGE_BG = '#F0F2F8';

// ─── Component ───────────────────────────────────────────────────────────────
export default function DoctorLiveConsultScreen({ navigation }) {
    const [allPatients, setAllPatients] = useState([]);
    const [recentPatients, setRecentPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [activeConsultation, setActiveConsultation] = useState(null);

    const [isMicActive, setIsMicActive] = useState(false);
    const micAnimValues = useRef([...Array(20)].map(() => new Animated.Value(4))).current;
    const micIntervalRef = useRef(null);

    // Pulse animation for active dot
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        loadData();
        startPulse();
        return () => clearInterval(micIntervalRef.current);
    }, []);

    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.3, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [patientsRes, apptsRes] = await Promise.all([
                doctorAPI.getPatients().catch(() => ({ data: [] })),
                doctorAPI.getAppointments().catch(() => ({ data: [] })),
            ]);

            const pRaw = patientsRes.data?.all_patients
                || patientsRes.data?.patients
                || (Array.isArray(patientsRes.data) ? patientsRes.data : []);
            setAllPatients(pRaw);

            const appts = Array.isArray(apptsRes.data) ? apptsRes.data : [];
            const active = appts.filter(a =>
                (a.status === 'accepted' || a.status === 'scheduled') &&
                !(a.completion_time || a.completionTime)
            );

            const seen = new Set();
            const recent = active.reduce((acc, a) => {
                const id = a.patient_id || a.patient?.id;
                if (id && !seen.has(id)) {
                    seen.add(id);
                    acc.push({
                        id,
                        full_name: a.patient_name || a.patientName || a.patient?.full_name || 'Patient',
                        last_activity: 'Scheduled Appointment',
                        last_visit_date: a.requested_date || a.appointment_time || a.date,
                        appointment_id: a.id,
                        meet_link: a.meet_link || a.join_url || a.start_url || a.meetLink,
                        status: a.status,
                    });
                }
                return acc;
            }, []);

            setRecentPatients(recent);
        } catch (err) {
            console.error('LiveConsult load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredSearch = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();
        if (!q || selectedPatient) return [];
        return allPatients.filter(p =>
            (p.name || p.full_name || '').toLowerCase().includes(q) ||
            (p.mrn || '').toLowerCase().includes(q)
        ).slice(0, 6);
    }, [allPatients, searchTerm, selectedPatient]);

    // Mic visualizer
    const startMicVisualizer = () => {
        setIsMicActive(true);
        const animate = () => {
            micAnimValues.forEach(val => {
                Animated.timing(val, {
                    toValue: Math.random() * 52 + 6,
                    duration: 140,
                    useNativeDriver: false,
                }).start();
            });
        };
        animate();
        micIntervalRef.current = setInterval(animate, 160);
    };

    const stopMicVisualizer = () => {
        setIsMicActive(false);
        clearInterval(micIntervalRef.current);
        micAnimValues.forEach(val =>
            Animated.timing(val, { toValue: 4, duration: 250, useNativeDriver: false }).start()
        );
    };

    const toggleMic = () => isMicActive ? stopMicVisualizer() : startMicVisualizer();

    // Session handlers
    const handleStartConsultation = async () => {
        if (!selectedPatient) {
            Alert.alert('Select Patient', 'Please search and select a patient record first.');
            return;
        }
        setIsCreatingSession(true);
        try {
            const resp = await doctorAPI.createInstantAppointment(selectedPatient.id || selectedPatient.patient_id);
            const consultation = resp.data;
            if (consultation && (consultation.id || consultation.meet_link || consultation.meetLink)) {
                setActiveConsultation(consultation);
                Alert.alert('✅ Session Created', 'Consultation started. Tap "Join Google Meet" to enter.');
                loadData();
            } else {
                throw new Error('Invalid response from server.');
            }
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Failed to start session.';
            Alert.alert('Error', msg);
        } finally {
            setIsCreatingSession(false);
        }
    };

    const handleJoinMeet = async () => {
        const link = activeConsultation?.meetLink || activeConsultation?.meet_link
            || activeConsultation?.join_url || activeConsultation?.start_url;
        if (!link) {
            Alert.alert('No Meeting Link', 'The meeting link is not available yet.');
            return;
        }
        try { await WebBrowser.openBrowserAsync(link); } catch {
            Alert.alert('Error', 'Could not open meeting link.');
        }
    };

    const handleJoinSession = async (session) => {
        if (session.meet_link) {
            try { await WebBrowser.openBrowserAsync(session.meet_link); return; } catch { }
        }
        navigation.navigate('VideoCallScreen', {
            appointment: { id: session.appointment_id || session.consultation_id, ...session },
            role: 'doctor',
        });
    };

    const handleEndSession = (session) => {
        Alert.alert('End Session', `End session for ${session.full_name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'End Session', style: 'destructive',
                onPress: async () => {
                    try {
                        if (session.appointment_id) {
                            await doctorAPI.updateAppointmentStatus(session.appointment_id, 'completed', 'Session ended via app');
                        }
                        Alert.alert('✅ Done', 'Session ended successfully.');
                        loadData();
                    } catch {
                        Alert.alert('Error', 'Failed to end session.');
                    }
                },
            },
        ]);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={ACCENT} />

            {/* ── HERO HEADER ─────────────────────────────────────────────── */}
            <LinearGradient
                colors={[ACCENT, ACCENT2, '#A78BFA']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.hero}
            >
                <SafeAreaView edges={['top']}>
                    <View style={s.heroRow}>
                        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={22} color="white" />
                        </TouchableOpacity>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={s.heroTitle}>New Consultation</Text>
                            <Text style={s.heroSub}>Configure session & link patient record</Text>
                        </View>
                        <TouchableOpacity style={s.refreshBtn} onPress={loadData}>
                            <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.85)" />
                        </TouchableOpacity>
                    </View>

                    {/* Status pill */}
                    <View style={s.heroPill}>
                        <Animated.View style={[s.pillDot, { transform: [{ scale: pulseAnim }] }]} />
                        <Text style={s.pillText}>
                            {activeConsultation ? 'Session Active' : 'Ready to Start'}
                        </Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.scroll}
            >

                {/* ── PATIENT CONTEXT CARD ─────────────────────────────────── */}
                <View style={s.card}>
                    <View style={s.cardLabelRow}>
                        <View style={[s.iconPill, { backgroundColor: '#EEF2FF' }]}>
                            <Ionicons name="person" size={15} color={ACCENT} />
                        </View>
                        <Text style={s.cardLabel}>Patient Context</Text>
                    </View>

                    <Text style={s.fieldMeta}>LINK TO PATIENT RECORD</Text>

                    {/* Search */}
                    <View style={[s.searchBox, showDropdown && s.searchBoxFocused]}>
                        <Ionicons name="search" size={17} color={selectedPatient ? ACCENT : '#94A3B8'} style={{ marginRight: 8 }} />
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search patient name or MRN..."
                            placeholderTextColor="#B0B8CC"
                            value={selectedPatient ? (selectedPatient.name || selectedPatient.full_name) : searchTerm}
                            onChangeText={t => {
                                setSearchTerm(t);
                                setSelectedPatient(null);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                        />
                        {selectedPatient && (
                            <TouchableOpacity onPress={() => { setSelectedPatient(null); setSearchTerm(''); }}>
                                <Ionicons name="close-circle" size={19} color="#CBD5E1" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Dropdown */}
                    {showDropdown && !selectedPatient && filteredSearch.length > 0 && (
                        <View style={s.dropdown}>
                            {filteredSearch.map((p, i) => (
                                <TouchableOpacity
                                    key={p.id || i}
                                    style={[s.dropItem, i < filteredSearch.length - 1 && s.dropDivider]}
                                    onPress={() => {
                                        setSelectedPatient(p);
                                        setSearchTerm('');
                                        setShowDropdown(false);
                                    }}
                                >
                                    <LinearGradient
                                        colors={[ACCENT, ACCENT2]}
                                        style={s.dropAvatar}
                                    >
                                        <Text style={s.dropAvatarText}>{initials(p.name || p.full_name)}</Text>
                                    </LinearGradient>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.dropName}>{p.name || p.full_name}</Text>
                                        <Text style={s.dropMeta}>MRN: {p.mrn || 'N/A'}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    {showDropdown && !selectedPatient && searchTerm.length > 1 && filteredSearch.length === 0 && (
                        <View style={[s.dropdown, { padding: 16, alignItems: 'center' }]}>
                            <Ionicons name="search-outline" size={28} color="#CBD5E1" />
                            <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 6 }}>No results for "{searchTerm}"</Text>
                        </View>
                    )}

                    {/* Selected badge */}
                    {selectedPatient && (
                        <View style={s.selectedBadge}>
                            <LinearGradient colors={[ACCENT, ACCENT2]} style={s.selectedAvatar}>
                                <Text style={s.selectedAvatarText}>{initials(selectedPatient.name || selectedPatient.full_name)}</Text>
                            </LinearGradient>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={s.selectedName}>{selectedPatient.name || selectedPatient.full_name}</Text>
                                <Text style={s.selectedMrn}>MRN: {selectedPatient.mrn || 'N/A'} • Selected</Text>
                            </View>
                            <TouchableOpacity
                                style={s.selectedClear}
                                onPress={() => { setSelectedPatient(null); setSearchTerm(''); }}
                            >
                                <Ionicons name="close" size={14} color={ACCENT} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Language + Session Type */}
                    <View style={s.metaRow}>
                        <View style={s.metaBlock}>
                            <Text style={s.fieldMeta}>LANGUAGE</Text>
                            <View style={s.fakeField}>
                                <Ionicons name="globe-outline" size={14} color="#94A3B8" />
                                <Text style={s.fakeFieldText}>English</Text>
                            </View>
                        </View>
                        <View style={[s.metaBlock, { marginLeft: 10 }]}>
                            <Text style={s.fieldMeta}>SESSION TYPE</Text>
                            <View style={s.fakeField}>
                                <Ionicons name="medical-outline" size={14} color="#94A3B8" />
                                <Text style={s.fakeFieldText}>General Checkup</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── RECENT PATIENTS CARD ─────────────────────────────────── */}
                <View style={s.card}>
                    <View style={s.cardLabelRow}>
                        <View style={[s.iconPill, { backgroundColor: '#F0FDF4' }]}>
                            <Ionicons name="people" size={15} color={SUCCESS} />
                        </View>
                        <Text style={s.cardLabel}>Recent Patients</Text>
                        <View style={s.countBadge}>
                            <Text style={s.countBadgeText}>{recentPatients.length}</Text>
                        </View>
                    </View>

                    {loading ? (
                        <View style={s.emptyBox}>
                            <ActivityIndicator color={ACCENT} />
                            <Text style={s.emptyText}>Loading sessions...</Text>
                        </View>
                    ) : recentPatients.length === 0 ? (
                        <View style={s.emptyBox}>
                            <View style={s.emptyIconBox}>
                                <Ionicons name="calendar-outline" size={32} color="#C7D2FE" />
                            </View>
                            <Text style={s.emptyTitle}>No active sessions</Text>
                            <Text style={s.emptyText}>Start a new consultation above</Text>
                        </View>
                    ) : (
                        <>
                            {/* Table Header */}
                            <View style={s.tHead}>
                                <Text style={[s.tHCell, { flex: 1.5 }]}>PATIENT</Text>
                                <Text style={[s.tHCell, { flex: 1 }]}>ACTIVITY</Text>
                                <Text style={[s.tHCell, { flex: 0.9 }]}>DATE</Text>
                                <Text style={[s.tHCell, { flex: 1, textAlign: 'right' }]}>ACTIONS</Text>
                            </View>

                            {recentPatients.map((p, i) => (
                                <TouchableOpacity
                                    key={p.id || i}
                                    style={[s.tRow, selectedPatient?.id === p.id && s.tRowActive]}
                                    onPress={() => setSelectedPatient({ ...p, name: p.full_name })}
                                    activeOpacity={0.7}
                                >
                                    {/* Avatar + name */}
                                    <View style={[{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                                        <LinearGradient
                                            colors={[ACCENT, ACCENT2]}
                                            style={s.tAvatar}
                                        >
                                            <Text style={s.tAvatarText}>{initials(p.full_name)}</Text>
                                        </LinearGradient>
                                        <Text style={s.tName} numberOfLines={1}>{p.full_name}</Text>
                                    </View>

                                    {/* Activity */}
                                    <View style={{ flex: 1 }}>
                                        <View style={s.activityChip}>
                                            <Text style={s.activityChipText} numberOfLines={1}>
                                                {p.last_activity === 'Scheduled Appointment' ? 'Scheduled' : p.last_activity}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Date */}
                                    <Text style={[s.tDate, { flex: 0.9 }]} numberOfLines={2}>
                                        {fmtDate(p.last_visit_date)}
                                    </Text>

                                    {/* Buttons */}
                                    <View style={[{ flex: 1, gap: 5, alignItems: 'flex-end' }]}>
                                        <TouchableOpacity
                                            style={s.joinBtn}
                                            onPress={() => handleJoinSession(p)}
                                        >
                                            <LinearGradient
                                                colors={[ACCENT, ACCENT2]}
                                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                                style={s.joinBtnGrad}
                                            >
                                                <Ionicons name="videocam" size={10} color="white" />
                                                <Text style={s.joinBtnText}>Join</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={s.endBtn} onPress={() => handleEndSession(p)}>
                                            <Text style={s.endBtnText}>End</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </>
                    )}
                </View>

                {/* ── AUDIO CARD ──────────────────────────────────────────────── */}
                <View style={s.card}>
                    <View style={s.cardLabelRow}>
                        <View style={[s.iconPill, { backgroundColor: '#FFF7ED' }]}>
                            <Ionicons name="mic" size={15} color="#F97316" />
                        </View>
                        <Text style={s.cardLabel}>Audio Configuration</Text>
                    </View>

                    <Text style={s.fieldMeta}>INPUT SOURCE</Text>
                    <TouchableOpacity
                        style={[s.micRow, isMicActive && s.micRowActive]}
                        onPress={toggleMic}
                        activeOpacity={0.8}
                    >
                        <View style={[s.micCircle, isMicActive && s.micCircleActive]}>
                            <Ionicons name="mic" size={16} color={isMicActive ? 'white' : '#94A3B8'} />
                        </View>
                        <Text style={[s.micLabel, isMicActive && { color: DANGER }]}>
                            System Default Microphone
                        </Text>
                        <View style={[s.liveChip, isMicActive && s.liveChipActive]}>
                            <View style={[s.chipDot, { backgroundColor: isMicActive ? DANGER : '#CBD5E1' }]} />
                            <Text style={[s.chipText, isMicActive && { color: DANGER }]}>
                                {isMicActive ? 'LIVE' : 'TEST'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Visualizer */}
                    <View style={s.viz}>
                        {micAnimValues.map((val, i) => (
                            <Animated.View
                                key={i}
                                style={[
                                    s.vizBar,
                                    {
                                        height: val,
                                        backgroundColor: isMicActive
                                            ? i % 3 === 0 ? ACCENT : i % 3 === 1 ? ACCENT2 : '#A78BFA'
                                            : '#E2E8F0',
                                        opacity: isMicActive ? 0.85 + 0.15 * (i % 3) : 1,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Start Consultation */}
                    <TouchableOpacity
                        onPress={handleStartConsultation}
                        disabled={!selectedPatient || isCreatingSession || !!activeConsultation}
                        activeOpacity={0.85}
                        style={{ marginBottom: 12, borderRadius: 16, overflow: 'hidden' }}
                    >
                        <LinearGradient
                            colors={
                                (!selectedPatient || isCreatingSession || !!activeConsultation)
                                    ? ['#CBD5E1', '#CBD5E1']
                                    : [ACCENT, ACCENT2, '#A78BFA']
                            }
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={s.primaryBtn}
                        >
                            {isCreatingSession ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Ionicons name="mic" size={18} color="white" />
                            )}
                            <Text style={s.primaryBtnText}>
                                {isCreatingSession
                                    ? 'INITIALIZING...'
                                    : activeConsultation
                                        ? '✓ Session Created'
                                        : 'Start Consultation'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Join Google Meet */}
                    <TouchableOpacity
                        onPress={handleJoinMeet}
                        disabled={!activeConsultation}
                        activeOpacity={0.85}
                        style={{ borderRadius: 16, overflow: 'hidden' }}
                    >
                        <LinearGradient
                            colors={activeConsultation ? ['#1D4ED8', '#2563EB'] : ['#F1F5F9', '#F1F5F9']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={s.primaryBtn}
                        >
                            <Ionicons name="videocam" size={18} color={activeConsultation ? 'white' : '#94A3B8'} />
                            <Text style={[s.primaryBtnText, !activeConsultation && { color: '#94A3B8' }]}>
                                Join Google Meet
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* ── TIP BOX ─────────────────────────────────────────────────── */}
                <View style={s.tipBox}>
                    <LinearGradient
                        colors={['#EEF2FF', '#F5F3FF']}
                        style={s.tipGrad}
                    >
                        <Ionicons name="bulb" size={18} color={ACCENT} style={{ marginTop: 1 }} />
                        <Text style={s.tipText}>
                            <Text style={{ fontWeight: '800', color: ACCENT }}>Pro tip: </Text>
                            Select a patient from the search or from the Recent Patients list. Verify your microphone before starting.
                        </Text>
                    </LinearGradient>
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: PAGE_BG },

    // Hero
    hero: { paddingHorizontal: 20, paddingBottom: 20 },
    heroRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    backBtn: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    heroTitle: { fontSize: 20, fontWeight: '900', color: 'white', letterSpacing: -0.3 },
    heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
    refreshBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    heroPill: {
        flexDirection: 'row', alignItems: 'center', gap: 7,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, marginTop: 14,
    },
    pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6EE7B7' },
    pillText: { color: 'white', fontSize: 12, fontWeight: '700' },

    scroll: { paddingHorizontal: 16, paddingTop: 18 },

    // Card
    card: {
        backgroundColor: CARD_BG,
        borderRadius: 22,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#6366F1',
        shadowOpacity: 0.07,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
    },
    cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    cardLabel: { fontSize: 15, fontWeight: '800', color: '#0F172A', flex: 1 },
    iconPill: {
        width: 32, height: 32, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center',
    },
    countBadge: {
        backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    countBadgeText: { fontSize: 12, fontWeight: '800', color: ACCENT },

    fieldMeta: {
        fontSize: 10, fontWeight: '800', color: '#94A3B8',
        letterSpacing: 1, marginBottom: 8,
    },

    // Search
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
        paddingHorizontal: 14, height: 50,
        backgroundColor: '#F8FAFC',
    },
    searchBoxFocused: { borderColor: ACCENT, backgroundColor: '#FAFBFF' },
    searchInput: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '500' },

    // Dropdown
    dropdown: {
        backgroundColor: 'white', borderRadius: 16, marginTop: 8,
        borderWidth: 1, borderColor: '#EEF2FF',
        shadowColor: '#6366F1', shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
        overflow: 'hidden',
    },
    dropItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 13, gap: 12,
    },
    dropDivider: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    dropAvatar: {
        width: 36, height: 36, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    dropAvatarText: { color: 'white', fontWeight: '800', fontSize: 14 },
    dropName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
    dropMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

    // Selected badge
    selectedBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F0EEFF', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#C4B5FD',
        padding: 12, marginTop: 10,
    },
    selectedAvatar: {
        width: 38, height: 38, borderRadius: 11,
        justifyContent: 'center', alignItems: 'center',
    },
    selectedAvatarText: { color: 'white', fontWeight: '800', fontSize: 14 },
    selectedName: { fontSize: 14, fontWeight: '800', color: '#4C1D95' },
    selectedMrn: { fontSize: 11, color: '#7C3AED', marginTop: 2 },
    selectedClear: {
        width: 26, height: 26, borderRadius: 8,
        backgroundColor: '#DDD6FE',
        justifyContent: 'center', alignItems: 'center',
    },

    // Meta row
    metaRow: { flexDirection: 'row', marginTop: 14 },
    metaBlock: { flex: 1 },
    fakeField: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#F8FAFC',
    },
    fakeFieldText: { fontSize: 13, color: '#475569', fontWeight: '600' },

    // Table
    tHead: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC', borderRadius: 12,
        paddingVertical: 9, paddingHorizontal: 12, marginBottom: 4,
    },
    tHCell: {
        fontSize: 9, fontWeight: '800', color: '#94A3B8',
        letterSpacing: 0.8, textTransform: 'uppercase',
    },
    tRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 12,
        borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
        borderRadius: 10,
    },
    tRowActive: { backgroundColor: '#F0EEFF' },
    tAvatar: {
        width: 30, height: 30, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center',
    },
    tAvatarText: { color: 'white', fontWeight: '800', fontSize: 12 },
    tName: { fontSize: 12, fontWeight: '700', color: '#1E293B', flex: 1 },
    tDate: { fontSize: 10, color: '#64748B', lineHeight: 14 },
    activityChip: {
        backgroundColor: '#F0FDF4', paddingHorizontal: 6,
        paddingVertical: 3, borderRadius: 6,
    },
    activityChipText: { fontSize: 9, color: SUCCESS, fontWeight: '800' },

    joinBtn: { borderRadius: 8, overflow: 'hidden' },
    joinBtnGrad: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 9, paddingVertical: 5,
    },
    joinBtnText: { color: 'white', fontSize: 10, fontWeight: '800' },
    endBtn: {
        paddingHorizontal: 9, paddingVertical: 5,
        backgroundColor: '#FEF2F2', borderRadius: 8,
        borderWidth: 1, borderColor: '#FECACA',
    },
    endBtnText: { color: DANGER, fontSize: 10, fontWeight: '800' },

    // Empty
    emptyBox: { alignItems: 'center', paddingVertical: 30 },
    emptyIconBox: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginBottom: 4 },
    emptyText: { fontSize: 12, color: '#94A3B8', marginTop: 4 },

    // Mic
    micRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
        padding: 14, backgroundColor: '#F8FAFC',
    },
    micRowActive: { borderColor: DANGER, backgroundColor: '#FFF5F5' },
    micCircle: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
    },
    micCircleActive: { backgroundColor: DANGER },
    micLabel: { flex: 1, fontSize: 13, color: '#475569', fontWeight: '600' },
    liveChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 9, paddingVertical: 4,
        backgroundColor: '#F1F5F9', borderRadius: 8,
    },
    liveChipActive: { backgroundColor: '#FEF2F2' },
    chipDot: { width: 6, height: 6, borderRadius: 3 },
    chipText: { fontSize: 10, fontWeight: '800', color: '#94A3B8' },

    viz: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F8FAFC', borderRadius: 16,
        height: 80, marginVertical: 14, gap: 3, paddingHorizontal: 10,
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    vizBar: { width: 4, borderRadius: 3, minHeight: 4 },

    // Buttons
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        paddingVertical: 16, borderRadius: 16,
    },
    primaryBtnText: { color: 'white', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },

    // Tip
    tipBox: { marginBottom: 4, borderRadius: 16, overflow: 'hidden' },
    tipGrad: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        padding: 16,
        borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 16,
    },
    tipText: { flex: 1, fontSize: 12.5, color: '#4338CA', lineHeight: 19 },
});
