import React, { useState } from 'react';
import {
   View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { CustomButton } from '../../components/CustomComponents';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';

const GENDERS = ['Male', 'Female', 'Other'];

export default function DoctorAddPatientScreen({ navigation, route }) {
   const [fullName, setFullName] = useState('');
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [phone, setPhone] = useState('');
   const [dateOfBirth, setDateOfBirth] = useState(new Date());
   const [showDatePicker, setShowDatePicker] = useState(false);
   const [gender, setGender] = useState('');
   const [showGenderDropdown, setShowGenderDropdown] = useState(false);
   const [address, setAddress] = useState('');
   const [medicalHistory, setMedicalHistory] = useState('');
   const [loading, setLoading] = useState(false);

   const calculateAge = (dob) => {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
         age--;
      }
      return age;
   };

   const formatDate = (date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
   };

   const handleDateChange = (event, selectedDate) => {
      setShowDatePicker(Platform.OS === 'ios');
      if (selectedDate) {
         setDateOfBirth(selectedDate);
      }
   };

   const handleSave = async () => {
      // Validation
      if (!fullName || !email || !password || !gender || !dateOfBirth) {
         Alert.alert('Error', 'Please fill in all required fields (Name, Email, Password, Gender, DOB)');
         return;
      }

      if (password.length < 8) {
         Alert.alert('Error', 'Password must be at least 8 characters long');
         return;
      }

      setLoading(true);
      try {
         // Create patient via backend with user account
         // API Endpoint: /api/v1/patients (POST)
         const response = await api.post('/patients', {
            full_name: fullName,
            email: email,
            password: password,
            phone_number: phone,
            date_of_birth: dateOfBirth.toISOString().split('T')[0],
            gender: gender.toLowerCase(),
            address: { street: address }, // Backend expects AddressSchema object
            medical_history: medicalHistory,
         });

         Alert.alert(
            'Success',
            `Patient ${fullName} created successfully!\n\nLogin Credentials:\nEmail: ${email}\nPassword: ${password}\n\nMRN: ${response.data.mrn}`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
         );
      } catch (error) {
         console.error('Error adding patient:', error);
         const errorDetail = error.response?.data?.detail;
         const errorMessage = typeof errorDetail === 'object'
            ? JSON.stringify(errorDetail)
            : (errorDetail || 'Failed to add patient. Please try again.');

         Alert.alert('Error', errorMessage);
      } finally {
         setLoading(false);
      }
   };

   const age = dateOfBirth ? calculateAge(dateOfBirth) : 0;

   return (
      <SafeAreaView style={styles.container}>
         <View style={styles.content}>

            {/* Header */}
            <View style={styles.header}>
               <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color="#333" />
               </TouchableOpacity>
               <Text style={styles.headerTitle}>Add New Patient</Text>
               <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.cancelText}>Cancel</Text>
               </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

               {/* Photo Upload */}
               <View style={styles.photoContainer}>
                  <View style={styles.photoCircle}>
                     <Ionicons name="person" size={40} color="#999" />
                     <View style={styles.editBadge}>
                        <Ionicons name="camera" size={14} color="white" />
                     </View>
                  </View>
               </View>

               {/* Form Fields */}
               <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>

               <Text style={styles.label}>Full Name *</Text>
               <TextInput
                  placeholder="Enter patient full name"
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
               />

               <Text style={styles.label}>Email Address *</Text>
               <TextInput
                  placeholder="patient@example.com"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
               />

               <Text style={styles.label}>Password *</Text>
               <TextInput
                  placeholder="Set login password for patient"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
               />

               <Text style={styles.label}>Phone Number</Text>
               <TextInput
                  placeholder="+1-555-0123"
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
               />

               <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                     <Text style={styles.label}>Date of Birth *</Text>
                     <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowDatePicker(true)}
                     >
                        <Text style={{ color: '#333' }}>{formatDate(dateOfBirth)}</Text>
                        <Ionicons name="calendar-outline" size={18} color="#999" />
                     </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                     <Text style={styles.label}>Age</Text>
                     <View style={styles.dateInput}>
                        <Text style={{ color: '#333', fontWeight: '600' }}>{age} years</Text>
                     </View>
                  </View>
               </View>

               {showDatePicker && (
                  <DateTimePicker
                     value={dateOfBirth}
                     mode="date"
                     display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                     onChange={handleDateChange}
                     maximumDate={new Date()}
                  />
               )}

               <Text style={styles.label}>Gender *</Text>
               <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowGenderDropdown(true)}
               >
                  <Text style={{ color: gender ? '#333' : '#999' }}>
                     {gender || 'Select gender'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#999" />
               </TouchableOpacity>

               <Text style={[styles.sectionLabel, { marginTop: 25 }]}>ADDITIONAL INFORMATION</Text>

               <Text style={styles.label}>Address</Text>
               <TextInput
                  placeholder="Street address, city, state, ZIP"
                  style={[styles.input, { height: 60 }]}
                  value={address}
                  onChangeText={setAddress}
                  multiline
               />

               <Text style={styles.label}>Medical History</Text>
               <TextInput
                  placeholder="Previous conditions, allergies, medications..."
                  style={[styles.input, { height: 80 }]}
                  value={medicalHistory}
                  onChangeText={setMedicalHistory}
                  multiline
               />

               <View style={{ height: 100 }} />
            </ScrollView>

            {/* Gender Dropdown Modal */}
            <Modal
               visible={showGenderDropdown}
               transparent
               animationType="slide"
               onRequestClose={() => setShowGenderDropdown(false)}
            >
               <View style={styles.modalOverlay}>
                  <TouchableOpacity
                     style={styles.modalBackdrop}
                     onPress={() => setShowGenderDropdown(false)}
                  />
                  <View style={styles.modalContent}>
                     <Text style={styles.modalTitle}>Select Gender</Text>
                     {GENDERS.map((g) => (
                        <TouchableOpacity
                           key={g}
                           style={styles.genderOption}
                           onPress={() => {
                              setGender(g);
                              setShowGenderDropdown(false);
                           }}
                        >
                           <Text style={styles.genderText}>{g}</Text>
                           {gender === g && (
                              <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                           )}
                        </TouchableOpacity>
                     ))}
                     <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setShowGenderDropdown(false)}
                     >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                     </TouchableOpacity>
                  </View>
               </View>
            </Modal>

            {/* Footer Button */}
            <View style={styles.footer}>
               <CustomButton
                  title={loading ? 'Saving...' : 'Save Patient'}
                  onPress={handleSave}
                  disabled={loading}
               />
            </View>

         </View>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: '#F9FAFC' },
   content: { flex: 1, padding: 20 },

   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
   headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
   cancelText: { color: COLORS.primary, fontWeight: '600' },

   photoContainer: { alignItems: 'center', marginBottom: 30 },
   photoCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F0F2F5', justifyContent: 'center', alignItems: 'center', position: 'relative' },
   editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },

   sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 15, letterSpacing: 0.5 },
   label: { fontSize: 13, color: '#333', marginBottom: 8, fontWeight: '500' },

   input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#EEE', borderRadius: 8, paddingHorizontal: 15, height: 48, marginBottom: 20 },

   row: { flexDirection: 'row' },
   dateInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#EEE', borderRadius: 8, paddingHorizontal: 15, height: 48, marginBottom: 20 },

   footer: { position: 'absolute', bottom: 20, left: 20, right: 20 },

   modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
   modalBackdrop: { flex: 1 },
   modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
   modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
   genderOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
   genderText: { fontSize: 16, color: '#333' },
   cancelBtn: { marginTop: 15, padding: 15, alignItems: 'center' },
   cancelBtnText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' }
});