import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import BottomNavBar from '../../components/BottomNavBar';
import { patientAPI } from '../../services/api';

const TEST_DOCTOR_BLACKLIST = [
   'soap tester',
   'sync test',
   'clinical flow',
   'test doctor',
   'medical specialist',
   'integration test',
   'notification tester'
];

const isBlacklisted = (name) => {
   if (!name) return false;
   const n = name.toLowerCase();
   return TEST_DOCTOR_BLACKLIST.some(black => n.includes(black));
};

export default function SearchScreen({ navigation }) {
   const [searchQuery, setSearchQuery] = useState('');
   const [allDoctors, setAllDoctors] = useState([]);
   const [filteredDoctors, setFilteredDoctors] = useState([]);
   const [doctorNameMap, setDoctorNameMap] = useState({}); // ID -> Decrypted Name
   const [loading, setLoading] = useState(true);
   const [activeFilter, setActiveFilter] = useState('All');
   const searchTimeout = useRef(null);

   useEffect(() => {
      loadAllDoctors();
   }, []);

   const loadAllDoctors = async () => {
      setLoading(true);
      try {
         // 1. Fetch appointments to recover real names from history
         try {
            const apptsRes = await patientAPI.getMyAppointments();
            const appts = apptsRes?.data || [];
            const nameMap = {};
            appts.forEach(a => {
               if (a.doctor_id && a.doctor_name) {
                  nameMap[a.doctor_id] = a.doctor_name;
               }
            });
            setDoctorNameMap(nameMap);
         } catch (e) {
            console.log('[SearchScreen] Failed to fetch appointments for name recovery');
         }

         const allResults = [];
         const seenIds = new Set();

         const addUnique = (list) => {
            if (!Array.isArray(list)) return;
            list.forEach(d => {
               const id = d.id?.toString();
               if (!id || seenIds.has(id)) return;

               // 1. Skip if it's a known test/garbage name
               const rawName = (d.full_name || d.name || '').trim();
               if (isBlacklisted(rawName)) return;

               // From /team/staff, we get 'role'. In /doctors/directory, they are all doctors.
               const role = (d.role || '').toLowerCase();
               if (role && !role.includes('doctor') && !role.includes('physician') && !role.includes('surgeon')) {
                  return;
               }

               allResults.push(d);
               seenIds.add(id);
            });
         };

         // 1. Skip team/staff (403 for patients)

         // 2. Try doctors/directory - global list
         try {
            const response = await patientAPI.searchDoctors({});
            const directoryList = response.data?.results || response.data?.doctors || response.data || [];
            addUnique(directoryList);
         } catch (e) {
            console.log('[SearchScreen] /doctors/directory failed:', e?.message);
         }

         setAllDoctors(allResults);
         setFilteredDoctors(allResults);
      } catch (error) {
         console.error('Error loading doctors:', error);
         setAllDoctors([]);
         setFilteredDoctors([]);
      } finally {
         setLoading(false);
      }
   };

   // Debounced search: checks backend first, then falls back to local filter
   useEffect(() => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => filterDoctors(), 350);
      return () => clearTimeout(searchTimeout.current);
   }, [searchQuery, activeFilter, allDoctors]);

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
            const email = (doctor.email || '').toLowerCase();
            return name.includes(query) || specialty.includes(query) || email.includes(query);
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
                                       let n = (doctor.full_name || doctor.name || '').trim();
                                       const lowerN = n.toLowerCase();
                                       const isGarbage = !n || lowerN === 'unknown doctor' || lowerN === 'encrypted' || n.startsWith('gAAAAA');

                                       if (isGarbage) {
                                          // 1. Try recovery from appointment history
                                          if (doctorNameMap[doctor.id]) {
                                             n = doctorNameMap[doctor.id];
                                          }
                                          // 2. Try to extract a name from the email (e.g. anurag@...)
                                          else if (doctor.email) {
                                             const prefix = doctor.email.split("@")[0];
                                             const cleanPrefix = prefix.split(".")[0].replace(/[0-9]/g, "");
                                             n = cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1);
                                          } else {
                                             // 3. Fallback to specialty
                                             n = doctor.specialty || doctor.department || "Medical Specialist";
                                          }
                                       }
                                       return n.startsWith('Dr. ') ? n : `Dr. ${n}`;
                                    })()}
                                 </Text>
                                 <Text style={styles.itemSubtitle}>
                                    {doctor.specialty || 'General Practice'}
                                    {doctor.department_role ? ` • ${doctor.department_role}` : ''}
                                 </Text>
                                 {doctor.email && <Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{doctor.email}</Text>}
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