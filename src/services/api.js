import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, TOKEN_CONFIG } from './config';
import ErrorHandler from './errorHandler';
import FileUploadService from './fileUpload';

// Create axios instance with configuration
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

// Request interceptor: Add token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const errorInfo = ErrorHandler.handleError(error);

    // Auto-logout on authentication errors
    if (errorInfo.shouldLogout) {
      await ErrorHandler.handleLogout();
    }

    return Promise.reject(error);
  }
);

// ==================== AUTHENTICATION API ====================

export const authAPI = {
  // POST /auth/register - Enhanced to support doctor registration
  register: (email, password, fullName, role, phoneNumber = null, specialty = null, licenseNumber = null) => {
    const [firstName, ...lastNameParts] = fullName.trim().split(' ');
    const lastName = lastNameParts.join(' ') || 'User';

    const payload = {
      email,
      password,
      confirm_password: password, // Backend expects this
      first_name: firstName,
      last_name: lastName,
      role, // 'patient', 'doctor', 'admin', 'hospital'
      phone_number: phoneNumber,
    };

    // Add doctor-specific fields only if role is doctor
    if (role === 'doctor') {
      if (specialty) payload.specialty = specialty;
      if (licenseNumber) payload.license_number = licenseNumber;
    }

    return api.post('/auth/register', payload);
  },

  // POST /auth/login
  login: (email, password) => api.post('/auth/login', { email, password }),

  // GET /auth/me
  getCurrentUser: () => api.get('/auth/me'),

  // POST /auth/verify-email
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),

  // POST /auth/forgot-password
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),

  // POST /auth/reset-password
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', {
    token,
    new_password: newPassword
  }),

  // POST /auth/refresh
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),

  // POST /auth/logout
  logout: async (refreshToken) => {
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      await AsyncStorage.multiRemove([
        TOKEN_CONFIG.ACCESS_TOKEN_KEY,
        TOKEN_CONFIG.REFRESH_TOKEN_KEY,
        TOKEN_CONFIG.USER_DATA_KEY,
      ]);
    }
  },

  // MFA endpoints
  setupMFA: () => api.post('/auth/mfa/setup'),
  verifyMFASetup: (code) => api.post('/auth/mfa/verify-setup', { code }),
  verifyMFA: (sessionId, code) => api.post('/auth/mfa/verify', { session_id: sessionId, code }),
  disableMFA: () => api.post('/auth/mfa/disable'),

  // POST /auth/change-password
  changePassword: (oldPassword, newPassword) => api.post('/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword
  }),
};

// ==================== PATIENT API ====================

export const patientAPI = {
  // GET /patients/me - Get current patient profile
  getProfile: () => api.get('/patients/me'),

  // PATCH /patients/me - Update patient profile
  updateProfile: (data) => api.patch('/patients/me', data),

  // GET /consultations - Get patient consultation history
  getMyConsultations: (limit = 10) => api.get('/consultations', {
    params: { limit }
  }),

  // GET /doctors/search?specialty=...&query=...
  searchDoctors: (params) => api.get('/doctors/search', { params }),

  // POST /patient/medical-history (File Upload)
  uploadMedicalHistory: (file, category, title, description, onProgress) => {
    const formData = FileUploadService.prepareFormData(file, {
      category,
      title,
      description,
    });

    const config = FileUploadService.createUploadConfig(onProgress);

    return api.post('/patient/medical-history', formData, config);
  },

  // GET /appointments/patient-appointments (Patient View)
  getMyAppointments: () => api.get('/appointments/patient-appointments'),

  // POST /appointments/request (Create appointment request) - FIXED to match backend
  requestAppointment: (data) => api.post('/appointments', data),

  // GET /appointments/patient-appointments - List all patient appointments
  getAppointments: () => api.get('/appointments/patient-appointments'),

  // GET /appointments/{id} - Get single appointment
  getAppointment: (appointmentId) => api.get(`/appointments/${appointmentId}`),

  // GET /patient/documents
  getMyDocuments: () => api.get('/patient/documents'),

  // DELETE /patient/documents/{id}
  deleteDocument: (documentId) => api.delete(`/patient/documents/${documentId}`),
};

