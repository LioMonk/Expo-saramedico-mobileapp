import React, { useState, useEffect, useCallback } from 'react';
import {
   View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Switch, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import SignOutModal from '../../components/SignOutModal';
import { getUserData } from '../../services/api';
import AuthService from '../../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DoctorSettingsScreen({ navigation }) {
   const [is2FAEnabled, setIs2FAEnabled] = useState(false);
   const [showSignOut, setShowSignOut] = useState(false);
   const [loading, setLoading] = useState(true);
   const [doctorData, setDoctorData] = useState({
      name: 'Doctor',
      specialty: 'General Practice',
      avatar: null,
      email: '',
      phone: '',
      licenseNumber: ''
   });

   useFocusEffect(
      useCallback(() => {
         loadDoctorProfile();
      }, [])
   );

   const loadDoctorProfile = async () => {
      try {
         const userData = await getUserData();
         if (userData) {
            const cleanName = userData.full_name ? userData.full_name.replace(/^Dr\.\s*/i, '') : 'Doctor';
            setDoctorData({
               name: cleanName,
               specialty: userData.specialty || 'General Practice',
               avatar: userData.avatar || userData.avatar_url || null,
               email: userData.email || '',
               phone: userData.phone || '',
               licenseNumber: userData.license_number || 'Not provided'
            });
            setIs2FAEnabled(userData.mfa_enabled || false);
         }
      } catch (error) {
         console.error('Error loading doctor profile:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleSignOut = async () => {
      setShowSignOut(false);
      try {
         await AuthService.logout();
      } catch (error) {
         console.error('Logout error:', error);
      } finally {
         navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
         });
      }
   };

   const handle2FAToggle = async (value) => {
      setIs2FAEnabled(value);
      try {
         // Mock MFA storage directly to user data since backend lacks endpoints
         const userDataLocal = await AsyncStorage.getItem('@user_data');
         if (userDataLocal) {
            const parsed = JSON.parse(userDataLocal);
            parsed.mfa_enabled = value;
            await AsyncStorage.setItem('@user_data', JSON.stringify(parsed));
         }
      } catch (error) {
         console.error('Error saving 2FA state locally:', error);
      }
      console.log('2FA toggled:', value);
   };

   const handleImagePick = async () => {
      try {
         const result = await DocumentPicker.getDocumentAsync({
            type: ['image/jpeg', 'image/png', 'image/jpg'],
            copyToCacheDirectory: true,
         });

         if (result.type === 'success' || !result.canceled) {
            const file = result.assets ? result.assets[0] : result;
            const imageUri = file.uri;
            setDoctorData(prev => ({ ...prev, avatar: imageUri }));

            // Save locally since backend doesn't support profile picture endpoint yet
            const doctorProfile = await AsyncStorage.getItem('doctor_profile');
            const parsedProfile = doctorProfile ? JSON.parse(doctorProfile) : {};
            parsedProfile.avatar = imageUri;
            await AsyncStorage.setItem('doctor_profile', JSON.stringify(parsedProfile));

            const userDataLocal = await AsyncStorage.getItem('@user_data');
            if (userDataLocal) {
               const parsedUserData = JSON.parse(userDataLocal);
               parsedUserData.avatar = imageUri;
               await AsyncStorage.setItem('@user_data', JSON.stringify(parsedUserData));
            }
         }
      } catch (error) {
         console.error('Error picking image:', error);
      }
   };

   return (
      <SafeAreaView style={styles.container}>
         <View style={styles.content}>
            <View style={styles.header}>
               <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color="#333" />
               </TouchableOpacity>
               <Text style={styles.headerTitle}>My Profile</Text>
               <View style={{ width: 24 }} />
            </View>

            {loading ? (
               <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
               </View>
            ) : (
               <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                  {/* Profile Header */}
                  <View style={styles.profileHeader}>
                     <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePick}>
                        {doctorData.avatar ? (
                           <Image source={{ uri: doctorData.avatar }} style={styles.avatar} />
                        ) : (
                           <View style={[styles.avatar, styles.avatarPlaceholder]}>
                              <Ionicons name="person" size={40} color="#999" />
                           </View>
                        )}
                        <View style={styles.editBadge}>
                           <Ionicons name="pencil" size={14} color="white" />
                        </View>
                     </TouchableOpacity>
                     <Text style={styles.nameText}>Dr. {doctorData.name}</Text>
                     <Text style={styles.roleText}>{doctorData.specialty.toUpperCase()}</Text>
                  </View>

                  {/* SERVICES Section */}
                  <Text style={styles.sectionLabel}>SERVICES</Text>
                  <View style={styles.card}>
                     <TouchableOpacity
                        style={styles.row}
                        onPress={() => navigation.navigate('DoctorAvailabilityScreen')}
                     >
                        <View style={styles.iconBox}><Ionicons name="time-outline" size={20} color="#555" /></View>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.itemTitle}>Availability</Text>
                           <Text style={styles.itemSub}>Set your working hours</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CCC" />
                     </TouchableOpacity>

                     <View style={styles.divider} />

                     <TouchableOpacity
                        style={styles.row}
                        onPress={() => navigation.navigate('DoctorCredentialsScreen', { licenseNumber: doctorData.licenseNumber })}
                     >
                        <View style={styles.iconBox}><Ionicons name="school-outline" size={20} color="#555" /></View>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.itemTitle}>Credentials</Text>
                           <Text style={styles.itemSub}>{doctorData.licenseNumber}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CCC" />
                     </TouchableOpacity>

                     <View style={styles.divider} />

                     <TouchableOpacity
                        style={styles.row}
                        onPress={() => navigation.navigate('DoctorServicesScreen', { specialty: doctorData.specialty })}
                     >
                        <View style={styles.iconBox}><Ionicons name="medkit-outline" size={20} color="#555" /></View>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.itemTitle}>Services Available</Text>
                           <Text style={styles.itemSub}>{doctorData.specialty}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CCC" />
                     </TouchableOpacity>
                  </View>

                  {/* PERSONAL INFORMATION Section */}
                  <Text style={styles.sectionLabel}>SECURITY</Text>
                  <View style={styles.card}>
                     <TouchableOpacity
                        style={styles.row}
                        onPress={() => navigation.navigate('DoctorChangePasswordScreen')}
                     >
                        <View style={styles.iconBox}><Ionicons name="lock-closed-outline" size={20} color="#555" /></View>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.itemTitle}>Password</Text>
                           <Text style={styles.itemSub}>Change via OTP verification</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CCC" />
                     </TouchableOpacity>

                     <View style={styles.divider} />

                     <View style={styles.row}>
                        <View style={styles.iconBox}><Ionicons name="shield-checkmark-outline" size={20} color="#555" /></View>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.itemTitle}>Two-Factor Auth (MFA)</Text>
                           <Text style={styles.itemSub}>{is2FAEnabled ? 'OTP required on login' : 'Disabled'}</Text>
                        </View>
                        <Switch
                           value={is2FAEnabled}
                           onValueChange={handle2FAToggle}
                           trackColor={{ false: "#DDD", true: COLORS.primary }}
                           thumbColor="white"
                        />
                     </View>
                  </View>

                  {/* CONTACT INFORMATION Section */}
                  <Text style={styles.sectionLabel}>CONTACT INFORMATION</Text>
                  <View style={styles.card}>
                     <View style={styles.row}>
                        <View style={styles.iconBox}><Ionicons name="mail-outline" size={20} color="#555" /></View>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.itemTitle}>Email</Text>
                           <Text style={styles.itemSub}>{doctorData.email || 'Not provided'}</Text>
                        </View>
                     </View>

                     <View style={styles.divider} />

                     <View style={styles.row}>
                        <View style={styles.iconBox}><Ionicons name="call-outline" size={20} color="#555" /></View>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.itemTitle}>Phone</Text>
                           <Text style={styles.itemSub}>{doctorData.phone || 'Not provided'}</Text>
                        </View>
                     </View>
                  </View>

                  {/* PRIVACY & DATA Section */}
                  <Text style={styles.sectionLabel}>PRIVACY & DATA</Text>
                  <View style={styles.card}>
                     <TouchableOpacity
                        style={styles.row}
                        onPress={() => navigation.navigate('AuditLogScreen')}
                     >
                        <View style={styles.iconBox}><Ionicons name="list-outline" size={20} color="#555" /></View>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.itemTitle}>Audit Logs</Text>
                           <Text style={styles.itemSub}>View your activity history</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CCC" />
                     </TouchableOpacity>

                     <View style={styles.divider} />

                     <TouchableOpacity
                        style={styles.row}
                        onPress={() => navigation.navigate('DeleteAccountScreen')}
                     >
                        <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
                           <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                        </View>
                        <View style={{ flex: 1 }}>
                           <Text style={[styles.itemTitle, { color: '#D32F2F' }]}>Delete Account</Text>
                           <Text style={styles.itemSub}>Permanently delete your account</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CCC" />
                     </TouchableOpacity>
                  </View>

                  <Text style={styles.footerNote}>Contact administrator to change email or phone</Text>

                  <TouchableOpacity style={styles.signOutBtn} onPress={() => setShowSignOut(true)}>
                     <Ionicons name="log-out-outline" size={20} color="#D32F2F" style={{ marginRight: 8 }} />
                     <Text style={styles.signOutText}>Sign Out</Text>
                  </TouchableOpacity>
               </ScrollView>
            )}
         </View>

         <SignOutModal visible={showSignOut} onCancel={() => setShowSignOut(false)} onConfirm={handleSignOut} />
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: '#F9FAFC' },
   content: { flex: 1, padding: 20 },
   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
   headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
   loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
   scrollContent: { paddingBottom: 40 },
   profileHeader: { alignItems: 'center', marginBottom: 30 },
   avatarContainer: { position: 'relative', marginBottom: 15 },
   avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E0E0E0' },
   avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
   editBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
   nameText: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 },
   roleText: { fontSize: 12, color: '#999', letterSpacing: 1, fontWeight: '600' },
   sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 10, marginTop: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
   card: { backgroundColor: 'white', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
   row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
   iconBox: { width: 36, height: 36, backgroundColor: '#F5F7F9', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
   itemTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
   itemSub: { fontSize: 12, color: '#999', marginTop: 2 },
   divider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 50 },
   footerNote: { textAlign: 'center', fontSize: 11, color: '#999', marginTop: 10, marginBottom: 20 },
   signOutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#FFEBEE', paddingVertical: 15, borderRadius: 12, marginBottom: 20 },
   signOutText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 }
});