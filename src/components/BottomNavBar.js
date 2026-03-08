import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export default function PatientBottomNavBar({ navigation, activeTab }) {

  const handleNav = (screen) => {
    if (activeTab !== screen) {
      if (screen === 'Dashboard') navigation.navigate('PatientDashboard');
      if (screen === 'Medical Records') navigation.navigate('Medical Records');
      if (screen === 'Appointments') navigation.navigate('Appointments');
      // Link to Settings Screen
      if (screen === 'Profile') navigation.navigate('Profile');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <NavIcon name="home" label="Dashboard" isActive={activeTab === 'Dashboard'} onPress={() => handleNav('Dashboard')} />
        <NavIcon name="folder-open" label="Medical Records" isActive={activeTab === 'Medical Records'} onPress={() => handleNav('Medical Records')} />
        <NavIcon name="calendar" label="Appointments" isActive={activeTab === 'Appointments'} onPress={() => handleNav('Appointments')} />
        <NavIcon name="settings" label="Profile" isActive={activeTab === 'Profile'} onPress={() => handleNav('Profile')} />
      </View>
    </View>
  );
}

const NavIcon = ({ name, label, isActive, onPress }) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress}>
    <Ionicons
      name={isActive ? name : `${name}-outline`}
      size={24}
      color={isActive ? COLORS.primary : '#999'}
    />
    <Text style={[styles.navLabel, { color: isActive ? COLORS.primary : '#999' }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    height: 70, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0',
    paddingBottom: 10
  },
  navItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
  navLabel: { fontSize: 10, marginTop: 4, fontWeight: '500' },
});