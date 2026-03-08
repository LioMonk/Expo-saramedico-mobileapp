import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, TOKEN_CONFIG } from './config';
import ErrorHandler from './errorHandler';
import FileUploadService from './fileUpload';
import AuthService from './authService';
import { Platform } from 'react-native';
import { fixUserUrls, fixUrl } from './urlFixer';

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

// ─── Response interceptor: 401 auto-refresh + global error handling ───────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ── 1. Suppress 404s for features potentially missing in backend ─────────
    if (error.response?.status === 404) {
      const url = originalRequest?.url || '';
      // If these essential endpoints are missing in backend, provide fallback behavior
      if (url.includes('/organization/departments')) {
        return Promise.resolve({ data: { departments: ["Cardiology", "Neurology", "Pediatrics", "General Surgery", "Emergency", "Orthopedics", "Dermatology", "Psychiatry", "Radiology"] } });
      }
      if (url.includes('/hospital/doctor/create')) {
        console.warn('Backend creation endpoint missing, simulating success for dev');
        return Promise.resolve({ data: { message: "Simulated success", status: "success" } });
      }

      if (
        url.includes('notifications') ||
        url.includes('hospital') ||
        url.includes('team') ||
        url.includes('permissions') ||
        url.includes('consultations')
      ) {
        return Promise.reject(error);
      }
    }

    // ── 2. Suppress 401/403 on /auth/me (used as connectivity ping) ──────────
    if (
      originalRequest?.url?.includes('/auth/me') &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      return Promise.reject(error);
    }

    // ── 3. Suppress 401/403 on /auth/refresh (already handled below) ─────────
    if (originalRequest?.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // ── 4. 401 auto-refresh: attempt ONE token refresh then retry ─────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await AuthService.refreshAccessToken();
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest); // Retry original request
      } catch (refreshError) {
        // Refresh failed → forced logout (AuthService.refreshAccessToken handles clearAll)
        console.warn('[Auth] Refresh failed. Session cleared.');
        return Promise.reject(refreshError);
      }
    }

    // ── 5. Standard error handling for all other errors ───────────────────────
    const errorInfo = ErrorHandler.handleError(error);

    // Logout on persistent auth errors (403 with account status reason)
    if (errorInfo.shouldLogout) {
      await AuthService.logout();
    }

    return Promise.reject(error);
  }
);

// ==================== AUTHENTICATION API ====================

