import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '../../constants/theme';
import { patientAPI } from '../../services/api';
import ErrorHandler from '../../services/errorHandler';
import moment from 'moment';

export default function MedicalRecordsScreen({ navigation }) {
  const [consultations, setConsultations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('visits'); // 'visits' or 'documents'
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [monthFilter, setMonthFilter] = useState('All');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

      const [consultRes, docRes, aptRes, doctorsRes] = await Promise.all([
        patientAPI.getMyConsultations(50).catch(() => ({ data: [] })),
        patientAPI.getMyDocuments().catch(() => ({ data: [] })),
        patientAPI.getMyAppointments().catch(() => ({ data: [] })),
        patientAPI.getDoctors().catch(() => ({ data: { results: [] } }))
      ]);

      const consultData = consultRes.data?.consultations || consultRes.data || [];
      const appointments = aptRes.data || [];
      const rawDocData = docRes.data?.documents || docRes.data?.items || docRes.data || [];
      const doctorsList = doctorsRes.data?.results || doctorsRes.data || [];

      // Create a map of doctor names for robust lookup
      const doctorsMap = {};
      if (Array.isArray(doctorsList)) {
        doctorsList.forEach(d => {
          if (d.id) {
            const dName = d.name || d.full_name;
            // Filter out placeholder names from directory as well
            if (dName && dName.toLowerCase() !== 'encrypted' && dName.toLowerCase() !== 'unknown doctor') {
              doctorsMap[d.id.toString()] = dName;
            }
          }
        });
      }

      const enrichedConsultations = Array.isArray(consultData) ? consultData.map(c => {
        // Try to get name from backend provided doctorName
        if (!c.doctorName || c.doctorName === "Unknown Doctor" || c.doctorName.toLowerCase() === 'encrypted') {
          // 1. Try doctors directory map
          if (doctorsMap[c.doctorId || c.doctor_id]) {
            c.doctorName = doctorsMap[c.doctorId || c.doctor_id];
          }
          // 2. Try to match with appointments
          else {
            let match = appointments.find(a => a.id === c.appointment_id);

            if (!match) {
              match = appointments.find(a =>
                (a.doctor_id === (c.doctorId || c.doctor_id)) &&
                moment(a.requested_date || a.scheduled_at).isSame(moment(c.scheduledAt), 'hour')
              );
            }

            if (match && (match.doctor_name || match.doctor?.full_name)) {
              c.doctorName = match.doctor_name || match.doctor?.full_name;
            }
          }
        }
        return c;
      }) : [];

      const uniqueFiles = new Map();
      const docsToProcess = Array.isArray(rawDocData) ? rawDocData : [];

      docsToProcess.forEach(doc => {
        // Handle both snake_case and camelCase from backend
        const fileName = doc.fileName || doc.file_name || doc.filename || doc.title || 'Untitled Document';
        const existing = uniqueFiles.get(fileName);
        const hasUrl = doc.downloadUrl || doc.presigned_url || doc.url || doc.download_url;
        const existingHasUrl = existing ? (existing.downloadUrl || existing.presigned_url || existing.url || existing.download_url) : false;

        if (!existing) {
          uniqueFiles.set(fileName, doc);
        } else if (hasUrl && !existingHasUrl) {
          uniqueFiles.set(fileName, doc);
        }
      });

      setConsultations(enrichedConsultations);
      setDocuments(Array.from(uniqueFiles.values()).sort((a, b) => {
        const dateA = new Date(a.uploadedAt || a.uploaded_at || a.created_at || 0);
        const dateB = new Date(b.uploadedAt || b.uploaded_at || b.created_at || 0);
        return dateB - dateA;
      }));
    } catch (error) {
      console.error('Error loading medical data:', error);
      ErrorHandler.handleError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData(true);
  };

  const openDocument = (url) => {
    if (url) {
      WebBrowser.openBrowserAsync(url).catch(err => console.error("Could not open browser", err));
    } else {
      Alert.alert('Error', 'Document URL not available');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredDocuments = documents.filter(doc => {
    if (typeFilter !== 'All Types') {
      const type = (doc.fileType || doc.content_type || '').split('/')[1]?.toUpperCase() || 'FILE';
      if (type !== typeFilter) return false;
    }
    if (monthFilter !== 'All') {
      const dateStr = doc.uploadedAt || doc.uploaded_at || doc.created_at;
      if (!dateStr) return false;
      const docMonth = moment(dateStr).format('MMMM');
      if (docMonth !== monthFilter) return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Medical Records</Text>
            <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>Securely access your history, labs, and visit summaries.</Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'visits' && styles.activeTab]}
            onPress={() => setActiveTab('visits')}
          >
            <Text style={[styles.tabText, activeTab === 'visits' && styles.activeTabText]}>Visit History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'documents' && styles.activeTab]}
            onPress={() => setActiveTab('documents')}
          >
            <Text style={[styles.tabText, activeTab === 'documents' && styles.activeTabText]}>Documents</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Fetching your medical history...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color={COLORS.primary} />}
          >
            {activeTab === 'documents' && documents.length > 0 && (
              <View style={styles.dropdownRow}>
                <FilterDropdown
                  label="Type"
                  value={typeFilter}
                  options={['All Types', ...new Set(documents.map(doc => (doc.fileType || doc.content_type || '').split('/')[1]?.toUpperCase() || 'FILE'))]}
                  onSelect={setTypeFilter}
                  visible={showTypeModal}
                  setVisible={setShowTypeModal}
                />
                <FilterDropdown
                  label="Month"
                  value={monthFilter === 'All' ? 'All Months' : monthFilter}
                  options={["All", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]}
                  onSelect={setMonthFilter}
                  visible={showMonthModal}
                  setVisible={setShowMonthModal}
                />
              </View>
            )}

            {activeTab === 'visits' ? (
              consultations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="medical-outline" size={60} color="#DDD" />
                  <Text style={styles.emptyText}>No consultations yet</Text>
                  <Text style={styles.emptySubtext}>Your visit history will appear here after your first appointment.</Text>
                </View>
              ) : (
                consultations.map((c, i) => (
                  <TouchableOpacity
                    key={c.id || i}
                    style={styles.card}
                    onPress={() => navigation.navigate('ConsultationDetails', { consultationId: c.id })}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                        <Ionicons name="videocam" size={20} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.doctorName}>
                          {(() => {
                            let name = (c.doctorName && !c.doctorName.toLowerCase().includes('unknown') && !c.doctorName.toLowerCase().includes('encrypted'))
                              ? c.doctorName
                              : (c.doctor_name || 'Doctor');
                            return name.startsWith('Dr. ') ? name : `Dr. ${name}`;
                          })()}
                        </Text>
                        <Text style={styles.dateText}>{moment(c.scheduledAt).format('MMM Do, YYYY • h:mm A')}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#CCC" />
                    </View>
                    <View style={styles.cardFooter}>
                      <Text style={styles.diagnosisText} numberOfLines={1}>
                        {c.diagnosis || 'General Consultation'}
                      </Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{c.status?.toUpperCase()}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )
            ) : (
              filteredDocuments.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={60} color="#DDD" />
                  <Text style={styles.emptyText}>No documents found</Text>
                  <Text style={styles.emptySubtext}>Your doctor will upload any relevant documents here.</Text>
                </View>
              ) : (
                filteredDocuments.map((doc, i) => (
                  <TouchableOpacity
                    key={doc.id || i}
                    style={styles.card}
                    onPress={() => openDocument(doc.downloadUrl || doc.download_url || doc.presigned_url || doc.url)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
                        <Ionicons name="document" size={20} color="#9C27B0" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docTitle}>{doc.title || doc.file_name || doc.fileName || doc.filename || doc.notes || 'Untitled Document'}</Text>
                        <Text style={styles.dateText}>
                          Added: {moment(doc.uploadedAt || doc.uploaded_at || doc.created_at).format('MMM Do, YYYY')}
                        </Text>
                      </View>
                      <Ionicons name="eye" size={18} color="#CCC" />
                    </View>
                    <View style={styles.docFooter}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{doc.category?.replace(/_/g, ' ') || 'GENERAL'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: (doc.downloadUrl || doc.presigned_url || doc.url || doc.download_url) ? '#2E7D32' : '#FF9800' }} />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: (doc.downloadUrl || doc.presigned_url || doc.url || doc.download_url) ? '#2E7D32' : '#FF9800' }}>
                          {(doc.downloadUrl || doc.presigned_url || doc.url || doc.download_url) ? 'Available' : 'Processing'}
                        </Text>
                        <Text style={styles.fileType}>|</Text>
                        <Text style={styles.fileType}>{(doc.fileType || doc.content_type || '').split('/')[1]?.toUpperCase() || 'FILE'}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

      </View>

      <View style={{ height: 20 }} />
    </SafeAreaView>
  );
}

