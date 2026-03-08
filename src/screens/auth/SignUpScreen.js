import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { CustomInput, CustomButton } from '../../components/CustomComponents';
import PhoneInput from '../../components/PhoneInput';
import PasswordStrengthIndicator from '../../components/PasswordStrengthIndicator';
import * as WebBrowser from 'expo-web-browser';
import { authAPI, storeTokens, API_BASE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enable warm-up for better UX
WebBrowser.maybeCompleteAuthSession();





export default function SignUpScreen({ navigation }) {
  const [organizationName, setOrganizationName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneE164, setPhoneE164] = useState(''); // E.164 format for backend
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('doctor');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);


  // Error states
  const [errors, setErrors] = useState({});

  // Handle Google OAuth callback
  React.useEffect(() => {
    // Listen for deep links (OAuth callback)
    const handleDeepLink = ({ url }) => {
      handleGoogleCallback(url);
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleGoogleCallback(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleSignUp = async () => {
    // Clear previous errors
    setErrors({});
    const newErrors = {};

    // Validation
    if (role === 'hospital') {
      if (!organizationName || !fullName || !email || !password) {
        if (!organizationName) newErrors.organizationName = 'Organization name is required';
        if (!fullName) newErrors.fullName = 'Admin name is required';
        if (!email) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';
        setErrors(newErrors);
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
    } else {
      if (!fullName || !email || !password || !confirmPassword) {
        if (!fullName) newErrors.fullName = 'Full name is required';
        if (!email) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';
        if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
        setErrors(newErrors);
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      setErrors(newErrors);
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (role !== 'hospital') {
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
        setErrors(newErrors);
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
    }

    if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      setErrors(newErrors);
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    // Removed explicit licenseNumber backend validation since it's no longer part of signup schema

    if (!isChecked) {
      Alert.alert('Error', 'Please agree to the Terms & Service and Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      // Debug logging
      console.log('Registration Data:', {
        email,
        fullName,
        role,
        phoneE164,
        organizationName
      });

      let response;
      if (role === 'hospital') {
        response = await authAPI.registerHospital(
          organizationName,
          fullName, // using fullName state for adminName
          email,
          phoneE164 || phone || null,
          password
        );
      } else {
        response = await authAPI.register(
          email,
          password,
          fullName,
          role,
          phoneE164 || null,
          organizationName || null,
          specialty || null,
          licenseNumber || null
        );
      }

      const { access_token, refresh_token, user } = response.data;
      await storeTokens(access_token, refresh_token, user);

      // Stored token successfully!

      Alert.alert(
        'Success',
        'Your account has been created successfully!',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Mark as first-time login for doctors
              // Direct to Doctor dashboard, bypassing onboarding
              if (user.role === 'doctor') {
                navigation.replace('DoctorFlow');
              } else if (user.role === 'hospital') {
                navigation.replace('HospitalFlow');
              } else if (user.role === 'patient') {
                navigation.replace('PatientFlow');
              } else {
                navigation.replace('AdminFlow');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      let errorMessage = 'Registration failed. Please try again.';

      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data) {
        // Handle validation errors
        const errors = error.response.data;
        if (typeof errors === 'object') {
          const errorMessages = Object.entries(errors)
            .map(([field, msgs]) => {
              const fieldName = field.replace(/_/g, ' ');
              const message = Array.isArray(msgs) ? msgs[0] : msgs;
              return `${fieldName}: ${message}`;
            })
            .join('\n');
          errorMessage = errorMessages || errorMessage;
        }
      }

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCallback = async (url) => {
    try {
      // Parse the URL to extract tokens
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const userDataStr = params.get('user');

      if (accessToken && refreshToken && userDataStr) {
        const user = JSON.parse(decodeURIComponent(userDataStr));

        // Store tokens and user data
        await storeTokens(accessToken, refreshToken, user);

        console.log('Google sign-up successful for role:', user.role);

        // Navigate based on user role
        if (user.role === 'admin') {
          navigation.replace('AdminFlow');
        } else if (user.role === 'doctor') {
          navigation.replace('DoctorFlow');
        } else if (user.role === 'hospital') {
          navigation.replace('HospitalFlow');
        } else {
          navigation.replace('PatientFlow');
        }
      }
    } catch (error) {
      console.error('Error handling Google callback:', error);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);

      // Construct the Google login URL
      const googleLoginUrl = `${API_BASE_URL}/api/v1/auth/google/login`;

      console.log('Opening Google sign-up:', googleLoginUrl);

      // Open the browser for Google OAuth
      const result = await WebBrowser.openAuthSessionAsync(
        googleLoginUrl,
        'exp://localhost:8081' // Expo development redirect URI
      );

      if (result.type === 'success' && result.url) {
        // Handle the callback URL
        await handleGoogleCallback(result.url);
      } else if (result.type === 'cancel') {
        Alert.alert('Cancelled', 'Google sign-up was cancelled');
      }
    } catch (error) {
      console.error('Google sign-up error:', error);
      Alert.alert('Error', 'Failed to sign up with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Logo Section - Matching Login */}
          <View style={styles.headerCenter}>
            <Image
              source={require('../../../assets/icon_new.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Tabs: Login / Sign Up */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={styles.inactiveTab}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.inactiveTabText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.activeTab}>
              <Text style={styles.activeTabText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Role Selector */}
          <View style={styles.dropdownWrapper}>
            <Text style={styles.label}>I am a</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setShowRolePicker(!showRolePicker)}
              accessibilityLabel="Select your role"
              accessibilityHint="Choose between doctor or hospital"
            >
              <Text style={styles.dropdownText}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
              <Ionicons name={showRolePicker ? "chevron-up" : "chevron-down"} size={20} color="#666" />
            </TouchableOpacity>
            {showRolePicker && (
              <View style={styles.dropdownList}>
                {['doctor', 'hospital'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={styles.dropdownItem}
                    onPress={() => { setRole(r); setShowRolePicker(false); }}
                  >
                    <Text style={styles.dropdownItemText}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <Text style={styles.helperText}>Role defines access to clinical features.</Text>

          {/* Doctor-specific fields removed as per request (specialty, license number) */}

          {(role === 'hospital' || role === 'doctor') && (
            <View>
              <Text style={styles.label}>
                {role === 'hospital' ? 'Organization Name *' : 'Organization Name (Optional)'}
              </Text>
              <CustomInput
                placeholder="Enter Hospital/Organization Name"
                icon="business-outline"
                value={organizationName}
                onChangeText={setOrganizationName}
                error={errors.organizationName}
                accessibilityLabel="Organization name input"
              />
              {errors.organizationName && <Text style={styles.errorText}>{errors.organizationName}</Text>}
            </View>
          )}

          {/* Full Name / Admin Name */}
          <Text style={styles.label}>{role === 'hospital' ? 'Admin Name *' : 'Full Name *'}</Text>
          <CustomInput
            placeholder="John Doe"
            icon="person-outline"
            value={fullName}
            onChangeText={setFullName}
            error={errors.fullName}
            autoComplete="name"
            textContentType="name"
            accessibilityLabel={role === 'hospital' ? "Admin name input" : "Full name input"}
          />

          {/* Work Email */}
          <Text style={styles.label}>Email *</Text>
          <CustomInput
            placeholder="your.email@example.com"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            accessibilityLabel="Email input"
          />

          {/* Phone Number */}
          <Text style={styles.label}>Phone</Text>
          <PhoneInput
            value={phone}
            onChangeText={setPhone}
            onChangeE164={setPhoneE164}
            error={errors.phone}
          />

          {/* Password */}
          <Text style={styles.label}>Password *</Text>

          {/* Password Rules - Visible Upfront */}
          <View style={styles.passwordRulesBox}>
            <Text style={styles.passwordRulesTitle}>Password must contain:</Text>
            <View style={styles.ruleItem}>
              <Ionicons
                name={password.length >= 8 ? "checkmark-circle" : "ellipse-outline"}
                size={16}
                color={password.length >= 8 ? "#34C759" : "#999"}
              />
              <Text style={styles.ruleText}>At least 8 characters</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons
                name={/[A-Z]/.test(password) ? "checkmark-circle" : "ellipse-outline"}
                size={16}
                color={/[A-Z]/.test(password) ? "#34C759" : "#999"}
              />
              <Text style={styles.ruleText}>One uppercase letter</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons
                name={/[0-9]/.test(password) ? "checkmark-circle" : "ellipse-outline"}
                size={16}
                color={/[0-9]/.test(password) ? "#34C759" : "#999"}
              />
              <Text style={styles.ruleText}>One number</Text>
            </View>
          </View>

          <CustomInput
            placeholder="••••••••••••"
            isPassword
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            autoComplete="password-new"
            textContentType="newPassword"
            accessibilityLabel="Password input"
          />

          {/* Password Strength Indicator */}
          <PasswordStrengthIndicator password={password} />

          {/* Confirm Password */}
          {role !== 'hospital' && (
            <>
              <Text style={styles.label}>Confirm Password *</Text>
              <CustomInput
                placeholder="••••••••••••"
                isPassword
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
                autoComplete="password-new"
                textContentType="newPassword"
                accessibilityLabel="Confirm password input"
              />

              {/* Password Match Indicator */}
              {confirmPassword && (
                <View style={styles.matchIndicator}>
                  <Ionicons
                    name={password === confirmPassword ? "checkmark-circle" : "close-circle"}
                    size={16}
                    color={password === confirmPassword ? "#34C759" : "#FF3B30"}
                  />
                  <Text style={[styles.matchText, { color: password === confirmPassword ? "#34C759" : "#FF3B30" }]}>
                    {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* HIPAA Compliance Note */}
          <View style={styles.hipaaNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
            <Text style={styles.hipaaText}>HIPAA compliant and secure</Text>
          </View>

          {/* Terms Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsChecked(!isChecked)}
            accessibilityLabel="Agree to terms and privacy policy"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isChecked }}
          >
            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
              {isChecked && <Ionicons name="checkmark" size={14} color="white" />}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the <Text style={styles.linkText}>Terms & Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Sign Up Button */}
          <CustomButton
            title={loading ? "Creating Account..." : "Sign Up"}
            onPress={handleSignUp}
            disabled={loading}
          />

          {/* Social Buttons */}
          <View style={{ marginTop: 20 }}>
            <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignUp}>
              <Ionicons name="logo-google" size={22} color="black" />
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9FF' },
  content: { padding: 25, paddingBottom: 40 },

  headerCenter: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  logo: { width: '100%', height: 60 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#F0F2F5', borderRadius: 30, padding: 4, marginBottom: 20 },
  activeTab: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5
  },
  inactiveTab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTabText: { fontWeight: 'bold', color: 'white', fontSize: 16 },
  inactiveTabText: { color: '#666', fontSize: 16 },

  label: { fontSize: 14, color: '#333', marginBottom: 8, marginTop: 10, fontWeight: '500' },
  helperText: { fontSize: 11, color: '#666', marginBottom: 10, marginTop: -5 },

  // Password Rules Box
  passwordRulesBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  passwordRulesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  ruleText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },

  // Password Match Indicator
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },

  // HIPAA Note
  hipaaNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5FF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  hipaaText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 8,
    fontWeight: '500',
  },

  // Dropdown Styles
  dropdownWrapper: { marginBottom: 5, zIndex: 2000, elevation: 2000, position: 'relative' },
  dropdownTrigger: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'white', borderWidth: 1, borderColor: '#E8E8E8',
    borderRadius: 12, paddingHorizontal: 15, height: 55, marginBottom: 15,
  },
  dropdownText: { fontSize: 16, color: '#333' },
  dropdownList: {
    position: 'absolute', top: 60, left: 0, right: 0,
    backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#eee',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 5, elevation: 5, maxHeight: 250,
  },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownItemText: { fontSize: 16, color: '#333' },
  customOption: { borderBottomWidth: 0, borderTopWidth: 2, borderTopColor: '#E0E0E0' },
  customOptionText: { color: COLORS.primary, fontWeight: '600' },

  // Picker Styles
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  pickerDropdown: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginTop: -5,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  pickerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerItemText: {
    fontSize: 15,
    color: '#333',
  },
  errorText: {
    color: COLORS.error || '#FF3B30',
    fontSize: 12,
    marginTop: -5,
    marginBottom: 10,
    marginLeft: 5,
  },

  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#ccc', borderRadius: 5, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxText: { fontSize: 13, color: '#666', flex: 1, lineHeight: 18 },
  linkText: { color: COLORS.primary, fontWeight: '600' },

  // Social Buttons
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 55,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  socialBtnText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
});