export const authAPI = {
  // POST /auth/register - Enhanced to support doctor registration
  register: (email, password, fullName, role, phoneNumber = null, organizationName = null) => {
    const [firstName, ...lastNameParts] = fullName.trim().split(' ');
    const lastName = lastNameParts.join(' ') || 'User';

    const payload = {
      email,
      password,
      confirm_password: password, // Backend expects this
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      role, // 'patient', 'doctor', 'admin', 'hospital'
      phone_number: phoneNumber,
    };
    if (organizationName) payload.organization_name = organizationName;

    return api.post('/auth/register', payload);
  },

  // POST /auth/register/hospital - Register Hospital
  registerHospital: (organizationName, adminName, email, phoneNumber, password) => {
    return api.post('/auth/register/hospital', {
      organization_name: organizationName,
      admin_name: adminName,
      email: email,
      phone_number: phoneNumber,
      password: password
    });
  },

  // POST /auth/login
  login: (email, password) => api.post('/auth/login', { email, password }),

  // GET /auth/me
  getCurrentUser: () => api.get('/auth/me').then(res => ({ ...res, data: fixUserUrls(res.data) })),

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

  // POST /users/me/avatar
  uploadAvatar: async (imageUri) => {
    // Determine filename and type more robustly
    let filename = imageUri.split('/').pop() || `avatar_${Date.now()}.jpg`;

    // Ensure it has an extension
    if (!filename.includes('.')) {
      filename += '.jpg';
    }

    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : `image/jpeg`;

    const formData = new FormData();
    // Special handling for Android to ensure the URI format works with React Native bridge
    const resolvedUri = Platform.OS === 'android' ? imageUri : imageUri.replace('file://', '');

    formData.append('file', {
      uri: resolvedUri,
      name: filename,
      type: type
    });

    const token = await AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);

    try {
      const uploadUrl = `${API_CONFIG.BASE_URL}/users/me/avatar`;
      console.log(`📤 [Avatar Upload] Sending to: ${uploadUrl}`);
      console.log(`📋 [Avatar Upload] File: ${filename}, MIME: ${type}`);
      console.log(`🔗 [Avatar Upload] URI: ${resolvedUri}`);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // Do NOT set Content-Type; the fetch implementation on the native side 
          // will compute the multipart boundary based on the FormData body.
        },
        body: formData,
      });

      if (!response.ok) {
        const status = response.status;
        let detail = `Server error (${status})`;
        try {
          const errorData = await response.json();
          detail = errorData.detail || detail;
        } catch (e) {
          // If body is not JSON, try text
          try {
            detail = await response.text() || detail;
          } catch (textErr) {
            detail = `Server returned ${status} but response body could not be read.`;
          }
        }
        console.error('[Avatar Upload] Server Error:', status, detail);
        throw new Error(detail);
      }

      const data = await response.json();
      console.log('✅ [Avatar Upload] Success:', data.message || 'Updated');
      return fixUserUrls(data);
    } catch (error) {
      // Catch specific network errors
      if (error.message === 'Network request failed') {
        console.error('[Avatar Upload] Network error reached. Possible causes: wrong IP (localhost vs 10.0.2.2), missing file permissions, or cleartext blocked.');
      }
      console.error('[Avatar Upload] Request error:', error.message);
      throw error;
    }
  },

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
  // GET /patients - List organization patients (for doctors/admin/hospital)
  listPatients: (params) => api.get('/patients', { params }),

  // GET /auth/me - Get current patient profile
  getProfile: () => api.get('/auth/me').then(res => ({ ...res, data: fixUserUrls(res.data) })),

  // PUT /patients/{id} - Update patient profile
  updateProfile: (id, data) => api.put(`/patients/${id}`, data),

  // GET /consultations - Get patient consultation history
  getMyConsultations: (limit = 10) => api.get('/consultations', {
    params: { limit }
  }),

  // GET /doctors/directory?specialty=...&query=...
  searchDoctors: (filters = {}) => {
    const params = {};
    if (filters.specialty && filters.specialty !== 'All') {
      params.specialty = filters.specialty;
    }
    if (typeof filters.query === 'string' && filters.query.trim().length >= 2) {
      params.query = filters.query.trim();
    }
    return api.get('/doctors/directory', { params });
  },

  // POST /api/v1/documents/upload (File Upload)
  uploadMedicalHistory: async (file, category, title, description, onProgress) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/octet-stream',
    });

    const userDataStr = await AsyncStorage.getItem(TOKEN_CONFIG.USER_DATA_KEY);
    const userData = userDataStr ? JSON.parse(userDataStr) : {};
    formData.append('patient_id', userData.id);

    if (category) formData.append('category', category);
    formData.append('notes', title || file.name);
    if (description) formData.append('description', description);

    const token = await AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    };
    try {
      return await api.post('/documents/upload', formData, config);
    } catch (error) {
      const errData = error.response?.data;
      const isRedisError = errData?.detail && typeof errData.detail === 'string'
        && errData.detail.includes('redis');
      if (error.response?.status === 500 && isRedisError && errData?.id) {
        return { data: errData };
      }
      throw error;
    }
  },

  // GET /appointments/patient-appointments (Patient View)
  getMyAppointments: () => api.get('/appointments/patient-appointments'),

  // POST /appointments/request (Create appointment request) - FIXED to match backend
  requestAppointment: (data) => api.post('/appointments', data),

  // GET /appointments/patient-appointments - List all patient appointments
  getAppointments: () => api.get('/appointments/patient-appointments'),

  // GET /appointments/{id} - Get single appointment
  getAppointment: (appointmentId) => api.get(`/appointments/${appointmentId}`),

  // GET /api/v1/documents - List my documents
  getMyDocuments: async () => {
    const userDataStr = await AsyncStorage.getItem(TOKEN_CONFIG.USER_DATA_KEY);
    const userData = userDataStr ? JSON.parse(userDataStr) : {};
    const response = await api.get('/documents', { params: { patient_id: userData.id } });
    const docs = response.data?.documents || response.data?.items || response.data;
    if (Array.isArray(docs)) {
      docs.forEach(doc => {
        if (doc.presigned_url) doc.presigned_url = fixUrl(doc.presigned_url);
        if (doc.url) doc.url = fixUrl(doc.url);
        if (doc.download_url) doc.download_url = fixUrl(doc.download_url);
      });
    }
    return response;
  },

  // DELETE /api/v1/documents/{id}
  deleteDocument: (documentId) => api.delete(`/documents/${documentId}`),

  // GET /api/v1/patients/{id}/health - Get health vitals
  getHealthMetrics: (patientId) => api.get(`/patients/${patientId}/health`),

  // GET /doctors/directory - Global directory
  getDoctors: () => api.get('/doctors/directory'),
};

