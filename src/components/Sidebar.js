import React, { useState, useEffect } from 'react';
import {
   View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import SignOutModal from './SignOutModal';
import { authAPI } from '../services/api';

export default function PatientSidebar({ isVisible, onClose, navigation }) {
   const [showSignOut, setShowSignOut] = useState(false);
   const [patientName, setPatientName] = useState('Patient');
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (isVisible) {
         loadPatientData();
      }
   }, [isVisible]);

   const loadPatientData = async () => {
      try {
         setLoading(true);
         const response = await authAPI.getCurrentUser();
         setPatientName(response.data?.name || response.data?.full_name || 'Patient');
      } catch (error) {
         console.error('Error loading patient data:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleNavigation = (screenName) => {
      onClose();
      if (screenName) navigation.navigate(screenName);
   };

   const confirmSignOut = () => {
      setShowSignOut(false);
      onClose();
      navigation.reset({
         index: 0,
         routes: [{ name: 'Auth' }],
      });
   };

   return (
      <>
         <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
               <TouchableWithoutFeedback onPress={onClose}>
                  <View style={styles.modalTransparentLayer} />
               </TouchableWithoutFeedback>

               <View style={styles.sidebarContainer}>
                  {/* Header */}
                  <View style={styles.sidebarHeader}>
                     <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={24} color="#FFF" />
                     </View>
                     <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#333" />
                     </TouchableOpacity>
                  </View>

                  {loading ? (
                     <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 30 }} />
                  ) : (
                     <>
                        <Text style={styles.sidebarName}>{patientName}</Text>
                        <Text style={styles.sidebarRole}>Patient Account</Text>
                     </>
                  )}

                  {/* Menu */}
                  <View style={styles.menuContainer}>
                     <TouchableOpacity style={styles.menuItemActive} onPress={() => handleNavigation('PatientDashboard')}>
                        <Ionicons name="home" size={20} color={COLORS.primary} />
                        <Text style={styles.menuTextActive}>Home</Text>
                     </TouchableOpacity>

                     <Text style={styles.sectionHeader}>MY HEALTH</Text>

                     <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('MedicalRecordsScreen')}>
                        <Ionicons name="folder-open-outline" size={20} color="#333" />
                        <Text style={styles.menuText}>Medical Records</Text>
                     </TouchableOpacity>

                     <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('ScheduleScreen')}>
                        <Ionicons name="calendar-outline" size={20} color="#333" />
                        <Text style={styles.menuText}>Appointments</Text>
                     </TouchableOpacity>

                     <Text style={styles.sectionHeader}>ACCOUNT</Text>

                     <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('PatientNotificationsScreen')}>
                        <Ionicons name="notifications-outline" size={20} color="#333" />
                        <Text style={styles.menuText}>Notifications</Text>
                     </TouchableOpacity>

                     <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('PatientSettingsScreen')}>
                        <Ionicons name="settings-outline" size={20} color="#333" />
                        <Text style={styles.menuText}>Settings</Text>
                     </TouchableOpacity>
                  </View>

                  {/* Footer */}
                  <View style={styles.sidebarFooter}>
                     <TouchableOpacity style={styles.menuItem} onPress={() => setShowSignOut(true)}>
                        <Ionicons name="log-out-outline" size={20} color="#333" />
                        <Text style={styles.menuText}>Sign Out</Text>
                     </TouchableOpacity>
                  </View>
               </View>
            </View>
         </Modal>

         <SignOutModal visible={showSignOut} onCancel={() => setShowSignOut(false)} onConfirm={confirmSignOut} />
      </>
   );
}

const styles = StyleSheet.create({
   modalOverlay: { flex: 1, flexDirection: 'row' },
   modalTransparentLayer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
   sidebarContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '75%', backgroundColor: 'white', padding: 25, shadowColor: "#000", elevation: 10 },
   sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 40, marginBottom: 15 },
   avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#B39DDB', justifyContent: 'center', alignItems: 'center' },
   sidebarName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 2 },
   sidebarRole: { fontSize: 13, color: '#666', marginBottom: 30 },
   menuContainer: { flex: 1 },
   sectionHeader: { fontSize: 11, fontWeight: 'bold', color: '#999', marginTop: 20, marginBottom: 10, letterSpacing: 0.5 },
   menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginBottom: 5 },
   menuItemActive: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginBottom: 5, backgroundColor: '#E3F2FD', paddingHorizontal: 10, borderRadius: 10, marginLeft: -10 },
   menuText: { fontSize: 15, marginLeft: 15, color: '#333', fontWeight: '500' },
   menuTextActive: { fontSize: 15, marginLeft: 15, color: COLORS.primary, fontWeight: '600' },
   sidebarFooter: { marginTop: 'auto', marginBottom: 30 },
});