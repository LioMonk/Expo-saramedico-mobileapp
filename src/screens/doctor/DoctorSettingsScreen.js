import React, { useState, useCallback } from 'react';
import {
   View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import SignOutModal from '../../components/SignOutModal';
import { getUserData, authAPI, doctorAPI } from '../../services/api';
import { fixUserUrls, fixUrl } from '../../services/urlFixer';
import AuthService from '../../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_CONFIG } from '../../services/config';

export default function DoctorSettingsScreen({ navigation }) {
   const [showSignOut, setShowSignOut] = useState(false);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);

   // State mimicking Web profile state exactly
   const [profile, setProfile] = useState({
      full_name: '',
      email: '',
      credentials: '',
      specialty: '',
      license_number: '',
      avatar_url: null,
      avatar_file: null // to hold pending upload avatar
   });

   useFocusEffect(
      useCallback(() => {
         loadDoctorProfile();
      }, [])
   );

   const loadDoctorProfile = async () => {
      try {
         // 1. Fetch from local storage first
         const userData = await getUserData();
         if (userData) {
            updateUI(userData);
         }

         // 2. Fetch latest from API
         const profileRes = await doctorAPI.getMe();
         if (profileRes.data) {
            const latestData = fixUserUrls(profileRes.data);
            updateUI(latestData);

            // Sync local storage
            if (userData) {
               const merged = { ...userData, ...latestData };
               await AsyncStorage.setItem(TOKEN_CONFIG.USER_DATA_KEY, JSON.stringify(merged));
            }
         }
      } catch (error) {
         console.error('Error loading doctor profile:', error);
      } finally {
         setLoading(false);
      }
   };

   const updateUI = (data) => {
      const cleanName = data.full_name ? data.full_name.replace(/^Dr\.\s*/i, '') : (data.name || 'Doctor');
      setProfile({
         full_name: cleanName,
         email: data.email || '',
         credentials: data.credentials || '',
         specialty: data.specialty || '',
         license_number: data.license_number || data.licenseNumber || '',
         avatar_url: data.avatar || data.avatar_url || null,
         avatar_file: null
      });
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

   const handleChange = (name, value) => {
      setProfile(prev => ({ ...prev, [name]: value }));
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

            // Set optimistically as a pending file map
            setProfile(prev => ({ ...prev, avatar_file: imageUri }));
         }
      } catch (error) {
         console.error('Error picking image:', error);
      }
   };

   const handleSave = async () => {
      setSaving(true);
      try {
         let avatarUpdated = false;

         // 1. Avatar upload if picked
         if (profile.avatar_file) {
            const uploadRes = await authAPI.uploadAvatar(profile.avatar_file);
            const serverUrl = uploadRes.preview_url || uploadRes.avatar_url || uploadRes.url;
            if (serverUrl) {
               const fixedAvatarUrl = fixUrl(serverUrl);
               setProfile(prev => ({ ...prev, avatar_url: fixedAvatarUrl, avatar_file: null }));
               avatarUpdated = true;

               // Save globally
               const userDataLocal = await AsyncStorage.getItem(TOKEN_CONFIG.USER_DATA_KEY);
               if (userDataLocal) {
                  const parsedUserData = JSON.parse(userDataLocal);
                  parsedUserData.avatar = serverUrl;
                  parsedUserData.avatar_url = serverUrl;
                  await AsyncStorage.setItem(TOKEN_CONFIG.USER_DATA_KEY, JSON.stringify(parsedUserData));
               }
            }
         }

         // 2. Profile fields upload
         const updatePayload = {
            full_name: profile.full_name,
            specialty: profile.specialty,
            credentials: profile.credentials,
            license_number: profile.license_number
         };
         await doctorAPI.updateProfile(updatePayload);

         // Update local storage for full_name
         const userDataStr = await AsyncStorage.getItem(TOKEN_CONFIG.USER_DATA_KEY);
         if (userDataStr) {
            const parsed = JSON.parse(userDataStr);
            parsed.full_name = profile.full_name;
            parsed.specialty = profile.specialty;
            await AsyncStorage.setItem(TOKEN_CONFIG.USER_DATA_KEY, JSON.stringify(parsed));
         }

         Alert.alert('Success', 'Profile updated successfully!');
      } catch (err) {
         console.error('Error updating profile:', err);
         Alert.alert('Error', 'Failed to update profile or avatar. Please try again.');
      } finally {
         setSaving(false);
      }
   };

   return (
      <SafeAreaView style={styles.container}>
         <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
         >
            <View style={styles.content}>
               <View style={styles.header}>
                  <TouchableOpacity onPress={() => navigation.goBack()}>
                     <Ionicons name="arrow-back" size={24} color="#333" />
                  </TouchableOpacity>
                  <View>
                     <Text style={styles.headerTitle}>My Profile</Text>
                  </View>
                  <View style={{ width: 24 }} />
               </View>

               {loading ? (
                  <View style={styles.loadingContainer}>
                     <ActivityIndicator size="large" color={COLORS.primary} />
                  </View>
               ) : (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                     {/* Web-Style Info Text */}
                     <Text style={styles.description}>Manage your personal information and account details.</Text>

                     <View style={styles.profileCard}>
                        {/* Exact Match Web Profile Header */}
                        <View style={styles.profileCardContent}>
                           <TouchableOpacity style={styles.avatarCircle} onPress={handleImagePick}>
                              {profile.avatar_file || profile.avatar_url ? (
                                 <Image
                                    source={{
                                       uri: Platform.OS === 'android' && (profile.avatar_file || profile.avatar_url).includes('107.20')
                                          ? (profile.avatar_file || profile.avatar_url).replace('107.20.98.130:9010', '10.0.2.2:9010')
                                          : (profile.avatar_file || profile.avatar_url),
                                       headers: (profile.avatar_file || profile.avatar_url).includes('107.20') ? { Host: '107.20.98.130:9010' } : {}
                                    }}
                                    style={{ width: '100%', height: '100%' }}
                                    onError={(e) => {
                                       console.error('❌ [Avatar] Image failed to load:', profile.avatar_file || profile.avatar_url);
                                    }}
                                 />
                              ) : (
                                 <Text style={styles.avatarInitials}>
                                    {profile.full_name ? profile.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "DR"}
                                 </Text>
                              )}
                           </TouchableOpacity>

                           <View style={styles.profileInfoColumn}>
                              <Text style={styles.profileNameTitle}>{profile.full_name || "Doctor"}</Text>
                              <Text style={styles.profileCredentialsSub}>
                                 {profile.credentials}{profile.credentials && profile.specialty ? ', ' : ''}{profile.specialty ? profile.specialty.toUpperCase() : ""}
                              </Text>
                              <TouchableOpacity onPress={handleImagePick} style={{ marginTop: 8 }}>
                                 <Text style={styles.uploadLink}>Upload Avatar</Text>
                              </TouchableOpacity>
                           </View>
                        </View>

                        {/* Web Form Grid Replacement */}
                        <View style={styles.formGrid}>
                           <View style={styles.formField}>
                              <Text style={styles.label}>FULL NAME</Text>
                              <TextInput
                                 style={styles.input}
                                 value={profile.full_name}
                                 onChangeText={(val) => handleChange('full_name', val)}
                                 placeholder="Your name"
                              />
                           </View>

                           <View style={styles.formField}>
                              <Text style={styles.label}>EMAIL ADDRESS</Text>
                              <TextInput
                                 style={[styles.input, styles.inputDisabled]}
                                 value={profile.email}
                                 editable={false}
                                 placeholder="Email"
                              />
                           </View>

                           <View style={styles.formField}>
                              <Text style={styles.label}>CREDENTIALS</Text>
                              <TextInput
                                 style={styles.input}
                                 value={profile.credentials}
                                 onChangeText={(val) => handleChange('credentials', val)}
                                 placeholder="MD, MBBS"
                              />
                           </View>

                           <View style={styles.formField}>
                              <Text style={styles.label}>SPECIALTY</Text>
                              <TextInput
                                 style={styles.input}
                                 value={profile.specialty}
                                 onChangeText={(val) => handleChange('specialty', val)}
                                 placeholder="Cardiology"
                              />
                           </View>

                           <View style={styles.formField}>
                              <Text style={styles.label}>LICENSE NUMBER</Text>
                              <TextInput
                                 style={styles.input}
                                 value={profile.license_number}
                                 onChangeText={(val) => handleChange('license_number', val)}
                                 placeholder="LIC-123456"
                              />
                           </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.buttonGroup}>
                           <TouchableOpacity style={styles.cancelBtn} onPress={() => loadDoctorProfile()}>
                              <Text style={styles.cancelBtnText}>Cancel</Text>
                           </TouchableOpacity>
                           <TouchableOpacity
                              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                              onPress={handleSave}
                              disabled={saving}
                           >
                              {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                           </TouchableOpacity>
                        </View>
                     </View>

                     {/* Maintaining Sign Out for Mobile Accessibility */}
                     <TouchableOpacity style={styles.signOutBtn} onPress={() => setShowSignOut(true)}>
                        <Ionicons name="log-out-outline" size={20} color="#D32F2F" style={{ marginRight: 8 }} />
                        <Text style={styles.signOutText}>Sign Out</Text>
                     </TouchableOpacity>

                  </ScrollView>
               )}
            </View>
         </KeyboardAvoidingView>
         <SignOutModal visible={showSignOut} onCancel={() => setShowSignOut(false)} onConfirm={handleSignOut} />
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: '#F9FAFC' },
   content: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
   headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
   description: { fontSize: 13, color: '#64748B', marginBottom: 20 },
   loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
   scrollContent: { paddingBottom: 40 },

   // Profile Card (Matching Web UI exactly)
   profileCard: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: '#F1F5F9',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
      marginBottom: 20
   },
   profileCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 30
   },
   avatarCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#E0E7FF', // Match web indigo slight bg
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      marginRight: 20
   },
   avatarInitials: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#3730A3' // Matches web text-indigo-800
   },
   profileInfoColumn: {
      flex: 1,
      justifyContent: 'center'
   },
   profileNameTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#111827'
   },
   profileCredentialsSub: {
      fontSize: 13,
      color: '#6B7280',
      marginTop: 2
   },
   uploadLink: {
      fontSize: 13,
      fontWeight: '600',
      color: '#4F46E5', // match web text-indigo-600
   },

   // Form Fields
   formGrid: {
      gap: 16
   },
   formField: {
      marginBottom: 16
   },
   label: {
      fontSize: 11,
      fontWeight: '700',
      color: '#64748B', // match slate-500
      marginBottom: 8,
      letterSpacing: 0.5
   },
   input: {
      borderWidth: 1,
      borderColor: '#E2E8F0', // slate-200
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      color: '#1E293B', // slate-800
      backgroundColor: 'white'
   },
   inputDisabled: {
      backgroundColor: '#F8FAFC', // slate-50
      color: '#94A3B8' // slate-400
   },

   // Buttons
   buttonGroup: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 24,
      gap: 12
   },
   cancelBtn: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: 'white',
      justifyContent: 'center',
      alignItems: 'center'
   },
   cancelBtnText: {
      fontWeight: '600',
      color: '#64748B',
      fontSize: 14
   },
   saveBtn: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: '#4F46E5', // indigo-600
      justifyContent: 'center',
      alignItems: 'center'
   },
   saveBtnText: {
      fontWeight: '600',
      color: 'white',
      fontSize: 14
   },

   // Sign Out
   signOutBtn: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'white',
      borderWidth: 1,
      borderColor: '#FFEBEE',
      paddingVertical: 15,
      borderRadius: 12,
      marginBottom: 20,
      marginTop: 10
   },
   signOutText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
});