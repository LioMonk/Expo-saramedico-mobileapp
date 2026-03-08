import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import SignOutModal from './SignOutModal';
import { getUserData } from '../services/api';
import { fixUserUrls } from '../services/urlFixer';

export default function DoctorSidebar({ isVisible, onClose, navigation, onStartMeet }) {
  const [showSignOut, setShowSignOut] = useState(false);
  const [doctorData, setDoctorData] = useState({
    name: 'Doctor',
    specialty: 'General Practice',
    avatar: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isVisible) {
      loadDoctorProfile();
    }
  }, [isVisible]);

  const loadDoctorProfile = async () => {
    try {
      const rawData = await getUserData();
      if (rawData) {
        const userData = fixUserUrls(rawData);
        // Remove any existing "Dr." prefix to avoid duplication
        const cleanName = userData.full_name ? userData.full_name.replace(/^Dr\.\s*/i, '') : 'Doctor';
        setDoctorData({
          name: cleanName,
          specialty: userData.specialty || 'General Practice',
          avatar: userData.avatar_url || userData.avatar || null
        });
      }
    } catch (error) {
      console.error('Error loading doctor profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (screenName) => {
    onClose();
    if (screenName) {
      navigation.navigate(screenName);
    }
  };

  const handleLiveConsult = () => {
    onClose();
    navigation.navigate('DoctorLiveConsultScreen');
  };

  const onSignOutClick = () => {
    setShowSignOut(true);
  };

  const confirmSignOut = () => {
    setShowSignOut(false);
    onClose();
    // FIX: Reset navigation stack to Auth
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  return (
    <>
      <Modal
        animationType="fade"
        transparent={true}
        visible={isVisible}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          {/* Transparent Layer */}
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.modalTransparentLayer} />
          </TouchableWithoutFeedback>

          {/* Sidebar Panel */}
          <View style={styles.sidebarContainer}>

            {/* Header with Avatar */}
            <View style={styles.sidebarHeader}>
              {doctorData.avatar ? (
                <Image
                  source={{ uri: doctorData.avatar }}
                  style={styles.sidebarAvatar}
                />
              ) : (
                <View style={[styles.sidebarAvatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={28} color="#999" />
                </View>
              )}
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 10 }} />
            ) : (
              <>
                <Text style={styles.sidebarName}>Dr. {doctorData.name}</Text>
                <Text style={styles.sidebarRole}>{doctorData.specialty}</Text>
              </>
            )}

            {/* Menu Section */}
            <View style={styles.menuContainer}>

              {/* Home */}
              <TouchableOpacity
                style={styles.menuItemActive}
                onPress={() => handleNavigation('DoctorDashboard')}
              >
                <Ionicons name="home" size={20} color={COLORS.primary} />
                <Text style={styles.menuTextActive}>Home</Text>
              </TouchableOpacity>

              {/* CLINICAL TOOLS Group */}
              <Text style={styles.sectionHeader}>CLINICAL TOOLS</Text>

              <TouchableOpacity style={styles.menuItem} onPress={handleLiveConsult}>
                <Ionicons name="mic-outline" size={20} color="#333" />
                <Text style={styles.menuText}>Live Consult</Text>
              </TouchableOpacity>

              {/* PRACTICE Group */}
              <Text style={styles.sectionHeader}>PRACTICE</Text>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigation('DoctorPatientDirectoryScreen')}
              >
                <Ionicons name="people-outline" size={20} color="#333" />
                <Text style={styles.menuText}>Patients</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigation('DoctorUploadScreen')}
              >
                <Ionicons name="document-text-outline" size={20} color="#333" />
                <Text style={styles.menuText}>Chart Review</Text>
              </TouchableOpacity>
            </View>

            {/* Footer (Settings & Sign Out) */}
            <View style={styles.sidebarFooter}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigation('DoctorSettingsScreen')}
              >
                <Ionicons name="settings-outline" size={20} color="#333" />
                <Text style={styles.menuText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={onSignOutClick}>
                <Ionicons name="log-out-outline" size={20} color="#333" />
                <Text style={styles.menuText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <SignOutModal
        visible={showSignOut}
        onCancel={() => setShowSignOut(false)}
        onConfirm={confirmSignOut}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, flexDirection: 'row' },
  modalTransparentLayer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },

  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '75%',
    backgroundColor: 'white',
    padding: 25,
    shadowColor: "#000",
    elevation: 10,
    zIndex: 1000
  },

  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 40, marginBottom: 15 },
  sidebarAvatar: { width: 55, height: 55, borderRadius: 27.5 },
  avatarPlaceholder: { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },

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