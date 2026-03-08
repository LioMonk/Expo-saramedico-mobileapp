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
    const apiEnvironment = (getEnvVar('API_ENVIRONMENT') || 'local').toLowerCase();
    const awsApiUrl = getEnvVar('AWS_API_URL', 'http://107.20.98.130:8000');
    let localApiHost = getEnvVar('LOCAL_API_HOST', 'localhost');
    const localApiPort = getEnvVar('LOCAL_API_PORT', '8000');

    // Debug logging to see where values are coming from
    console.log(`🔍 [API Config] API_ENVIRONMENT: "${apiEnvironment}"`);

    let baseUrl;

    if (apiEnvironment === 'aws') {
        // Use AWS deployed API for all platforms
        baseUrl = `${awsApiUrl}/api/v1`;
        console.log('🌐 [API Config] Using AWS Deployed API');
    } else {
        // Use local development API
        // For Android, we prefer 10.0.2.2 as its computer alias if adb reverse hasn't been run.
        // However, 'adb reverse' is still better for MinIO signatures. 
        if (Platform.OS === 'android' && localApiHost === 'localhost') {
            console.log('📱 [API Config] Detected Android: Using 10.0.2.2 as host alias');
            localApiHost = '10.0.2.2';
        } else {
            console.log('💻 [API Config] Using Local Development API (Localhost Bridge)');
        }
        baseUrl = `http://${localApiHost}:${localApiPort}/api/v1`;
    }

    console.log(`✅ [API Config] Base URL: ${baseUrl}`);
    return baseUrl;
};

// API Configuration
export const API_CONFIG = {
    BASE_URL: getBaseUrl(),
    // Determine if we are in local development mode
    // We treat localhost, 127.0.0.1 and 10.0.2.2 (Android's localhost alias) as LOCAL.
    PUBLIC_HOST: (
        getBaseUrl().includes('localhost') ||
        getBaseUrl().includes('127.0.0.1') ||
        getBaseUrl().includes('10.0.2.2')
    ) ? 'localhost' : '107.20.98.130',
    API_PORT: (getEnvVar('LOCAL_API_PORT') || '8000'),
    MINIO_PORT: '9010',
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