// --- Local Sub-components ---
function FilterDropdown({ label, value, options, onSelect, visible, setVisible }) {
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.dropdownLabel}>{label}</Text>
          <Text style={styles.dropdownValue} numberOfLines={1}>{value}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.modalItem}
                  onPress={() => {
                    onSelect(opt);
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, (value === opt || (value === 'All Months' && opt === 'All')) && styles.activeModalItemText]}>
                    {opt === 'All' ? 'All Months' : opt}
                  </Text>
                  {(value === opt || (value === 'All Months' && opt === 'All')) && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 13, color: '#666' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  backBtn: { padding: 4 },
  uploadHeaderBtn: { padding: 8, backgroundColor: COLORS.primary + '10', borderRadius: 10 },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 12
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeTabText: { color: 'white' },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  doctorName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  docTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 12, color: '#999', marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5'
  },
  docFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5'
  },
  diagnosisText: { fontSize: 13, color: '#666', flex: 1, marginRight: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#E8F5E9' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#2E7D32' },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3E5F5' },
  categoryBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#9C27B0' },
  fileType: { fontSize: 10, fontWeight: '800', color: '#999' },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginTop: 20 },
  emptySubtext: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 10, lineHeight: 20 },
  uploadBtn: { marginTop: 25, backgroundColor: COLORS.primary, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 12 },
  uploadBtnText: { color: 'white', fontWeight: 'bold' },
  filtersContainer: { marginBottom: 20, marginTop: 5 },
  filterScroll: { flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#F0F2F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  activeFilterChip: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600'
  },
  activeFilterText: {
    color: COLORS.primary,
  },
  dropdownRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12
  },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  dropdownLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2
  },
  dropdownValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 40,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  closeBtn: {
    padding: 4
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA'
  },
  modalItemText: {
    fontSize: 16,
    color: '#444'
  },
  activeModalItemText: {
    color: COLORS.primary,
    fontWeight: 'bold'
  }
});