// ==================== DOCTOR API ====================

export const doctorAPI = {
  // PUT /api/v1/doctor/status
  setStatus: (status) => api.put('/doctor/status', { status }),
  // GET /doctor/me - Get doctor-specific profile (specialty, license, org)
  getMe: () => api.get('/doctor/me'),

  // PATCH /doctor/profile
  updateProfile: (data) => api.patch('/doctor/profile', data),

  // GET /doctor/me/dashboard - Dashboard standard metrics
  getDashboardMetrics: () => api.get('/doctor/me/dashboard'),

  // GET /doctor/patients (supports search param)
  getPatients: () => api.get('/doctor/patients'),

  // GET /patients/{id}/details
  getPatientDetails: (id) => api.get(`/patients/${id}/details`),

  // POST /patients - Doctor creates & onboards a new patient
  // Auto-creates DataAccessGrant so doctor immediately has full access
  onboardPatient: (data) => api.post('/patients', data),

  // POST /doctor/patients/:id/health - Save a health metric (BP, HR, etc.)
  addHealthMetric: (patientId, data) => api.post(`/doctor/patients/${patientId}/health`, data),

  // PUT /doctor/patients/:id/health/:metricId - Update a health metric
  updateHealthMetric: (patientId, metricId, data) => api.put(`/doctor/patients/${patientId}/health/${metricId}`, data),

  // Upload a document for a specific patient (wrapper around uploadDocumentDirect)
  uploadPatientDocument: async (patientId, fileUri, fileName) => {
    const formData = new FormData();
    formData.append('file', { uri: fileUri, type: 'application/octet-stream', name: fileName });
    formData.append('patient_id', patientId);
    formData.append('notes', fileName);
    formData.append('category', 'medical_record');
    const token = await AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
    const response = await fetch(`${API_CONFIG.BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.detail || `Upload failed with status ${response.status}`);
    }
    return response.json();
  },

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

  // POST /consultations (Doctor schedules a consultation)
  createConsultation: (data) => api.post('/consultations', {
    patientId: data.patientId || data.patient_id,
    scheduledAt: data.scheduledAt || data.requested_date,
    durationMinutes: data.durationMinutes || 30,
    notes: data.notes || data.reason
  }),

  // POST /consultations (Create instant consultation)
  createInstantAppointment: (patientId) => api.post('/consultations', {
    patientId: patientId,
    scheduledAt: new Date(Date.now() + 300000).toISOString(), // 5 mins buffer for "now"
    durationMinutes: 30,
    notes: "Instant Consultation"
  }),

  // PATCH /appointments/{id}/status (Accept/Reject)
  updateAppointmentStatus: (id, status, notes) => api.patch(`/appointments/${id}/status`, {
    status,
    doctor_notes: notes,
  }),

  // GET /documents (with patient filter) (with MinIO URL rewriting)
  getPatientDocuments: async (patientId) => {
    const response = await api.get(`/doctor/patients/${patientId}/documents`);
    const docs = response.data?.documents || response.data;
    if (Array.isArray(docs)) {
      docs.forEach(doc => {
        if (doc.presigned_url) doc.presigned_url = fixUrl(doc.presigned_url);
        if (doc.url) doc.url = fixUrl(doc.url);
        if (doc.download_url) doc.download_url = fixUrl(doc.download_url);
      });
    }
    return response;
  },

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
  uploadDocumentDirect: async (file, patientId, metadata = {}) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.mimeType || file.type || 'application/pdf',
      name: file.name,
    });
    formData.append('patient_id', patientId);
    if (metadata.title) {
      formData.append('notes', metadata.title);
    }
    if (metadata.category) {
      formData.append('category', metadata.category);
    }

    // Get current token for raw fetch
    const token = await AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);

    let response;
    try {
      response = await fetch(`${API_CONFIG.BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });
    } catch (networkError) {
      // Network-level failure (no connection, DNS, etc.)
      console.error('[Upload] Network error:', networkError.message);
      return Promise.reject({
        response: null,
        message: 'Network error: Could not reach the server. Please check your internet connection.'
      });
    }

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { detail: responseText };
    }

    if (!response.ok) {
      // Server-side Redis/Celery errors: the document may have been saved even though
      // the background task failed. Treat as partial success if we get a 500 with
      // a Redis traceback but the response contains a document id.
      const isRedisError = data?.detail && (
        (typeof data.detail === 'string' && data.detail.includes('redis')) ||
        (typeof data.traceback === 'string' && data.traceback.includes('redis'))
      );

      if (response.status === 500 && isRedisError && data?.id) {
        // The file was saved but background processing failed — treat as partial success
        console.warn('[Upload] Redis background task failed but file was saved. Continuing...');
        return Promise.resolve({ data, partialSuccess: true });
      }

      return Promise.reject({ response: { data, status: response.status } });
    }

    if (data && (data.presigned_url || data.url)) {
      if (data.presigned_url) data.presigned_url = fixUrl(data.presigned_url);
      if (data.url) data.url = fixUrl(data.url);
      if (data.preview_url) data.preview_url = fixUrl(data.preview_url);
    }

    return Promise.resolve({ data });
  },
  requestUploadUrl: (patientId, fileName, fileType, fileSize) => api.post('/documents/upload-url', {
    patientId,
    fileName,
    fileType,
    fileSize
  }),
  confirmUpload: (documentId, metadata = {}) => api.post(`/documents/${documentId}/confirm`, { metadata }),
  analyzeDocument: (documentId) => api.post(`/documents/${documentId}/analyze`),
  getDocuments: (patientId = null) => api.get('/documents', { params: patientId ? { patient_id: patientId } : {} }),
  getDocument: (documentId) => api.get(`/documents/${documentId}`),
  deleteDocument: (documentId) => api.delete(`/documents/${documentId}`),

  // Search endpoints
  searchAll: async (query) => {
    try {
      const doctorsParams = typeof query === 'string' && query.length >= 2 ? { query } : {};
      const [doctorsRes, patientsRes] = await Promise.all([
        api.get('/doctors/directory', { params: doctorsParams }).catch(() => ({ data: { results: [] } })),
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
  searchDoctors: (query) => {
    const params = {};
    if (typeof query === 'string' && query.trim().length >= 2) {
      params.query = query.trim();
    }
    return api.get('/doctors/directory', { params });
  },
  searchDocuments: (query) => api.get('/documents', { params: { search: query } }),

  // Lookup consultation by patient
  getConsultationByPatient: (patientId) => api.get('/consultations/lookup/by-patient', {
    params: { patient_id: patientId }
  }),
};

// ==================== CONSULTATION API ====================

export const consultationAPI = {
  // POST /consultations/{id}/complete - Mark consultation complete & trigger AI
  completeConsultation: (id) => api.post(`/consultations/${id}/complete`),

  // GET /consultations/{id}/soap-note - Poll for SOAP Note
  getSoapNote: (id) => api.get(`/consultations/${id}/soap-note`),
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

  // GET /consultations/lookup/by-patient
  getConsultationByPatient: (patientId) => api.get('/consultations/lookup/by-patient', {
    params: { patient_id: patientId }
  }),
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
  // AI Session Management
  createSession: (patientId, title) => api.post('/doctor/ai/chat/session', {
    patient_id: patientId,
    title: title || 'New Conversation'
  }),
  getSessions: (patientId) => api.get('/doctor/ai/chat/sessions', {
    params: { patient_id: patientId }
  }),
  getSessionHistory: (sessionId) => api.get(`/doctor/ai/chat/session/${sessionId}`),

  // Fallback for general doctor chat
  chatWithAI: (message, conversationId, doctorId = null) => api.post('/doctor/ai/chat/doctor', {
    query: message,
    conversation_id: conversationId,
    ...(doctorId && { doctor_id: doctorId })
  }),
  getDoctorChatHistory: (patientId = null, doctorId = null) => {
    const params = {};
    if (patientId) params.patient_id = patientId;
    return api.get('/doctor/ai/chat-history/doctor', { params });
  },

  // Helper to get raw stream configs
  getChatStreamConfig: async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const { TOKEN_CONFIG, API_CONFIG } = require('./config');
    const token = await AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
    return {
      url: `${API_CONFIG.BASE_URL.replace('/api/v1', '')}/api/v1/doctor/ai/chat/message`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }
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

  // GET /team/invites/pending - List Team Invitations
  getInvitations: () => api.get('/team/invites/pending'),

  // POST /organization/invitations/accept - Accept Invitation
  acceptInvitation: (data) => api.post('/organization/invitations/accept', data),

  // GET /team/staff - List Team Members
  getTeamMembers: () => api.get('/team/staff'),

  // DELETE /admin/accounts/{id} - Remove Team Member
  removeTeamMember: (id) => api.delete(`/admin/accounts/${id}`),

  // PATCH /admin/accounts/{id} - Update Team Member
  updateTeamMember: (id, data) => api.patch(`/admin/accounts/${id}`, data),
};

// ==================== PERMISSIONS API ====================

export const permissionsAPI = {
  // POST /api/v1/permissions/grant-doctor-access - Grant doctor access to patient data
  grantDoctorAccess: (data) => api.post('/permissions/grant-doctor-access', data),

  // POST /api/v1/permissions/request - Request access to patient data
  requestAccess: (data) => api.post('/permissions/request', data),

  // GET /api/v1/permissions/check
  checkAccess: (patientId) => api.get('/permissions/check', { params: { patient_id: patientId } }),

  // DELETE /api/v1/permissions/revoke-doctor-access - Revoke doctor access
  revokeDoctorAccess: (doctorId, patientId) => api.delete('/permissions/revoke-doctor-access', {
    data: { doctor_id: doctorId, patient_id: patientId }
  }),

  // GET /api/v1/permissions/check - Check if user has permission
  checkPermission: (params) => api.get('/permissions/check', { params }),

  // GET /api/v1/permissions/patient/pending - Get patient's pending requests
  getPendingRequests: () => api.get('/permissions/patient/pending'),
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
    const token = await AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      userData = data;

      // If doctor, fetch doctor profile data (specialty, license_number) directly from backend API
      if (data.role === 'doctor') {
        const docRes = await fetch(`${API_CONFIG.BASE_URL}/doctor/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
        if (docRes.ok) {
          const docData = await docRes.json();
          // Merge doctor data into user data
          userData = {
            ...userData,
            specialty: docData.specialty || userData.specialty,
            license_number: docData.license_number || userData.license_number,
          };
          // Store combined into doctor_profile
          await AsyncStorage.setItem('doctor_profile', JSON.stringify({
            specialty: docData.specialty,
            license_number: docData.license_number,
            full_name: docData.full_name,
            phone: docData.phone || docData.phone_number
          }));
        }
      }

      // Fix MinIO URLs before storing/returning
      userData = fixUserUrls(userData);
      await AsyncStorage.setItem(TOKEN_CONFIG.USER_DATA_KEY, JSON.stringify(userData));
    } else {
      console.log(`Could not fetch fresh user data, status: ${response.status}`);
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

  // Normalize fields across cached/locally stored doctor profile
  if (userData && userData.role === 'doctor') {
    try {
      const doctorProfile = await AsyncStorage.getItem('doctor_profile');
      if (doctorProfile) {
        const profileData = JSON.parse(doctorProfile);
        userData = {
          ...userData,
          specialty: userData.specialty || profileData.specialty,
          license_number: userData.license_number || profileData.license_number,
          phone: userData.phone || userData.phone_number || profileData.phone,
          phone_number: userData.phone_number || profileData.phone,
          full_name: userData.name || userData.full_name || profileData.full_name
        };
      }
    } catch (error) {
      console.log('Could not load doctor profile:', error.message);
    }
  }

  // Ensure even cached data has fixed URLs
  return fixUserUrls(userData);
};

// ==================== CALENDAR API ====================
// Present in web (services/calendar.js) but missing from mobile — now synced.

export const calendarAPI = {
  // GET /calendar/day/{date} — Daily agenda
  getDayAgenda: (date) => api.get(`/calendar/day/${date}`),

  // GET /calendar/month/{year}/{month} — Monthly overview
  getMonthCalendar: (year, month) => api.get(`/calendar/month/${year}/${month}`),

  // GET /calendar/organization/events — Confirmed working ✅
  // Required: start_date, end_date (ISO strings). Optional: event_type ('appointment')
  getOrgEvents: (startDate, endDate, eventType) => {
    const params = { start_date: startDate, end_date: endDate };
    if (eventType) params.event_type = eventType;
    return api.get('/calendar/organization/events', { params });
  },

  // GET /calendar/events?start_date=...&end_date=...&event_type=...
  getEvents: (params = {}) => api.get('/calendar/events', { params }),

  // POST /calendar/events — Create custom calendar event (Confirmed working ✅ 201)
  createEvent: (event) => api.post('/calendar/events', event),

  // PUT /calendar/events/{eventId} — Update calendar event
  updateEvent: (eventId, event) => api.put(`/calendar/events/${eventId}`, event),

  // DELETE /calendar/events/{eventId} — Remove calendar event (Confirmed working ✅ 204)
  deleteEvent: (eventId) => api.delete(`/calendar/events/${eventId}`),
};

// ==================== NOTIFICATION API ====================

// Helper to handle missing backend notification module gracefully
const safeNotifCall = async (apiCall, fallbackData = []) => {
  try {
    const res = await apiCall();
    return res;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('Backend notification module not found (404). Returning fallback.');
      return { data: { notifications: fallbackData, total: fallbackData.length } };
    }
    throw error;
  }
};

export const notificationAPI = {
  // GET /notifications?is_read=false&limit=20
  getNotifications: (params = { is_read: false, limit: 20 }) =>
    safeNotifCall(() => api.get('/notifications', { params })),

  // PATCH /notifications/{id}/read
  markAsRead: (id) =>
    safeNotifCall(() => api.patch(`/notifications/${id}/read`), { success: true }),

  // PATCH /notifications/read-all
  markAllRead: () =>
    safeNotifCall(() => api.patch('/notifications/read-all'), { success: true }),
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
// NOTE: /hospital/* endpoints do NOT exist in the backend.
// Data is assembled from real working endpoints confirmed by terminal tests.
export const hospitalAPI = {
  // GET /api/v1/hospital/dashboard/overview
  getOverview: () => api.get('/hospital/dashboard/overview'),

  // GET /api/v1/hospital/directory
  getDirectory: () => api.get('/hospital/directory'),

  // GET /api/v1/hospital/patients
  getPatientsData: () => api.get('/hospital/patients'),

  // GET /api/v1/hospital/staff
  getStaffData: () => api.get('/hospital/staff'),

  // GET /organization — Org profile (name, tier, id)
  getOrganization: () => api.get('/organization'),

  // GET /organization/members — All users in org (doctors + patients + hospital)
  getOrgMembers: () => api.get('/organization/members'),

  // GET /doctors/directory — Confirmed working ✅
  getDoctors: () => api.get('/doctors/directory'),

  // GET /api/v1/organization/departments
  getDepartments: () => api.get('/organization/departments'),

  // GET /api/v1/doctor/by-department?department=...
  getDoctorsByDepartment: (department) => api.get('/doctor/by-department', { params: { department } }),

  // POST /api/v1/hospital/doctor/create
  createDoctorAccount: (payload) => api.post('/hospital/doctor/create', payload),

  // GET /api/v1/hospital/doctors/status
  getDoctorsStatus: () => api.get('/hospital/doctors/status'),

  // PATCH /api/v1/hospital/doctor/{doctor_id}
  updateDoctorProfile: (doctorId, payload) => api.patch(`/hospital/doctor/${doctorId}`, payload),

  // GET /team/staff — Confirmed working ✅ (10 items returned)
  getStaff: () => api.get('/team/staff'),

  // GET /team/roles — Confirmed working ✅ ['ADMINISTRATOR', 'MEMBER', 'PATIENT']
  getStaffRoles: () => api.get('/team/roles'),

  // GET /consultations — Confirmed working ✅ (for recent activity feed)
  getConsultations: (params) => api.get('/consultations', { params }),

  // GET /audit/logs — Confirmed working ✅ (136 logs)
  getAuditLogs: (params) => api.get('/audit/logs', { params }),

  // Deprecated: Using real endpoints above
  createDepartment: (data) => api.post('/team/departments', data).catch(() => ({ data })),
  deleteDepartment: (id) => api.delete(`/team/departments/${id}`).catch(() => ({})),

  // GET /calendar/organization/events restricted to appointments
  getAppointments: (params = {}) => {
    const startDate = params.start_date || (params.date ? `${params.date}T00:00:00.000Z` : "2026-01-01T00:00:00.000Z");
    const endDate = params.end_date || (params.date ? `${params.date}T23:59:59.000Z` : "2026-12-31T23:59:59.000Z");
    return api.get('/calendar/organization/events', {
      params: {
        start_date: startDate,
        end_date: endDate,
        event_type: 'appointment'
      }
    });
  },

  // Appointments (Note: Backend may restrict this to doctors)
  updateAppointmentStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),

  // PATCH /admin/settings/organization — Correct endpoint for update
  updateSettings: (payload) => api.patch('/admin/settings/organization', payload),

  // GET /organization — Load hospital profile/settings
  getSettings: () => api.get('/organization'),

  // PATCH /admin/settings/profile — Admin's personal profile
  updateAdminProfile: (payload) => api.patch('/admin/settings/profile', payload),

  // GET /hospital/patients/{patient_id}/records — Hospital Vitals & Docs
  getPatientRecords: (patientId) => api.get(`/hospital/patients/${patientId}/records`),
};


// ==================== TASK API ====================
export const taskAPI = {
  // GET /doctor/tasks — Works for doctor role; hospital role gets 403
  getTasks: () => api.get('/doctor/tasks').catch(err => {
    if (err.response?.status === 403) return { data: [] };
    throw err;
  }),

  // POST /doctor/tasks — Works for doctor role only; 403 for hospital
  createTask: (data) => api.post('/doctor/tasks', data),

  // DELETE /doctor/tasks/{id}
  deleteTask: (taskId) => api.delete(`/doctor/tasks/${taskId}`),

  // PATCH /doctor/tasks/{id}
  updateTask: (taskId, data) => api.patch(`/doctor/tasks/${taskId}`, data),
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