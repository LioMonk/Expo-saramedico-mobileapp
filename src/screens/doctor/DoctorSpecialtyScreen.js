import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { CustomButton } from '../../components/CustomComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData } from '../../services/api';

const SPECIALTIES = [
  { id: 'card', name: 'Cardiology', icon: 'heart' },
  { id: 'pedi', name: 'Pediatrics', icon: 'happy' },
  { id: 'derm', name: 'Dermatology', icon: 'water' },
  { id: 'neur', name: 'Neurology', icon: 'fitness' },
  { id: 'radi', name: 'Radiology', icon: 'man' },
  { id: 'gene', name: 'General Physician', icon: 'medkit' },
  { id: 'orth', name: 'Orthopedics', icon: 'fitness-outline' },
  { id: 'psyc', name: 'Psychiatry', icon: 'brain-outline' },
  { id: 'inte', name: 'Internal Medicine', icon: 'body-outline' },
];



export default function DoctorSpecialtyScreen({ navigation }) {
  const [selectedId, setSelectedId] = useState(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadSavedSpecialty = async () => {
      try {
        const userData = await getUserData();
        if (userData && userData.specialty) {
          const specialtyName = userData.specialty;
          // Find matching specialty in our list
          const match = SPECIALTIES.find(s =>
            s.name.toLowerCase() === specialtyName.toLowerCase() ||
            (specialtyName.toLowerCase() === 'general practice' && s.id === 'gene')
          );

          if (match) {
            setSelectedId(match.id);
          } else {
            // If not found in list, show in custom input
            setShowCustomInput(true);
            setCustomSpecialty(specialtyName);
          }
        } else {
          // Default to Cardiology if nothing found (existing behavior)
          setSelectedId('card');
        }
      } catch (error) {
        console.log('Error loading specialty:', error);
        setSelectedId('card');
      }
    };

    loadSavedSpecialty();
  }, []);

  const handleContinue = () => {
    navigation.navigate('DoctorMicrophoneTestScreen');
  };

  const filteredSpecialties = SPECIALTIES.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Header: Back + Progress Bar */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: '30%' }]} />
          </View>
        </View>

        <Text style={styles.title}>Choose your Speciality</Text>
        <Text style={styles.subtitle}>We'll tailor the platform according to your specialty.</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            placeholder="Search speciality (e.g. Neurology)"
            placeholderTextColor="#999"
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* All Specialties List */}
        <Text style={styles.sectionLabel}>All Specialties</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {filteredSpecialties.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, isSelected && styles.cardActive]}
                onPress={() => {
                  setSelectedId(item.id);
                  setShowCustomInput(false);
                }}
                activeOpacity={0.9}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.iconBox}>
                    <Ionicons name={item.icon} size={20} color={isSelected ? COLORS.primary : "#555"} />
                  </View>
                  <Text style={[styles.cardTitle, isSelected && styles.cardTitleActive]}>{item.name}</Text>
                </View>

                {/* Radio Button Logic */}
                <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Custom Specialty Option */}
          <TouchableOpacity
            style={[styles.card, (showCustomInput || (selectedId === null && !SPECIALTIES.find(s => s.id === selectedId))) && styles.cardActive, styles.customCard]}
            onPress={() => {
              setShowCustomInput(true);
              setSelectedId(null);
            }}
            activeOpacity={0.9}
          >
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.cardTitle, showCustomInput && styles.cardTitleActive]}>I don't see my specialty</Text>
            </View>
            <View style={[styles.radioOuter, showCustomInput && styles.radioOuterActive]}>
              {showCustomInput && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Custom Input Field */}
          {showCustomInput && (
            <View style={styles.customInputContainer}>
              <Text style={styles.customInputLabel}>Enter your specialty:</Text>
              <TextInput
                style={styles.customInput}
                placeholder="e.g., Oncology, Endocrinology"
                placeholderTextColor="#999"
                value={customSpecialty}
                onChangeText={setCustomSpecialty}
                autoFocus={true}
              />
            </View>
          )}

          <View style={{ height: 150 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <CustomButton title="Continue" onPress={handleContinue} />
          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 15 }}
            onPress={() => {
              setShowCustomInput(true);
              setSelectedId(null);
            }}
          >
            <Text style={{ color: '#999', fontSize: 13 }}>I don't see my speciality</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { flex: 1, padding: 25 },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  progressBarTrack: { flex: 1, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, marginLeft: 20 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },

  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 20 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE', borderRadius: 12, paddingHorizontal: 15, height: 50, marginBottom: 25 },
  input: { flex: 1, marginLeft: 10, fontSize: 15 },

  sectionLabel: { fontSize: 14, color: '#999', marginBottom: 15 },
  chipRow: { flexDirection: 'row', marginBottom: 25 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: '#EEE', borderRadius: 20, marginRight: 10 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: '#333', fontSize: 13 },
  chipTextActive: { color: 'white', fontSize: 13, fontWeight: '600' },

  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#EEE', marginBottom: 12 },
  cardActive: { borderColor: COLORS.primary, borderWidth: 1.5 },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, backgroundColor: '#F5F5F5', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardTitle: { fontSize: 16, fontWeight: '500', color: '#333' },
  cardTitleActive: { fontWeight: 'bold', color: '#1A1A1A' },

  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  radioOuterActive: { borderColor: COLORS.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },

  customCard: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: '#F0F8FF' },
  customInputContainer: {
    marginTop: 10,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  customInputLabel: { fontSize: 14, color: '#666', marginBottom: 10, fontWeight: '500' },
  customInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white'
  },

  footer: { position: 'absolute', bottom: 30, left: 25, right: 25 }
});