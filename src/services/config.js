import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Environment Configuration for SaraMedico App
 * 
 * Manages API base URLs and other environment-specific settings
 * Supports both local development and AWS deployed APIs
 */

/**
 * Get environment variable with fallback
 */
const getEnvVar = (key, defaultValue = '') => {
    return Constants.expoConfig?.extra?.[key] || process.env[key] || defaultValue;
};

/**
 * Determine the appropriate base URL based on environment and platform
 * 
 * Environment Control:
 * - Set API_ENVIRONMENT='aws' in .env to use AWS deployed API
 * - Set API_ENVIRONMENT='local' in .env to use local development API
 */
const getBaseUrl = () => {
    // Read environment configuration
    // Force local environment to fix caching issue
    const apiEnvironment = 'local'; // getEnvVar('API_ENVIRONMENT', 'local').toLowerCase();
    const awsApiUrl = getEnvVar('AWS_API_URL', 'http://65.0.98.170:8000');
    const localApiHost = getEnvVar('LOCAL_API_HOST', '10.0.2.2');
    const localApiPort = getEnvVar('LOCAL_API_PORT', '8000');

    let baseUrl;

    if (apiEnvironment === 'aws') {
        // Use AWS deployed API for all platforms
        baseUrl = `${awsApiUrl}/api/v1`;
        console.log('🌐 [API Config] Using AWS Deployed API');
    } else {
        // Use local development API with platform-specific handling
        console.log('💻 [API Config] Using Local Development API');

        if (Platform.OS === 'android') {
            // Android emulator uses 10.0.2.2 to access host machine's localhost
            baseUrl = `http://10.0.2.2:${localApiPort}/api/v1`;
            console.log('📱 [API Config] Platform: Android Emulator');
        } else if (Platform.OS === 'ios') {
            // iOS simulator can use localhost
            baseUrl = `http://${localApiHost}:${localApiPort}/api/v1`;
            console.log('📱 [API Config] Platform: iOS Simulator');
        } else {
            // For physical devices, use the local host IP (should be your machine's WiFi IP)
            baseUrl = `http://${localApiHost}:${localApiPort}/api/v1`;
            console.log('📱 [API Config] Platform: Physical Device/Web');
        }
    }

    console.log(`✅ [API Config] Base URL: ${baseUrl}`);
    console.log(`ℹ️  [API Config] To switch APIs, change API_ENVIRONMENT in .env file`);

    return baseUrl;
};

// API Configuration
export const API_CONFIG = {
    BASE_URL: getBaseUrl(),
    TIMEOUT: 30000, // 30 seconds
    HEADERS: {
        'Content-Type': 'application/json',
    },
};

// File Upload Configuration
export const UPLOAD_CONFIG = {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png', '.dicom', '.dcm'],
    CHUNK_SIZE: 1024 * 1024, // 1MB chunks for progress tracking
};

// Token Configuration
export const TOKEN_CONFIG = {
    ACCESS_TOKEN_KEY: 'userToken',
    REFRESH_TOKEN_KEY: 'refreshToken',
    USER_DATA_KEY: 'userData',
};

// Document Categories (matching backend enum)
export const DOCUMENT_CATEGORIES = {
    LAB_REPORT: 'LAB_REPORT',
    PRESCRIPTION: 'PRESCRIPTION',
    IMAGING: 'IMAGING',
    CONSULTATION_NOTES: 'CONSULTATION_NOTES',
    DISCHARGE_SUMMARY: 'DISCHARGE_SUMMARY',
    OTHER: 'OTHER',
};

// Appointment Status
export const APPOINTMENT_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// User Roles
export const USER_ROLES = {
    PATIENT: 'patient',
    DOCTOR: 'doctor',
    ADMIN: 'admin',
};

// AI Request Types
export const AI_REQUEST_TYPES = {
    DIAGNOSIS_ASSIST: 'diagnosis_assist',
    TREATMENT_RECOMMENDATION: 'treatment_recommendation',
    RISK_ASSESSMENT: 'risk_assessment',
};

export default API_CONFIG;
