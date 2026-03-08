import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
    ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { aiChatAPI, doctorAPI, permissionsAPI, getUserData } from '../../services/api';
import EventSource from 'react-native-sse';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DoctorAIChatScreen({ navigation, route, patientId: propPatientId, embedded: propEmbedded }) {
    const { patientId: routePatientId, embedded: routeEmbedded } = route?.params || {};
    const initialPatientId = propPatientId || routePatientId;
    const embedded = propEmbedded || routeEmbedded;

    const [chatMode, setChatMode] = useState(initialPatientId ? 'patient' : 'general');
    const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId || '');
    const [patients, setPatients] = useState([]);

    const [sessions, setSessions] = useState([]);
    const [messages, setMessages] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);

    const [customTitles, setCustomTitles] = useState({});
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editTitleText, setEditTitleText] = useState('');

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showPatientPicker, setShowPatientPicker] = useState(false);
    const [showDocumentPicker, setShowDocumentPicker] = useState(false);
    const [patientDocuments, setPatientDocuments] = useState([]);
    const [selectedDocumentId, setSelectedDocumentId] = useState(null);
    const [selectedDocumentName, setSelectedDocumentName] = useState('All Records');
    const [doctorId, setDoctorId] = useState(null);

    const [hasAIAccess, setHasAIAccess] = useState(null);
    const [grantingAccess, setGrantingAccess] = useState(false);

    const scrollViewRef = useRef(null);
    const eventSourceRef = useRef(null);
    const skipHistoryLoad = useRef(false);

    useEffect(() => {
        loadPatients();
        getUserData().then(data => {
            if (data && (data.id || data.doctor_profile?.id)) {
                setDoctorId(data.id || data.doctor_profile?.id);
            }
        });
        return () => {
            if (eventSourceRef.current) eventSourceRef.current.close();
        };
    }, []);

    useEffect(() => {
        if (chatMode === 'patient' && selectedPatientId) {
            checkAndLoadPatientChat();
            loadPatientDocuments(selectedPatientId);
        } else if (chatMode === 'general' && doctorId) {
            setHasAIAccess(true);
            setSessions([]);
            setCurrentSessionId(null);
            loadGeneralChatHistory();
        }
    }, [chatMode, selectedPatientId, doctorId]);

    useEffect(() => {
        if (chatMode === 'patient' && selectedPatientId && hasAIAccess) {
            loadSessions();
        }
    }, [selectedPatientId, hasAIAccess]);

    useEffect(() => {
        if (currentSessionId && chatMode === 'patient') {
            if (skipHistoryLoad.current) {
                skipHistoryLoad.current = false;
                return;
            }
            loadSessionHistory(currentSessionId);
        } else if (!currentSessionId && chatMode === 'patient') {
            setMessages([]);
        }
    }, [currentSessionId]);

    const loadPatients = async () => {
        try {
            const response = await doctorAPI.getPatients();
            const patientsData = response.data?.all_patients
                || response.data?.patients
                || (Array.isArray(response.data) ? response.data : [])
                || [];
            setPatients(patientsData);
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    };

    const loadPatientDocuments = async (patientId) => {
        try {
            const res = await doctorAPI.getDocuments(patientId);
            const docs = res.data?.documents || [];
            setPatientDocuments(docs);
            setSelectedDocumentId(null);
            setSelectedDocumentName('All Records');
        } catch (e) {
            console.error('Error loading docs:', e);
            setPatientDocuments([]);
        }
    };

    const checkAndLoadPatientChat = async () => {
        setHasAIAccess(null);
        try {
            const res = await permissionsAPI.checkAccess(selectedPatientId);
            const access = res.data?.has_permission || res.data?.ai_access_permission || false;
            setHasAIAccess(access);
        } catch (err) {
            setHasAIAccess(false);
        }
    };

    const handleGrantAccess = async () => {
        setGrantingAccess(true);
        try {
            await permissionsAPI.requestAccess({
                patient_id: selectedPatientId,
                reason: "AI Chart Review and Analysis",
                expiry_days: 90
            });
            Alert.alert('Request Sent', 'A request has been sent. The patient must log in to grant access.');
        } catch (error) {
            Alert.alert('Permission Error', 'Could not request patient AI access.');
            console.error(error);
        } finally {
            setGrantingAccess(false);
        }
    };

    // Load available historical sessions for this patient
    const loadSessions = async () => {
        try {
            const [res, customTitlesRaw] = await Promise.all([
                aiChatAPI.getSessions(selectedPatientId),
                AsyncStorage.getItem('@chat_titles')
            ]);
            if (customTitlesRaw) {
                setCustomTitles(JSON.parse(customTitlesRaw));
            }

            if (Array.isArray(res.data)) {
                setSessions(res.data);
                if (res.data.length > 0 && !currentSessionId) {
                    setCurrentSessionId(res.data[0].session_id);
                }
            } else {
                setSessions([]);
            }
        } catch (e) {
            console.error('getSessions error:', e);
        }
    };

    const handleSaveTitle = async (sessionId) => {
        const text = editTitleText.trim();
        if (!text) return setEditingSessionId(null);

        try {
            const newTitles = { ...customTitles, [sessionId]: text };
            setCustomTitles(newTitles);
            await AsyncStorage.setItem('@chat_titles', JSON.stringify(newTitles));

            // Also update the local state sessions array to immediately reflect
            setSessions(prev => prev.map(s => s.session_id === sessionId ? { ...s, title: text } : s));
            setEditingSessionId(null);
        } catch (e) {
            console.error('Save custom title failed:', e);
        }
    };

    const loadSessionHistory = async (sessionId) => {
        setLoadingHistory(true);
        try {
            const res = await aiChatAPI.getSessionHistory(sessionId);
            const msgs = res.data?.messages || [];
            // Messages typically come in chronological order, we just need them
            setMessages(msgs);
        } catch (error) {
            console.error('Error loading session messages:', error);
            setMessages([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const loadGeneralChatHistory = async () => {
        setLoadingHistory(true);
        try {
            const response = await aiChatAPI.getDoctorChatHistory(null, doctorId);
            const historyArray = response?.data?.history || response?.data?.messages || [];
            // Older API might return backward, sort chronologically if it has created_at
            historyArray.sort((a, b) => new Date(a.created_at || a.timestamp) - new Date(b.created_at || b.timestamp));
            setMessages(historyArray);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSendMessage = async () => {
        const text = inputMessage.trim();
        if (!text) return;

        if (chatMode === 'patient' && !selectedPatientId) {
            Alert.alert('Patient Required', 'Please select a patient first');
            return;
        }

        setInputMessage('');
        setLoading(true);

        const tempID = Date.now().toString();
        const newMessage = { id: tempID, role: 'user', content: text, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, newMessage]);

        try {
            if (chatMode === 'patient') {
                let sessionId = currentSessionId;

                // 1. Create a session if it doesn't exist
                if (!sessionId) {
                    const newSess = await aiChatAPI.createSession(selectedPatientId, text.substring(0, 30));
                    sessionId = newSess.data.session_id;
                    skipHistoryLoad.current = true;
                    setCurrentSessionId(sessionId);
                    setSessions(prev => [newSess.data, ...prev]);
                }

                // 2. Setup Manual Stream Reading (Backend yields raw tokens, not strict SSE data)
                const streamConfig = await aiChatAPI.getChatStreamConfig();

                // Append an empty AI message to be streamed into
                const aiTempID = (Date.now() + 1).toString();
                setMessages(prev => [...prev, { id: aiTempID, role: 'assistant', content: '', created_at: new Date().toISOString() }]);

                let fullResponse = '';
                const xhr = new XMLHttpRequest();
                xhr.open('POST', streamConfig.url);

                // Set headers (Authorization, etc.)
                Object.keys(streamConfig.headers).forEach(key => {
                    xhr.setRequestHeader(key, streamConfig.headers[key]);
                });

                xhr.onreadystatechange = () => {
                    // readyState 3 is LOADING (partial response received)
                    // readyState 4 is DONE
                    if (xhr.readyState === 3 || xhr.readyState === 4) {
                        const chunk = xhr.responseText || '';

                        // Filter out the internal __META__ markers (if present in this chunk)
                        let cleanText = chunk;
                        if (chunk.includes('\n__META__:')) {
                            cleanText = chunk.split('\n__META__:')[0];
                        }

                        fullResponse = cleanText.replace(/\\n/g, '\n');

                        setMessages(prev => {
                            if (prev.length === 0) return prev;
                            const copy = [...prev];
                            const lastMsg = copy[copy.length - 1];
                            if (lastMsg && lastMsg.role === 'assistant') {
                                // Optimized: only update if changed
                                if (lastMsg.content !== fullResponse) {
                                    copy[copy.length - 1] = { ...lastMsg, content: fullResponse };
                                    return copy;
                                }
                            }
                            return prev;
                        });
                    }

                    if (xhr.readyState === 4) {
                        setLoading(false);
                    }
                };

                xhr.onerror = (e) => {
                    console.error('XHR Stream Error:', e);
                    setLoading(false);
                    Alert.alert('Connection Error', 'The persistent stream was interrupted. Please try again.');
                };

                xhr.send(JSON.stringify({
                    session_id: sessionId,
                    patient_id: selectedPatientId,
                    message: text,
                    document_id: selectedDocumentId
                }));

            } else {
                // General Chat Fallback (Wait, existing logic)
                const response = await aiChatAPI.chatWithAI(text, 'general', doctorId);
                const aiResponseText = response.data?.response || response.data?.message || 'I apologize, but I could not process your request.';
                const aiMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: aiResponseText,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiMessage]);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', 'Failed to send message.');
            setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
            setLoading(false);
        }
    };

    const getSelectedPatientName = () => {
        if (!selectedPatientId) return 'Select Patient...';
        const patient = patients.find(p => p.id === selectedPatientId);
        return patient?.full_name || patient?.name || 'Patient';
    };

    const getSelectedDocumentDisplayName = () => {
        return selectedDocumentName;
    };

    const renderMessage = (message, index) => {
        const isUser = message.role === 'user' || message.role === 'doctor';
        return (
            <View key={message.id || index} style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
                <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
                    {!isUser && (
                        <View style={styles.aiHeader}>
                            <Ionicons name="sparkles" size={16} color="#9C27B0" />
                            <Text style={styles.aiLabel}>Sara AI</Text>
                            {message.confidence && (
                                <View style={styles.confidenceBadge}>
                                    <Text style={styles.confidenceText}>{message.confidence}</Text>
                                </View>
                            )}
                        </View>
                    )}
                    {isUser ? (
                        <Text style={styles.userMessageText}>{message.content}</Text>
                    ) : (
                        <Markdown style={markdownStyles}>
                            {message.content}
                        </Markdown>
                    )}
                    <Text style={[styles.timestamp, { textAlign: isUser ? 'right' : 'left' }]}>
                        {new Date(message.created_at || message.timestamp || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    const Container = embedded ? View : SafeAreaView;

    return (
        <Container style={styles.container}>
            {!embedded && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>AI Assistant</Text>
                        <Text style={styles.headerSubtitle}>{chatMode === 'patient' ? getSelectedPatientName() : 'General Consultation'}</Text>
                    </View>
                    {chatMode === 'patient' && (
                        <TouchableOpacity style={styles.menuButton} onPress={() => setShowHistoryModal(true)}>
                            <Ionicons name="time-outline" size={24} color="#333" />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {chatMode === 'patient' && (
                <View style={styles.contextBar}>
                    <TouchableOpacity style={styles.contextItem} onPress={() => { setShowPatientPicker(!showPatientPicker); setShowDocumentPicker(false); }}>
                        <Ionicons name="person" size={16} color={COLORS.primary} />
                        <Text style={styles.contextText} numberOfLines={1}>{getSelectedPatientName()}</Text>
                        <Ionicons name="chevron-down" size={16} color="#999" />
                    </TouchableOpacity>

                    <View style={styles.contextDivider} />

                    <TouchableOpacity
                        style={[styles.contextItem, !selectedPatientId && { opacity: 0.5 }]}
                        onPress={() => { if (selectedPatientId) setShowDocumentPicker(!showDocumentPicker); setShowPatientPicker(false); }}
                        disabled={!selectedPatientId}
                    >
                        <Ionicons name="filter" size={16} color="#FF9800" />
                        <Text style={styles.contextText} numberOfLines={1}>{getSelectedDocumentDisplayName()}</Text>
                        <Ionicons name="chevron-down" size={16} color="#999" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Dropdown Modals (inline) */}
            {showPatientPicker && (
                <View style={styles.dropdownPicker}>
                    <View style={styles.dropdownHeader}>
                        <Text style={styles.dropdownTitle}>Select Patient</Text>
                    </View>
                    <ScrollView style={styles.dropdownList} keyboardShouldPersistTaps="handled">
                        {patients.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.dropdownItem, selectedPatientId === p.id && styles.dropdownItemActive]}
                                onPress={() => { setSelectedPatientId(p.id); setShowPatientPicker(false); }}
                            >
                                <Text style={[styles.dropdownItemText, selectedPatientId === p.id && styles.dropdownItemTextActive]}>
                                    {p.full_name || p.name}
                                </Text>
                                {p.mrn && <Text style={styles.dropdownItemSub}>MRN: {p.mrn}</Text>}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {showDocumentPicker && (
                <View style={styles.dropdownPicker}>
                    <View style={styles.dropdownHeader}>
                        <Text style={styles.dropdownTitle}>Focus on Document</Text>
                    </View>
                    <ScrollView style={styles.dropdownList} keyboardShouldPersistTaps="handled">
                        <TouchableOpacity
                            style={[styles.dropdownItem, !selectedDocumentId && styles.dropdownItemActive]}
                            onPress={() => { setSelectedDocumentId(null); setShowDocumentPicker(false); }}
                        >
                            <Text style={[styles.dropdownItemText, !selectedDocumentId && styles.dropdownItemTextActive]}>All Records (Full History)</Text>
                        </TouchableOpacity>
                        {patientDocuments.map((d) => (
                            <TouchableOpacity
                                key={d.id}
                                style={[styles.dropdownItem, selectedDocumentId === d.id && styles.dropdownItemActive]}
                                onPress={() => { setSelectedDocumentId(d.id); setSelectedDocumentName(d.title || d.fileName); setShowDocumentPicker(false); }}
                            >
                                <Text style={[styles.dropdownItemText, selectedDocumentId === d.id && styles.dropdownItemTextActive]}>
                                    {d.title || d.fileName}
                                </Text>
                                <Text style={styles.dropdownItemSub}>{d.category || 'Clinical'} • {new Date(d.uploadedAt).toLocaleDateString()}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {hasAIAccess === false ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.lockedIconWrapper}>
                            <Ionicons name="lock-closed" size={30} color="#d32f2f" />
                        </View>
                        <Text style={styles.emptyTextLocked}>No AI Access</Text>
                        <Text style={styles.emptySubtextLocked}>Patient has not granted permission.</Text>
                        <TouchableOpacity style={styles.grantBtn} onPress={handleGrantAccess} disabled={grantingAccess}>
                            <Text style={styles.grantBtnText}>{grantingAccess ? 'Sent...' : 'Request AI Access'}</Text>
                        </TouchableOpacity>
                    </View>
                ) : loadingHistory || hasAIAccess === null ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                ) : messages.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons name="sparkles" size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.emptyText}>Focus Sara's Intel</Text>
                        <Text style={styles.emptySubtext}>Select a patient or document to begin a focused medical analysis.</Text>

                        {sessions.length > 0 && (
                            <View style={styles.recentHistoryStrip}>
                                <Text style={styles.recentHistoryTitle}>RECENT CONVERSATIONS</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentHistoryScroll}>
                                    {sessions.slice(0, 5).map(s => (
                                        <TouchableOpacity key={s.session_id || s.id} style={styles.recentHistoryItem} onPress={() => setCurrentSessionId(s.session_id)}>
                                            <Ionicons name="chatbubble-outline" size={14} color="#666" />
                                            <Text style={styles.recentHistoryItemText} numberOfLines={1}>
                                                {customTitles[s.session_id] || s.title || 'Conversation'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                ) : (
                    <ScrollView ref={scrollViewRef} style={styles.messagesScroll} contentContainerStyle={styles.messagesContent} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
                        {messages.map((message, index) => renderMessage(message, index))}
                        {loading && (
                            <View style={styles.typingIndicator}>
                                <ActivityIndicator size="small" color="#9C27B0" />
                                <Text style={{ marginLeft: 8, color: '#9C27B0', fontSize: 13 }}>Sara is thinking...</Text>
                            </View>
                        )}
                    </ScrollView>
                )}

                <View style={styles.hipaaNotice}>
                    <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
                    <Text style={styles.hipaaText}>HIPAA Compliant • End-to-end encrypted</Text>
                </View>

                {hasAIAccess !== false && (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type your question..."
                            placeholderTextColor="#999"
                            value={inputMessage}
                            onChangeText={setInputMessage}
                            multiline
                            maxLength={1000}
                            editable={!loading}
                        />
                        <TouchableOpacity style={[styles.sendButton, (!inputMessage.trim() || loading) && styles.sendButtonDisabled]} onPress={handleSendMessage} disabled={!inputMessage.trim() || loading}>
                            <Ionicons name="send" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>

            <Modal visible={showHistoryModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistoryModal(false)}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Chat History</Text>
                        <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.newChatButton} onPress={() => { setCurrentSessionId(null); setShowHistoryModal(false); }}>
                        <Ionicons name="add" size={20} color="#FFF" />
                        <Text style={styles.newChatText}>New Conversation</Text>
                    </TouchableOpacity>

                    <ScrollView style={styles.historyList}>
                        {sessions.length === 0 ? (
                            <Text style={{ textAlign: 'center', marginTop: 40, color: '#999' }}>No past sessions found.</Text>
                        ) : sessions.map(session => (
                            <View key={session.session_id} style={[styles.historyItem, currentSessionId === session.session_id && styles.historyItemActive]}>
                                <Ionicons name="chatbubble-outline" size={20} color={currentSessionId === session.session_id ? COLORS.primary : "#666"} />

                                {editingSessionId === session.session_id ? (
                                    <View style={[styles.historyItemContent, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                                        <TextInput
                                            style={styles.editTitleInput}
                                            value={editTitleText}
                                            onChangeText={setEditTitleText}
                                            autoFocus
                                            selectTextOnFocus
                                        />
                                        <TouchableOpacity onPress={() => handleSaveTitle(session.session_id)} style={styles.saveTitleBtn}>
                                            <Ionicons name="checkmark" size={20} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.historyItemContentRow}>
                                        <TouchableOpacity style={styles.historyItemContent} onPress={() => { setCurrentSessionId(session.session_id); setShowHistoryModal(false); }}>
                                            <Text style={[styles.historyItemTitle, currentSessionId === session.session_id && styles.historyItemTitleActive]}>
                                                {customTitles[session.session_id] || session.title || 'Untitled Session'}
                                            </Text>
                                            <Text style={styles.historyItemTime}>
                                                {new Date(session.updated_at || session.created_at).toLocaleDateString()}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.editIconBtn}
                                            onPress={() => {
                                                setEditTitleText(customTitles[session.session_id] || session.title || 'Untitled Session');
                                                setEditingSessionId(session.session_id);
                                            }}
                                        >
                                            <Ionicons name="pencil" size={16} color="#999" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </Container>
    );
}

const markdownStyles = StyleSheet.create({
    body: { color: '#4A148C', fontSize: 15, lineHeight: 22 },
    strong: { fontWeight: 'bold' },
    bullet_list: { marginTop: 4, marginBottom: 4 },
    list_item: { marginBottom: 4 }
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backButton: { padding: 4 },
    headerCenter: { flex: 1, marginLeft: 12 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 1, fontWeight: '500' },
    menuButton: { padding: 8 },

    contextBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 10
    },
    contextItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFC',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6'
    },
    contextText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#374151' },
    contextDivider: { width: 4 },

    dropdownPicker: {
        position: 'absolute',
        top: 110,
        left: 12,
        right: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        maxHeight: 300,
        zIndex: 1000,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    dropdownHeader: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    dropdownTitle: { fontSize: 12, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase' },
    dropdownList: { maxHeight: 250 },
    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    dropdownItemActive: { backgroundColor: '#F0F9FF' },
    dropdownItemText: { fontSize: 14, color: '#374151' },
    dropdownItemTextActive: { color: COLORS.primary, fontWeight: '600' },
    dropdownItemSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    chatContainer: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyText: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
    emptySubtext: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 30 },

    recentHistoryStrip: { width: '100%', marginTop: 20 },
    recentHistoryTitle: { fontSize: 10, fontWeight: 'bold', color: '#9CA3AF', letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
    recentHistoryScroll: { paddingHorizontal: 4 },
    recentHistoryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#F3F4F6', gap: 6 },
    recentHistoryItemText: { fontSize: 12, fontWeight: '500', color: '#4B5563', maxWidth: 120 },

    // Locked Access
    lockedIconWrapper: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(244,67,54,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTextLocked: { color: '#d32f2f', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
    emptySubtextLocked: { color: '#666', marginBottom: 24, textAlign: 'center' },
    grantBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    grantBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

    messagesScroll: { flex: 1 },
    messagesContent: { padding: 16, paddingBottom: 24 },
    messageContainer: { marginBottom: 16 },
    userMessageContainer: { alignItems: 'flex-end' },
    aiMessageContainer: { alignItems: 'flex-start' },
    messageBubble: { maxWidth: '85%', borderRadius: 18, padding: 14, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5 },
    userBubble: { backgroundColor: '#EFF6FF', borderBottomRightRadius: 4 },
    aiBubble: { backgroundColor: '#FDF4FF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#FAE8FF' },
    aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
    aiLabel: { fontSize: 12, fontWeight: '700', color: '#9C27B0' },
    confidenceBadge: { backgroundColor: '#E1BEE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
    confidenceText: { fontSize: 10, color: '#6A1B9A', fontWeight: 'bold', textTransform: 'uppercase' },
    userMessageText: { color: '#1565C0', fontSize: 15, lineHeight: 20 },
    timestamp: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
    typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },

    hipaaNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, backgroundColor: '#F0F9FF', gap: 6 },
    hipaaText: { fontSize: 11, color: '#2E7D32', fontWeight: '500' },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 8 },
    input: { flex: 1, maxHeight: 100, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F3F4F6', borderRadius: 20, fontSize: 15, color: '#333' },
    sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    sendButtonDisabled: { backgroundColor: '#D1D5DB' },

    modalContainer: { flex: 1, backgroundColor: '#F9FAFC' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    newChatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', margin: 16, padding: 12, borderRadius: 8, gap: 8 },
    newChatText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    historyList: { flex: 1 },
    historyItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
    historyItemActive: { backgroundColor: '#F0F9FF' },
    historyItemContentRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    historyItemContent: { flex: 1 },
    historyItemTitle: { fontSize: 15, fontWeight: '500', color: '#333', marginBottom: 4 },
    historyItemTitleActive: { color: COLORS.primary, fontWeight: '600' },
    historyItemTime: { fontSize: 12, color: '#999' },
    editTitleInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 15, color: '#333', borderWidth: 1, borderColor: '#E5E7EB' },
    saveTitleBtn: { backgroundColor: COLORS.primary, padding: 6, borderRadius: 6 },
    editIconBtn: { padding: 8 }
});
