import React, { useState } from 'react';
import {
   View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { doctorAPI } from '../../services/api';
import { CustomButton } from '../../components/CustomComponents';

export default function DoctorPostVisitScreen({ navigation, route }) {
   const { patient, patientId, patientName, visit, mode, showSoap } = route.params || {};
   const [loading, setLoading] = useState(false);

   // SOAP States
   const [subjective, setSubjective] = useState(visit?.notes || '');
   const [objective, setObjective] = useState('');
   const [assessment, setAssessment] = useState(visit?.visit_type || '');
   const [plan, setPlan] = useState('');

   const handleSave = async () => {
      const id = patientId || patient?.id;
      if (!id) {
         Alert.alert('Error', 'Patient identification missing');
         return;
      }

      setLoading(true);
      try {
         const soapData = {
            visit_type: assessment || 'Consultation',
            notes: `SUBJECTIVE: ${subjective}\nOBJECTIVE: ${objective}\nASSESSMENT: ${assessment}\nPLAN: ${plan}`,
            reason: subjective.substring(0, 50),
            description: assessment
         };

         await doctorAPI.createRecord(id, soapData);
         Alert.alert('Success', 'Visit notes saved successfully', [
            { text: 'OK', onPress: () => navigation.goBack() }
         ]);
      } catch (error) {
         console.error('Save record error:', error);
         Alert.alert('Error', 'Failed to save visit record');
      } finally {
         setLoading(false);
      }
   };

   return (
      <SafeAreaView style={styles.container}>
         <View style={styles.content}>

            {/* Header */}
            <View style={styles.header}>
               <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color="#333" />
               </TouchableOpacity>
               <Text style={styles.headerTitle}>{showSoap || mode === 'manual' ? 'Visit Notes (SOAP)' : 'Visit Details'}</Text>
               <TouchableOpacity onPress={handleSave} disabled={loading}>
                  {loading ? (
                     <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                     <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Save</Text>
                  )}
               </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

               {/* Patient Info Header */}
               <View style={styles.patientRow}>
                  <View style={styles.avatarPlaceholder}>
                     <Ionicons name="person" size={24} color="#666" />
                  </View>
                  <View>
                     <Text style={styles.patientName}>{patientName || patient?.full_name || patient?.name || 'Patient'}</Text>
                     <Text style={styles.patientDetails}>MRN: {patient?.mrn || 'N/A'}</Text>
                  </View>
               </View>

               {/* SOAP Note Sections */}
               <View style={styles.formSection}>
                  <Text style={styles.sectionLabel}>SUBJECTIVE</Text>
                  <TextInput
                     style={[styles.input, { height: 100 }]}
                     multiline
                     placeholder="Chief complaint & patient history..."
                     value={subjective}
                     onChangeText={setSubjective}
                  />
               </View>

               <View style={styles.formSection}>
                  <Text style={styles.sectionLabel}>OBJECTIVE</Text>
                  <TextInput
                     style={[styles.input, { height: 100 }]}
                     multiline
                     placeholder="Physical findings & vital signs..."
                     value={objective}
                     onChangeText={setObjective}
                  />
               </View>

               <View style={styles.formSection}>
                  <Text style={styles.sectionLabel}>ASSESSMENT</Text>
                  <TextInput
                     style={[styles.input, { height: 80 }]}
                     multiline
                     placeholder="Diagnosis & differential..."
                     value={assessment}
                     onChangeText={setAssessment}
                  />
               </View>

               <View style={styles.formSection}>
                  <Text style={styles.sectionLabel}>PLAN</Text>
                  <TextInput
                     style={[styles.input, { height: 120 }]}
                     multiline
                     placeholder="Treatment, labs & follow-up..."
                     value={plan}
                     onChangeText={setPlan}
                  />
               </View>

               <CustomButton
                  title={loading ? "Saving..." : "Complete Visit"}
                  onPress={handleSave}
                  style={{ marginTop: 20 }}
                  disabled={loading}
               />

            </ScrollView>
         </View>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: '#F9FAFC' },
   content: { flex: 1, padding: 20 },
   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
   headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
   patientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
   avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
   patientName: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
   patientDetails: { fontSize: 14, color: '#666' },
   formSection: { marginBottom: 20 },
   sectionLabel: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
   input: { backgroundColor: 'white', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#EEE', textAlignVertical: 'top', color: '#333' }
});