// ==================== DOCTOR API ====================

export const doctorAPI = {
  // PATCH /doctor/profile
  updateProfile: (data) => api.patch('/doctor/profile', data),

  // GET /doctor/patients (supports search param)
  getPatients: () => api.get('/doctor/patients'),

  // GET /doctors (All doctors for admin/patient directory)
  getAllDoctors: () => api.get('/doctors/directory'),

  // Search patients by name
  searchPatients: (query) => api.get('/doctor/patients', { params: { search: query } }),

  // GET /doctor/appointments?status=...
  getAppointments: (status) => api.get('/doctor/appointments', {
    params: status ? { status } : {}
  }),

  // GET /doctor/schedule/next
  getNextAppointment: () => api.get('/doctor/schedule/next'),

  // GET /doctor/activity
  getActivityFeed: () => api.get('/doctor/activity'),

  // POST /appointments/{id}/approve (Generates Zoom Link)
  approveAppointment: (id, data) => api.post(`/appointments/${id}/approve`, data),

  // POST /appointments/instant (Create instant appointment with Zoom)
  createInstantAppointment: (patientId) => api.post('/appointments', {
    doctor_id: "SELF",
    requested_date: new Date().toISOString(),
    reason: "Instant Consultation",
    patient_id: patientId
  }),

  // PATCH /appointments/{id}/status (Accept/Reject)
  updateAppointmentStatus: (id, status, notes) => api.patch(`/appointments/${id}/status`, {
    status,
    doctor_notes: notes,
  }),

  // GET /documents (with patient filter)
  getPatientDocuments: (patientId) => api.get(`/doctor/patients/${patientId}/documents`),

  // Task Management - /doctor/tasks
  createTask: (data) => api.post('/doctor/tasks', data),
  getTasks: () => api.get('/doctor/tasks'),
  updateTask: (id, data) => api.patch(`/doctor/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/doctor/tasks/${id}`),

  // Dashboard/Analytics (Optional)
  getDashboardStats: () => api.get('/doctor/me/dashboard'),
  getUpcomingAppointments: () => api.get('/doctor/schedule/next'),

  // Doctor Records
  createRecord: (patientId, data) => api.post('/doctor/records', {
    patient_id: patientId,
    ...data
  }),
  getRecords: (patientId) => api.get('/consultations', {
    params: { patient_id: patientId }
  }),
  updateRecord: (recordId, data) => api.patch(`/doctor/records/${recordId}`, data),

  // Documents - /documents
  requestUploadUrl: (patientId, fileName, fileType, fileSize) => api.post('/documents/upload-url', {
    patientId,
    fileName,
    fileType,
    fileSize
  }),
  confirmUpload: (documentId, metadata = {}) => api.post(`/documents/${documentId}/confirm`, { metadata }),
  analyzeDocument: (documentId) => api.post(`/documents/${documentId}/analyze`),
  getDocuments: () => api.get('/documents'),
  getDocument: (documentId) => api.get(`/documents/${documentId}`),
  deleteDocument: (documentId) => api.delete(`/documents/${documentId}`),

  // Search endpoints
  searchAll: async (query) => {
    try {
      const [doctorsRes, patientsRes] = await Promise.all([
        api.get('/doctors/search', { params: { query } }).catch(() => ({ data: { results: [] } })),
        api.get('/doctor/patients', { params: { search: query } }).catch(() => ({ data: [] }))
      ]);
      return {
        data: {
          doctors: doctorsRes.data?.results || [],
          patients: Array.isArray(patientsRes.data) ? patientsRes.data : [],
          documents: []
        }
      };
    } catch (error) {
      console.error('Search all error:', error);
      return { data: { doctors: [], patients: [], documents: [] } };
    }
  },
  searchPatients: (query) => api.get('/doctor/patients', { params: { search: query } }),
  searchDoctors: (query) => api.get('/doctors/search', { params: { query } }),
  searchDocuments: (query) => api.get('/documents', { params: { search: query } }),
};

