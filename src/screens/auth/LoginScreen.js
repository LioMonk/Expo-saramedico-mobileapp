import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { CustomInput, CustomButton } from '../../components/CustomComponents';
import * as WebBrowser from 'expo-web-browser';

import { authAPI, storeTokens, API_BASE_URL } from '../../services/api';
import AuthService from '../../services/authService';
import { Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enable warm-up for better UX
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'connected', 'error'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Check backend connection on mount
  React.useEffect(() => {
    checkConnection();

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

  const checkConnection = async () => {
    try {
      setBackendStatus('checking');
      // Pinging the 'me' endpoint (will return 401 but confirms connectivity)
      await authAPI.getCurrentUser().catch(err => {
        if (err.response) return err.response;
        throw err;
      });
      setBackendStatus('connected');
    } catch (error) {
      if (error.response) {
        // Any response (even 401) means the server is UP
        setBackendStatus('connected');
      } else {
        setBackendStatus('error');
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // Centralized auth service handles token storage + role routing
      const { user, navTarget } = await AuthService.login(email, password);

      console.log('[Auth] Login successful for role:', user.role);
      navigation.replace(navTarget);
    } catch (error) {
      console.error('[Auth] Login error:', error);

      let errorMessage = 'Login failed. Please check your credentials.';
      const detail = error.response?.data?.detail;
      const status = error.response?.status;

      if (detail) {
        errorMessage = detail;
      } else if (status === 401) {
        errorMessage = 'Incorrect email or password.';
      } else if (status === 403) {
        errorMessage = 'Account suspended or inactive. Please contact support.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      Alert.alert('Login Failed', errorMessage);
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

        console.log('Google login successful for role:', user.role);

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

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      // Construct the Google login URL
      const googleLoginUrl = `${API_BASE_URL}/api/v1/auth/google/login`;

      console.log('Opening Google login:', googleLoginUrl);

      // Open the browser for Google OAuth
      const result = await WebBrowser.openAuthSessionAsync(
        googleLoginUrl,
        'exp://localhost:8081' // Expo development redirect URI
      );

      if (result.type === 'success' && result.url) {
        // Handle the callback URL
        await handleGoogleCallback(result.url);
      } else if (result.type === 'cancel') {
        Alert.alert('Cancelled', 'Google sign-in was cancelled');
      }
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setLoading(true);
      Alert.alert(
        'Apple Login',
        'Apple Sign-In integration requires:\n\n1. Apple Developer account\n2. expo-apple-authentication\n3. Backend endpoint: POST /api/v1/auth/apple\n\nPlease configure these to enable Apple login.',
        [
          {
            text: 'OK',
            onPress: () => console.log('Apple login info acknowledged'),
          },
        ]
      );
    } catch (error) {
      console.error('Apple login error:', error);
      Alert.alert('Error', 'Apple login is not configured yet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Logo Section */}
        <View style={styles.headerCenter}>
          <Image
            source={require('../../../assets/icon_new.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={styles.activeTab}>
            <Text style={styles.activeTabText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inactiveTab}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.inactiveTabText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Inputs */}
        <Text style={styles.label}>Work Email</Text>
        <CustomInput
          placeholder="dr.name@hospital.org"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          accessibilityLabel="Email input"
        />

        <Text style={styles.label}>Password</Text>
        <CustomInput
          placeholder="••••••••••••"
          isPassword
          icon="key-outline"
          value={password}
          onChangeText={setPassword}
          autoComplete="password"
          textContentType="password"
          accessibilityLabel="Password input"
        />

        {/* Forgot Password Link */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: 5, padding: 5 }}
        >
          <Text style={styles.forgotPassText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <CustomButton
          title={loading ? "Logging in..." : "Login"}
          onPress={handleLogin}
          disabled={loading}
        />

        {/* Social Buttons */}
        <View style={{ marginTop: 20 }}>
          <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin}>
            <Ionicons name="logo-apple" size={22} color="black" />
            <Text style={styles.socialBtnText}>Continue with Apple ID</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
            <Ionicons name="logo-google" size={22} color="black" />
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9FF' },
  content: { padding: 25, flex: 1, justifyContent: 'center' },

  headerCenter: { alignItems: 'center', marginBottom: 30 },
  logo: { width: '100%', height: 60 },

  // Tabs
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

  // Status Indicator
  statusIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, borderWidth: 1, borderColor: '#eee' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 12, color: '#666', fontWeight: '500' },



  // Footer Links & Socials
  forgotPassText: { color: '#444', fontSize: 14 },
  socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 55, borderRadius: 30, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: 'white', marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  socialBtnText: { marginLeft: 10, fontSize: 16, fontWeight: '600', color: '#333' }
});