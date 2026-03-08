import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import BottomNavBar from '../../components/BottomNavBar';
import { patientAPI } from '../../services/api';

export default function SearchScreen({ navigation }) {
   const [searchQuery, setSearchQuery] = useState('');
   const [allDoctors, setAllDoctors] = useState([]);
   const [filteredDoctors, setFilteredDoctors] = useState([]);
   const [loading, setLoading] = useState(true);
   const [activeFilter, setActiveFilter] = useState('All');

   useEffect(() => {
      loadAllDoctors();
   }, []);

   useEffect(() => {
      filterDoctors();
   }, [searchQuery, activeFilter, allDoctors]);

   const loadAllDoctors = async () => {
      setLoading(true);
      try {
         // Load all doctors without any query
         const response = await patientAPI.searchDoctors();
         let doctorsList = response.data?.results || response.data || [];

         // Deduplicate doctors by ID to prevent double entries
         const uniqueDoctors = [];
         const seenIds = new Set();

         doctorsList.forEach(doctor => {
            const docId = doctor.id?.toString();
            if (docId && !seenIds.has(docId)) {
               seenIds.add(docId);
               uniqueDoctors.push(doctor);
            } else if (!docId) {
               uniqueDoctors.push(doctor);
            }
         });

         setAllDoctors(uniqueDoctors);
         setFilteredDoctors(uniqueDoctors);
      } catch (error) {
         console.error('Error loading doctors:', error);
         setAllDoctors([]);
         setFilteredDoctors([]);
      } finally {
         setLoading(false);
      }
   };

   const filterDoctors = () => {
      let filtered = [...allDoctors];

      // Filter by specialty
      if (activeFilter !== 'All') {
         filtered = filtered.filter(doctor =>
            doctor.specialty?.toLowerCase() === activeFilter.toLowerCase()
         );
      }

      // Filter by search query
      if (searchQuery.trim().length > 0) {
         const query = searchQuery.toLowerCase();
         filtered = filtered.filter(doctor => {
            const name = (doctor.full_name || doctor.name || '').toLowerCase();
            const specialty = (doctor.specialty || '').toLowerCase();
            return name.includes(query) || specialty.includes(query);
         });
      }

      setFilteredDoctors(filtered);
   };

   const specialties = ['All', 'Cardiology', 'Dermatology', 'Neurology', 'Pediatrics'];

   return (
      <SafeAreaView style={styles.container}>
         <View style={styles.contentContainer}>
            {/* Search Input Area */}
            <View style={styles.searchHeader}>
               <View style={styles.searchBar}>
                  <Ionicons name="search-outline" size={20} color="#333" />
                  <TextInput
                     placeholder="Search for doctors..."
                     placeholderTextColor="#666"
                     style={styles.input}
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

            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
               {specialties.map((specialty) => (
                  <TouchableOpacity
                     key={specialty}
                     style={[styles.chip, activeFilter === specialty && styles.chipActive]}
                     onPress={() => setActiveFilter(specialty)}
                  >
                     <Text style={[styles.chipText, activeFilter === specialty && styles.chipTextActive]}>
                        {specialty}
                     </Text>
                  </TouchableOpacity>
               ))}
            </ScrollView>

            {loading ? (
               <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading doctors...</Text>
               </View>
            ) : filteredDoctors.length === 0 ? (
               <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={60} color="#DDD" />
                  <Text style={styles.emptyText}>No doctors found</Text>
                  <Text style={styles.emptySubtext}>
                     {searchQuery ? 'Try a different search term' : 'No doctors available'}
                  </Text>
               </View>
            ) : (
               <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Section: DOCTORS */}
                  <View style={styles.sectionHeader}>
                     <Text style={styles.sectionTitle}>
                        {searchQuery ? 'SEARCH RESULTS' : 'ALL DOCTORS'} ({filteredDoctors.length})
                     </Text>
                  </View>

                  <View style={styles.cardContainer}>
                     {filteredDoctors.map((doctor, index) => (
                        <React.Fragment key={doctor.id || index}>
                           {index > 0 && <View style={styles.divider} />}
                           <TouchableOpacity
                              style={styles.listItem}
                              onPress={() => navigation.navigate('AppointmentBooking', { doctor: doctor })}
                           >
                              <View style={[styles.avatarPlaceholder, { backgroundColor: '#E3F2FD' }]}>
                                 <Ionicons name="medical" size={24} color={COLORS.primary} />
                              </View>
                              <View style={styles.textContainer}>
                                 <Text style={styles.itemTitle}>
                                    {(() => {
                                       let name = doctor.full_name || doctor.name || 'Doctor';
                                       if (name.toLowerCase() === 'encrypted' || name.toLowerCase() === 'unknown doctor') name = 'Doctor';
                                       return name.startsWith('Dr. ') ? name : `Dr. ${name}`;
                                    })()}
                                 </Text>
                                 <Text style={styles.itemSubtitle}>{doctor.specialty || 'General Practice'}</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={20} color="#999" />
                           </TouchableOpacity>
                        </React.Fragment>
                     ))}
                  </View>

                  <View style={{ height: 100 }} />
               </ScrollView>
            )}
         </View>

         <BottomNavBar navigation={navigation} activeTab="Search" />
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: '#F9FAFC' },
   contentContainer: { flex: 1, padding: 20 },

   searchHeader: { marginBottom: 15 },
   searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#EEE' },
   input: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },

   filterRow: { flexDirection: 'row', marginBottom: 25 },
   chip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
   chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
   chipText: { color: '#333', fontSize: 13, fontWeight: '500' },
   chipTextActive: { color: 'white', fontSize: 13, fontWeight: '600' },

   loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
   loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
   emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
   emptyText: { fontSize: 16, fontWeight: '600', color: '#666', marginTop: 15 },
   emptySubtext: { fontSize: 13, color: '#999', marginTop: 5, textAlign: 'center' },

   sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 10 },
   sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#666', letterSpacing: 0.5 },

   cardContainer: { backgroundColor: 'white', borderRadius: 16, padding: 5, marginBottom: 20, borderWidth: 1, borderColor: '#F0F0F0' },
   listItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
   divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 15 },

   avatarPlaceholder: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15, justifyContent: 'center', alignItems: 'center' },
   textContainer: { flex: 1 },
   itemTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
   itemSubtitle: { fontSize: 12, color: '#666' },
});