// ==================== CONSULTATION API ====================

export const consultationAPI = {
  // POST /consultations
  createConsultation: (data) => api.post('/consultations', data),

  // GET /consultations/{id}
  getConsultation: (id) => api.get(`/consultations/${id}`),

  // PATCH /consultations/{id}
  updateConsultation: (id, data) => api.patch(`/consultations/${id}`, data),

  // GET /consultations (list)
  getConsultations: (params) => api.get('/consultations', { params }),

  // POST /consultations/{id}/notes
  addConsultationNote: (id, note) => api.post(`/consultations/${id}/notes`, { note }),
};

// ==================== APPOINTMENT API ====================

export const appointmentAPI = {
  // POST /appointments - Create appointment
  createAppointment: (data) => api.post('/appointments', data),

  // GET /appointments/patient-appointments - Get patient appointments
  getPatientAppointments: (patientId) => api.get('/appointments/patient-appointments', {
    params: { patient_id: patientId }
  }),

  // PATCH /appointments/{appointment_id}/status - Update appointment status
  updateAppointmentStatus: (appointmentId, status) => api.patch(`/appointments/${appointmentId}/status`, {
    status
  }),

  // POST /appointments/request - Request appointment
  requestAppointment: (data) => api.post('/appointments', data),

  // POST /appointments/{appointment_id}/approve - Approve appointment
  approveAppointment: (appointmentId) => api.post(`/appointments/${appointmentId}/approve`),
};

// ==================== ZOOM INTEGRATION ========================

// ==================== AI INTEGRATION ========================

export const aiAPI = {
  // POST /doctor/ai/contribute
  contributeToAI: (patientId, dataPayload, requestType = 'diagnosis_assist') =>
    api.post('/doctor/ai/contribute', {
      patient_id: patientId,
      data_payload: dataPayload,
      request_type: requestType,
    }),

  // GET /doctor/ai/queue (if implemented)
  getAIQueue: () => api.get('/doctor/ai/queue'),

  // GET /doctor/ai/results/{queueId} (if implemented)
  getAIResult: (queueId) => api.get(`/doctor/ai/results/${queueId}`),
};

// ==================== AI CHAT API ========================

export const aiChatAPI = {
  // POST /api/v1/doctor/ai/chat/patient - Chat about a specific patient
  chatAboutPatient: (patientId, message) => api.post('/doctor/ai/chat/patient', {
    patient_id: patientId,
    query: message
  }),

  // POST /api/v1/doctor/ai/chat/doctor - General AI chat for doctors
  chatWithAI: (message, conversationId) => api.post('/doctor/ai/chat/doctor', {
    query: message,
    conversation_id: conversationId
  }),

  // GET /api/v1/doctor/ai/chat-history/patient - Get patient-specific chat history
  getPatientChatHistory: (patientId) => api.get('/doctor/ai/chat-history/patient', {
    params: { patient_id: patientId }
  }),

  // GET /api/v1/doctor/ai/chat-history/doctor - Get doctor's general chat history
  getDoctorChatHistory: (patientId = null) => {
    const params = {};
    if (patientId) params.patient_id = patientId;
    return api.get('/doctor/ai/chat-history/doctor', { params });
  },
};

// ==================== ORGANIZATION & TEAM API ====================

export const organizationAPI = {
  // GET /organizations
  getOrganizations: () => api.get('/organizations'),

  // GET /organizations/{id}
  getOrganization: (id) => api.get(`/organizations/${id}`),

  // PATCH /organizations/{id}
  updateOrganization: (id, data) => api.patch(`/organizations/${id}`, data),

  // GET /organizations/{id}/members
  getMembers: (id) => api.get(`/organizations/${id}/members`),
};

