import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import DoctorBottomNavBar from '../../components/DoctorBottomNavBar';
import { doctorAPI } from '../../services/api';

export default function DoctorSearchScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ patients: [], documents: [] });
  const [allPatients, setAllPatients] = useState([]); // Master list for name lookup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchTimeout = useRef(null);

  const filters = ['All', 'Patients', 'Documents'];

  // Initial load of patients for name resolution
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const res = await doctorAPI.getPatients();
        setAllPatients(res.data?.all_patients || res.data || []);
      } catch (e) { console.error('Lookup error:', e); }
    };
    loadMasterData();
  }, []);

  // Debounced search & Filter toggle
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Always perform search (even with empty query) to show default list
    searchTimeout.current = setTimeout(() => {
      performSearch(searchQuery, activeFilter);
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, activeFilter]);

  const performSearch = async (query, filter) => {
    setLoading(true);
    setError(null);
    try {
      let response;
      const isQueryEmpty = !query || query.trim().length === 0;

      // Call appropriate API based on filter
      switch (filter) {
        case 'Patients':
          response = isQueryEmpty
            ? await doctorAPI.getPatients()
            : await doctorAPI.searchPatients(query);
          const pData = response.data?.all_patients || response.data || [];
          setSearchResults({ patients: pData, documents: [] });
          break;
        case 'Documents':
          response = await doctorAPI.searchDocuments(query);
          setSearchResults({ patients: [], documents: response.data?.documents || [] });
          break;
        default: // 'All'
          if (isQueryEmpty) {
            // Load base list of patients, don't load all docs for performance
            response = await doctorAPI.getPatients();
            setSearchResults({
              patients: response.data?.all_patients || response.data || [],
              documents: []
            });
          } else {
            // Search both
            const [pRes, dRes] = await Promise.all([
              doctorAPI.searchPatients(query),
              doctorAPI.searchDocuments(query)
            ]);
            setSearchResults({
              patients: pRes.data || [],
              documents: dRes.data?.documents || []
            });
          }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to load results. Please try again.');
      setSearchResults({ patients: [], documents: [] });
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = (patient) => {
    navigation.navigate('DoctorPatientDetailScreen', {
      patientId: patient.id,
      patient: patient
    });
  };

  const handleDocumentClick = (document) => {
    // Navigate to document detail or preview
    navigation.navigate('DoctorAnalyzedResultScreen', {
      documentId: document.id,
      patientId: document.patientId
    });
  };

  const filteredResults = () => {
    switch (activeFilter) {
      case 'Patients':
        return { patients: searchResults.patients, documents: [] };
      case 'Documents':
        return { patients: [], documents: searchResults.documents };
      default:
        return searchResults;
    }
  };

  const results = filteredResults();
  const hasResults = results.patients.length > 0 || results.documents.length > 0;

  // Create a patient lookup map for document items (using master list)
  const patientLookup = {};
  allPatients.forEach(p => {
    patientLookup[p.id] = p.full_name || p.name;
  });

  // Also include current search hits to be safe
  results.patients.forEach(p => {
    if (!patientLookup[p.id]) patientLookup[p.id] = p.full_name || p.name;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Search Header with Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              placeholder="Search patients or documents..."
              placeholderTextColor="#999"
              style={styles.input}
              autoFocus={true}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, activeFilter === f && styles.chipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{searchQuery.length > 0 ? 'Searching...' : 'Loading...'}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !hasResults && !error && (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No matches found</Text>
            <Text style={styles.emptySubText}>
              {searchQuery.length > 0 ? "Try different keywords" : "No records available at the moment"}
            </Text>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>

          {/* Patient Matches */}
          {results.patients.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>PATIENTS ({results.patients.length})</Text>
              </View>

              <View style={styles.card}>
                {results.patients.map((patient, index) => (
                  <React.Fragment key={patient.id || index}>
                    {index > 0 && <View style={styles.divider} />}
                    <PatientMatchItem
                      patient={patient}
                      onPress={() => handlePatientClick(patient)}
                    />
                  </React.Fragment>
                ))}
              </View>
            </>
          )}

          {/* Document Matches */}
          {results.documents.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>DOCUMENTS ({results.documents.length})</Text>
              </View>

              <View style={styles.card}>
                {results.documents.map((doc, index) => (
                  <React.Fragment key={doc.id || index}>
                    {index > 0 && <View style={styles.divider} />}
                    <DocumentMatchItem
                      document={doc}
                      patientName={patientLookup[doc.patientId] || 'Patient Record'}
                      onPress={() => handleDocumentClick(doc)}
                    />
                  </React.Fragment>
                ))}
              </View>
            </>
          )}


          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Nav - Always Visible */}
        <DoctorBottomNavBar
          navigation={navigation}
          activeTab="Home"
          onFabPress={() => { }}
        />
      </View>
    </SafeAreaView>
  );
}

// --- Helper Components ---

const PatientMatchItem = ({ patient, onPress }) => (
  <TouchableOpacity style={styles.matchItem} onPress={onPress}>
    <View style={[styles.avatar, { backgroundColor: '#E3F2FD' }]}>
      <Ionicons name="person" size={20} color="#2196F3" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.matchName}>{patient.full_name || patient.name || 'Unknown Patient'}</Text>
      <Text style={styles.matchSub}>MRN: {patient.mrn || patient.id || 'N/A'}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#CCC" />
  </TouchableOpacity>
);

const DocumentMatchItem = ({ document, patientName, onPress }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    } catch (e) { return ''; }
  };

  return (
    <TouchableOpacity style={styles.matchItem} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: '#FFF3E0' }]}>
        <Ionicons name="document-text" size={20} color="#FF9800" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.matchName}>{document.title || document.fileName || 'Untitled Document'}</Text>
        <Text style={styles.matchSub}>Patient: {patientName}</Text>
        <Text style={styles.matchSub}>{document.category || 'General'} • {formatDate(document.uploadedAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );
};



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFC' },
  content: { flex: 1 },

  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
    gap: 10
  },
  backButton: {
    padding: 5
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#EEE'
  },
  input: { flex: 1, marginLeft: 10, fontSize: 14, color: '#333' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: '#666', fontSize: 12 },
  chipTextActive: { color: 'white', fontWeight: 'bold' },

  scrollView: { flex: 1, paddingHorizontal: 20 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 14 },

  errorContainer: { padding: 20, alignItems: 'center' },
  errorText: { color: '#F44336', fontSize: 14 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 15 },
  emptySubText: { fontSize: 13, color: '#BBB', marginTop: 5 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 15 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },

  card: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#EEE' },
  matchItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 65 },

  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  matchName: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  matchSub: { fontSize: 12, color: '#999' },
  uploaderText: { fontSize: 11, color: '#666', marginTop: 2, fontStyle: 'italic' },

  typeTag: { backgroundColor: '#ECEFF1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 },
  typeText: { fontSize: 10, fontWeight: 'bold', color: '#455A64' },
});