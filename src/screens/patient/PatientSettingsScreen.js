import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity,
  Switch, Modal, TextInput, ActivityIndicator, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/theme';
import SignOutModal from '../../components/SignOutModal';
import { authAPI, patientAPI } from '../../services/api';
import { TOKEN_CONFIG, API_CONFIG } from '../../services/config';
import { SvgUri } from 'react-native-svg';

export default function PatientSettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    console.log('🔗 [PatientSettings] API_CONFIG:', JSON.stringify(API_CONFIG, null, 2));
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getCurrentUser();
      console.log('👤 [PatientSettings] Profile loaded. Name:', response.data.full_name || response.data.name);
      console.log('🖼️  [PatientSettings] Avatar URL:', response.data.avatar_url);
      setProfile(response.data);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    try {
      setPasswordLoading(true);
      await authAPI.changePassword(oldPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password change error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
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

        // Optimistic update
        setProfile(prev => ({ ...prev, avatar_url: imageUri }));

        try {
          const uploadRes = await authAPI.uploadAvatar(imageUri);
          const serverUrl = uploadRes.preview_url || uploadRes.avatar_url || uploadRes.url;

          if (serverUrl) {
            setProfile(prev => ({ ...prev, avatar_url: serverUrl }));

            // Save server URL locally for persistence using standardized key
            const userDataLocal = await AsyncStorage.getItem(TOKEN_CONFIG.USER_DATA_KEY);
            if (userDataLocal) {
              const parsedUserData = JSON.parse(userDataLocal);
              parsedUserData.avatar_url = serverUrl;
              parsedUserData.avatar = serverUrl;
              await AsyncStorage.setItem(TOKEN_CONFIG.USER_DATA_KEY, JSON.stringify(parsedUserData));
            }
          }
        } catch (err) {
          console.error('Avatar upload error:', err);
          Alert.alert('Upload Error', 'Failed to save profile picture.');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleSignOut = () => {
    setShowSignOut(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePick}>
              {profile?.avatar_url ? (
                profile.avatar_url.toLowerCase().includes('.svg') ? (
                  <View style={styles.avatar}>
                    <SvgUri
                      width="100%"
                      height="100%"
                      uri={profile.avatar_url}
                      onError={(e) => {
                        console.error('❌ [Avatar] SVG failed to load:', profile.avatar_url);
                      }}
                      onLoad={() => {
                        console.log('✅ [Avatar] SVG loaded successfully:', profile.avatar_url);
                      }}
                    />
                  </View>
                ) : (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatar}
                    resizeMode="cover"
                    onError={(e) => {
                      console.error('❌ [Avatar] Image failed to load:', profile.avatar_url);
                    }}
                    onLoad={() => {
                      console.log('✅ [Avatar] Image loaded successfully:', profile.avatar_url);
                    }}
                  />
                )
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#FFF" />
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={14} color="white" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleImagePick}>
              <Text style={{ fontSize: 13, color: '#4f46e5', fontWeight: '500', marginBottom: 12 }}>
                Upload Image / Avatar
              </Text>
            </TouchableOpacity>
            <Text style={styles.nameText}>{profile?.name || profile?.full_name || 'Patient'}</Text>
            <Text style={styles.roleText}>Patient ID: {profile?.id?.substring(0, 8) || 'N/A'}</Text>
          </View>

          {/* BASIC INFORMATION Section */}
          <Text style={styles.sectionLabel}>BASIC INFORMATION</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconBox}><Ionicons name="person-outline" size={20} color="#555" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Legal First Name</Text>
                <Text style={styles.itemSub}>{profile?.first_name || profile?.full_name?.split(" ")[0] || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.iconBox}><Ionicons name="person-outline" size={20} color="#555" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Legal Last Name</Text>
                <Text style={styles.itemSub}>{profile?.last_name || profile?.full_name?.split(" ").slice(1).join(" ") || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.iconBox}><Ionicons name="calendar-outline" size={20} color="#555" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Date of Birth</Text>
                <Text style={styles.itemSub}>{profile?.date_of_birth || profile?.dateOfBirth || profile?.dob || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.iconBox}><Ionicons name="card-outline" size={20} color="#555" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Social Security Number</Text>
                <Text style={styles.itemSub}>{profile?.ssn || '***-**-****'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.iconBox}><Ionicons name="medical-outline" size={20} color="#555" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>MRN</Text>
                <Text style={styles.itemSub}>{profile?.mrn || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* CONTACT INFORMATION Section */}
          <Text style={styles.sectionLabel}>CONTACT INFORMATION</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconBox}><Ionicons name="mail-outline" size={20} color="#555" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Email</Text>
                <Text style={styles.itemSub}>{profile?.email || 'Not set'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.iconBox}><Ionicons name="call-outline" size={20} color="#555" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Mobile Phone</Text>
                <Text style={styles.itemSub}>{profile?.phone_number || profile?.phoneNumber || profile?.phone || 'Not set'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.iconBox}><Ionicons name="home-outline" size={20} color="#555" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Home Phone</Text>
                <Text style={styles.itemSub}>{profile?.homePhone || profile?.home_phone || 'Not set'}</Text>
              </View>
            </View>
          </View>




          {/* Sign Out Button */}
          <TouchableOpacity style={styles.signOutBtn} onPress={() => setShowSignOut(true)}>
            <Ionicons name="log-out-outline" size={20} color="#D32F2F" style={{ marginRight: 8 }} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Old Password"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm New Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



      <SignOutModal
        visible={showSignOut}
        onCancel={() => setShowSignOut(false)}
        onConfirm={handleSignOut}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFC' },
  content: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  scrollContent: { paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E0E0E0' },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#B39DDB', justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  nameText: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 },
  roleText: { fontSize: 12, color: '#999', letterSpacing: 0.5 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 10, marginTop: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  card: { backgroundColor: 'white', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  iconBox: { width: 36, height: 36, backgroundColor: '#F5F7F9', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  itemSub: { fontSize: 12, color: '#999', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 50 },
  signOutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#FFEBEE', paddingVertical: 15, borderRadius: 12, marginBottom: 20, marginTop: 10 },
  signOutText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  modalInput: { backgroundColor: '#F5F7F9', borderRadius: 10, padding: 15, marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: '#E0E0E0' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelButton: { backgroundColor: '#F5F5F5', marginRight: 8 },
  saveButton: { backgroundColor: COLORS.primary, marginLeft: 8 },
  cancelButtonText: { color: '#666', fontWeight: '600' },
  saveButtonText: { color: 'white', fontWeight: '600' }
});