export const teamAPI = {
  // POST /team/invite
  inviteTeamMember: (data) => api.post('/team/invite', data),

  // GET /team/roles - List Team Roles
  getTeamRoles: () => api.get('/team/roles'),

  // GET /team/invitations
  getInvitations: () => api.get('/team/invitations'),

  // POST /team/invitations/{id}/accept
  acceptInvitation: (id) => api.post(`/team/invitations/${id}/accept`),

  // POST /team/invitations/{id}/decline
  declineInvitation: (id) => api.post(`/team/invitations/${id}/decline`),

  // GET /team/members
  getTeamMembers: () => api.get('/team/members'),

  // DELETE /team/members/{id}
  removeTeamMember: (id) => api.delete(`/team/members/${id}`),

  // PATCH /team/members/{id}
  updateTeamMember: (id, data) => api.patch(`/team/members/${id}`, data),
};

// ==================== PERMISSIONS API ====================

export const permissionsAPI = {
  // POST /api/v1/permissions/grant-doctor-access - Grant doctor access to patient data
  grantDoctorAccess: (data) => api.post('/permissions/grant-doctor-access', data),

  // POST /api/v1/permissions/request - Request access to patient data
  requestAccess: (data) => api.post('/permissions/request', data),

  // DELETE /api/v1/permissions/revoke-doctor-access - Revoke doctor access
  revokeDoctorAccess: (doctorId, patientId) => api.delete('/permissions/revoke-doctor-access', {
    data: { doctor_id: doctorId, patient_id: patientId }
  }),

  // GET /api/v1/permissions/check - Check if user has permission
  checkPermission: (params) => api.get('/permissions/check', { params }),
};

// ==================== AUDIT & COMPLIANCE API ====================

export const auditAPI = {
  // GET /audit/logs
  getAuditLogs: (params) => api.get('/audit/logs', { params }),

  // GET /audit/logs/{id}
  getAuditLog: (id) => api.get(`/audit/logs/${id}`),

  // GET /audit/export - Export audit logs
  exportAuditLogs: (params) => api.get('/audit/export', { params }),

  // GET /audit/stats - Get audit statistics
  getAuditStats: () => api.get('/audit/stats'),

  // GET /compliance/access-logs
  getAccessLogs: (params) => api.get('/compliance/access-logs', { params }),

  // GET /compliance/reports
  getComplianceReports: (params) => api.get('/compliance/reports', { params }),
};

// ==================== DOCUMENTS API ====================

