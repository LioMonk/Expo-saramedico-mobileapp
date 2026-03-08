import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Modal,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../services/config';

export default function HospitalMessagesScreen({ navigation }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCompose, setShowCompose] = useState(false);
    const [newMessage, setNewMessage] = useState({ recipient: '', subject: '', body: '' });

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.get(`${API_CONFIG.BASE_URL}/messages`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMessages(response.data.messages || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.recipient || !newMessage.subject || !newMessage.body) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('userToken');
            await axios.post(`${API_CONFIG.BASE_URL}/messages`, newMessage, {
                headers: { Authorization: `Bearer ${token}` },
            });
            Alert.alert('Success', 'Message sent successfully');
            setShowCompose(false);
            setNewMessage({ recipient: '', subject: '', body: '' });
            fetchMessages();
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', 'Failed to send message');
        }
    };

    const MessageCard = ({ message }) => (
        <TouchableOpacity style={[styles.messageCard, !message.read && styles.unreadMessage]}>
            <View style={styles.messageHeader}>
                <View style={styles.senderInfo}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {message.sender_name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <View style={styles.messageDetails}>
                        <Text style={styles.senderName}>{message.sender_name || 'Unknown'}</Text>
                        <Text style={styles.messageTime}>
                            {message.created_at ? new Date(message.created_at).toLocaleString() : 'Just now'}
                        </Text>
                    </View>
                </View>
                {!message.read && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.messageSubject}>{message.subject || 'No Subject'}</Text>
            <Text style={styles.messagePreview} numberOfLines={2}>
                {message.body || 'No content'}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Messages</Text>
                <TouchableOpacity style={styles.composeButton} onPress={() => setShowCompose(true)}>
                    <Ionicons name="create" size={24} color="#0066CC" />
                </TouchableOpacity>
            </View>

            {/* Messages List */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {loading ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Loading messages...</Text>
                    </View>
                ) : messages.length > 0 ? (
                    messages.map((message, index) => <MessageCard key={index} message={message} />)
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="mail-open" size={64} color="#CCC" />
                        <Text style={styles.emptyText}>No messages</Text>
                        <Text style={styles.emptySubtext}>Start a conversation with your team</Text>
                    </View>
                )}
            </ScrollView>

            {/* Compose Modal */}
            <Modal visible={showCompose} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Message</Text>
                            <TouchableOpacity onPress={() => setShowCompose(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.inputLabel}>To:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Recipient name or email"
                                value={newMessage.recipient}
                                onChangeText={(text) => setNewMessage({ ...newMessage, recipient: text })}
                            />

                            <Text style={styles.inputLabel}>Subject:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Message subject"
                                value={newMessage.subject}
                                onChangeText={(text) => setNewMessage({ ...newMessage, subject: text })}
                            />

                            <Text style={styles.inputLabel}>Message:</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Type your message here..."
                                value={newMessage.body}
                                onChangeText={(text) => setNewMessage({ ...newMessage, body: text })}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                            />
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowCompose(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                                <Text style={styles.sendButtonText}>Send</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    composeButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    messageCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    unreadMessage: {
        borderLeftWidth: 4,
        borderLeftColor: '#0066CC',
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    senderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0066CC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    messageDetails: {
        flex: 1,
    },
    senderName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    messageTime: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#0066CC',
    },
    messageSubject: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
    },
    messagePreview: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#9CA3AF',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#D1D5DB',
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    modalBody: {
        padding: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#1F2937',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    sendButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#0066CC',
        alignItems: 'center',
    },
    sendButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