export const documentsAPI = {
  // GET /documents/{id}
  getDocument: (id) => api.get(`/documents/${id}`),

  // GET /documents/{id}/download (presigned URL)
  getDocumentDownloadUrl: (id) => api.get(`/documents/${id}/download`),

  // DELETE /documents/{id}
  deleteDocument: (id) => api.delete(`/documents/${id}`),

  // PATCH /documents/{id}
  updateDocument: (id, data) => api.patch(`/documents/${id}`, data),
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Store authentication tokens
 */
export const storeTokens = async (accessToken, refreshToken, userData) => {
  try {
    await AsyncStorage.multiSet([
      [TOKEN_CONFIG.ACCESS_TOKEN_KEY, accessToken || ''],
      [TOKEN_CONFIG.REFRESH_TOKEN_KEY, refreshToken || ''],
      [TOKEN_CONFIG.USER_DATA_KEY, userData ? JSON.stringify(userData) : '{}'],
    ]);
  } catch (error) {
    console.error('Error storing tokens:', error);
  }
};

/**
 * Get stored user data - fetches fresh from backend if possible
 * For doctors, merges with locally stored profile data
 */
export const getUserData = async () => {
  let userData = null;

  // Try to fetch fresh data from backend
  try {
    const response = await api.get('/auth/me');
    if (response.data) {
      userData = response.data;
      await AsyncStorage.setItem(TOKEN_CONFIG.USER_DATA_KEY, JSON.stringify(response.data));
    }
  } catch (error) {
    console.log('Could not fetch fresh user data, using cached:', error.message);
  }

  // Fallback to cached data
  if (!userData) {
    try {
      const cachedData = await AsyncStorage.getItem(TOKEN_CONFIG.USER_DATA_KEY);
      userData = cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error('Error getting cached user data:', error);
    }
  }

  // For doctors, merge with locally stored doctor profile (has specialty, license, phone)
  if (userData && userData.role === 'doctor') {
    try {
      const doctorProfile = await AsyncStorage.getItem('doctor_profile');
      if (doctorProfile) {
        const profileData = JSON.parse(doctorProfile);
        userData = {
          ...userData,
          specialty: profileData.specialty || userData.specialty,
          license_number: profileData.license_number || userData.license_number,
          phone: profileData.phone || userData.phone_number || userData.phone,
          phone_number: profileData.phone || userData.phone_number,
          full_name: userData.name || userData.full_name || profileData.full_name
        };
      }
    } catch (error) {
      console.log('Could not load doctor profile:', error.message);
    }
  }

  return userData;
};

// ==================== ADMIN API ====================

export const adminAPI = {
  // GET /api/v1/admin/overview - Get Dashboard Overview
  getOverview: () => api.get('/admin/overview'),

  // GET /api/v1/admin/settings - Get All Settings
  getSettings: () => api.get('/admin/settings'),

  // PATCH /api/v1/admin/settings/organization - Update Org Settings
  updateOrganizationSettings: (data) => api.patch('/admin/settings/organization', data),

  // PATCH /api/v1/admin/settings/developer - Update Developer Settings
  updateDeveloperSettings: (data) => api.patch('/admin/settings/developer', data),

  // PATCH /api/v1/admin/settings/backup - Update Backup Settings
  updateBackupSettings: (data) => api.patch('/admin/settings/backup', data),

  // GET /api/v1/admin/accounts - Get Account List
  getAccounts: (params) => api.get('/admin/accounts', { params }),

  // POST /api/v1/admin/invite - Invite Team Member
  inviteTeamMember: (data) => api.post('/admin/invite', data),

  // DELETE /api/v1/admin/accounts/{id} - Revoke Access
  revokeAccess: (userId) => api.delete(`/admin/accounts/${userId}`),

  // GET /api/v1/admin/accounts/{id} - Get Account Details
  getAccountDetails: (userId) => api.get(`/admin/accounts/${userId}`),

  // PATCH /api/v1/admin/accounts/{id} - Update Account
  updateAccount: (userId, data) => api.patch(`/admin/accounts/${userId}`, data),

  // GET /api/v1/admin/doctors/{id}/details - Get Doctor Specific details
  getDoctorDetails: (doctorId) => api.get(`/admin/doctors/${doctorId}/details`),

  // GET /api/v1/admin/audit-logs - Get Audit Logs
  getAuditLogs: () => api.get('/admin/audit-logs'),
};

// ==================== HOSPITAL API ====================

export const hospitalAPI = {
  // GET /hospital/dashboard - Get Hospital Dashboard Stats
  getDashboard: () => api.get('/hospital/dashboard'),

  // GET /hospital/doctors - List Hospital Doctors
  getDoctors: () => api.get('/hospital/doctors'),

  // GET /hospital/patients - List Hospital Patients
  getPatients: () => api.get('/hospital/patients'),

  // GET /hospital/appointments - List Hospital Appointments
  getAppointments: (params) => api.get('/hospital/appointments', { params }),

  // GET /hospital/departments - List Departments
  getDepartments: () => api.get('/hospital/departments'),

  // POST /hospital/departments - Create Department
  createDepartment: (data) => api.post('/hospital/departments', data),

  // PATCH /hospital/departments/{id} - Update Department
  updateDepartment: (departmentId, data) => api.patch(`/hospital/departments/${departmentId}`, data),

  // DELETE /hospital/departments/{id} - Delete Department
  deleteDepartment: (departmentId) => api.delete(`/hospital/departments/${departmentId}`),

  // GET /hospital/settings - Get Hospital Settings
  getSettings: () => api.get('/hospital/settings'),

  // PATCH /hospital/settings - Update Hospital Settings
  updateSettings: (data) => api.patch('/hospital/settings', data),
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
    return !!token;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

export default api;

// Export API_BASE_URL for use in OAuth flows
export const API_BASE_URL = API_CONFIG.BASE_URL;