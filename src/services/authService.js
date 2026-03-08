/**
 * ============================================================
 * CENTRALIZED AUTH SERVICE — SaraMedico Mobile App
 * ============================================================
 *
 * Responsibilities:
 *   1. Login / Logout
 *   2. Secure token storage (AsyncStorage)
 *   3. Token validation & role extraction
 *   4. Automatic token refresh (401 retry with refresh_token)
 *   5. Forced logout on refresh failure
 *   6. Account-status verification
 *   7. Role-based route guard helpers
 *
 * Backend Auth Endpoints (live-tested on 2026-03-04):
 *   POST /auth/login        → { access_token, refresh_token, user }
 *   POST /auth/refresh      → { access_token, refresh_token }
 *   POST /auth/logout       → 200 OK
 *   GET  /auth/me           → user profile
 *   GET  /doctor/me         → doctor-specific profile (role=doctor only)
 *
 * Token strategy: JWT Bearer (access) + refresh_token stored locally.
 * Role is stored in the JWT payload AND returned in /auth/me response.
 * No MFA enforced server-side for existing test accounts.
 * ============================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { TOKEN_CONFIG, API_CONFIG } from './config';
import { fixUserUrls } from './urlFixer';

// ─────────────────────────────────────────────────────────────
// Internal raw axios client (no interceptors) used for token ops
// ─────────────────────────────────────────────────────────────
const rawClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// ─────────────────────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────────────────────
const storage = {
    async getToken() {
        return AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
    },
    async getRefreshToken() {
        return AsyncStorage.getItem(TOKEN_CONFIG.REFRESH_TOKEN_KEY);
    },
    async getUserData() {
        try {
            const raw = await AsyncStorage.getItem(TOKEN_CONFIG.USER_DATA_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },
    async saveTokens(accessToken, refreshToken, userData) {
        await AsyncStorage.multiSet([
            [TOKEN_CONFIG.ACCESS_TOKEN_KEY, accessToken || ''],
            [TOKEN_CONFIG.REFRESH_TOKEN_KEY, refreshToken || ''],
            [TOKEN_CONFIG.USER_DATA_KEY, userData ? JSON.stringify(userData) : '{}'],
        ]);
    },
    async clearAll() {
        await AsyncStorage.multiRemove([
            TOKEN_CONFIG.ACCESS_TOKEN_KEY,
            TOKEN_CONFIG.REFRESH_TOKEN_KEY,
            TOKEN_CONFIG.USER_DATA_KEY,
            'doctor_first_login',
            'doctor_profile',
        ]);
    },
};

// ─────────────────────────────────────────────────────────────
// Role constants — matches exact strings returned by backend
// ─────────────────────────────────────────────────────────────
export const ROLES = {
    DOCTOR: 'doctor',
    PATIENT: 'patient',
    ADMIN: 'admin',
    HOSPITAL: 'hospital',
};

// ─────────────────────────────────────────────────────────────
// Role → allowed route guard map
// Extend this when new roles / screens are added.
// ─────────────────────────────────────────────────────────────
export const ROLE_NAVIGATION_MAP = {
    [ROLES.DOCTOR]: 'DoctorFlow',
    [ROLES.PATIENT]: 'PatientFlow',
    [ROLES.ADMIN]: 'AdminFlow',
    [ROLES.HOSPITAL]: 'HospitalFlow',
};

// ─────────────────────────────────────────────────────────────
// Role permission matrix
// ─────────────────────────────────────────────────────────────
export const ROLE_PERMISSIONS = {
    [ROLES.DOCTOR]: [
        'doctor.patients.list',
        'doctor.patients.add',
        'doctor.appointments.list',
        'doctor.appointments.approve',
        'doctor.tasks.create',
        'doctor.tasks.list',
        'doctor.tasks.update',
        'doctor.tasks.delete',
        'doctor.documents.upload',
        'doctor.documents.list',
        'doctor.ai.chat',
        'doctor.ai.process',
        'doctor.profile.update',
        'doctor.activity.view',
        'doctor.schedule.view',
        'calendar.view',
        'calendar.create',
        'calendar.update',
        'calendar.delete',
        'permissions.request',
        'permissions.check',
    ],
    [ROLES.PATIENT]: [
        'patient.profile.view',
        'patient.profile.update',
        'patient.appointments.create',
        'patient.appointments.list',
        'patient.documents.list',
        'patient.documents.delete',
        'doctors.search',
        'permissions.grant',
        'permissions.revoke',
    ],
    [ROLES.ADMIN]: [
        'admin.overview',
        'admin.accounts.list',
        'admin.accounts.update',
        'admin.accounts.revoke',
        'admin.doctors.details',
        'admin.audit-logs',
        'admin.settings.org',
        'admin.settings.developer',
        'admin.settings.backup',
    ],
    [ROLES.HOSPITAL]: [
        'hospital.dashboard',
        'hospital.doctors.list',
        'hospital.patients.list',
        'hospital.appointments.list',
        'hospital.departments.manage',
        'hospital.settings',
    ],
};

// ─────────────────────────────────────────────────────────────
// Refresh token reuse lock — prevents simultaneous refresh storms
// ─────────────────────────────────────────────────────────────
let _isRefreshing = false;
let _refreshSubscribers = [];

function subscribeToRefresh(callback) {
    _refreshSubscribers.push(callback);
}

function notifyRefreshSubscribers(newToken, error = null) {
    _refreshSubscribers.forEach(cb => cb(newToken, error));
    _refreshSubscribers = [];
}

// ─────────────────────────────────────────────────────────────
// Auth Service
// ─────────────────────────────────────────────────────────────
const AuthService = {
    /**
     * Login and persist session
     * @returns { user, accessToken, refreshToken, navTarget }
     */
    async login(email, password) {
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            let errorDetail = 'Login failed';
            try {
                const errorData = await response.json();
                errorDetail = errorData.detail || errorDetail;
            } catch (e) {
                errorDetail = `Login failed (${response.status})`;
            }
            throw new Error(errorDetail);
        }

        const data = await response.json();
        const { access_token, refresh_token, user: rawUser } = data;
        const user = fixUserUrls(rawUser);

        if (!access_token || !user) {
            throw new Error('Invalid login response from server');
        }

        await storage.saveTokens(access_token, refresh_token, user);

        // Mark first-time login for doctor onboarding flow
        if (user.role === ROLES.DOCTOR) {
            const wasFirstLogin = await AsyncStorage.getItem('doctor_first_login');
            if (wasFirstLogin === null) {
                await AsyncStorage.setItem('doctor_first_login', 'true');
            }
        }

        const navTarget = ROLE_NAVIGATION_MAP[user.role] || 'Auth';

        return { user, accessToken: access_token, refreshToken: refresh_token, navTarget };
    },

    /**
     * Logout — clear local session and notify backend
     */
    async logout() {
        try {
            const refreshToken = await storage.getRefreshToken();
            if (refreshToken) {
                await rawClient.post('/auth/logout', { refresh_token: refreshToken });
            }
        } catch {
            // Silently fail — always clear local state
        } finally {
            await storage.clearAll();
        }
    },

    /**
     * Refresh access token using refresh_token
     * Returns new access_token or throws on failure.
     */
    async refreshAccessToken() {
        if (_isRefreshing) {
            // Queue callers until current refresh completes
            return new Promise((resolve, reject) => {
                subscribeToRefresh((newToken, error) => {
                    if (error) return reject(error);
                    resolve(newToken);
                });
            });
        }

        _isRefreshing = true;

        try {
            const refreshToken = await storage.getRefreshToken();
            if (!refreshToken) throw new Error('No refresh token available');

            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!response.ok) throw new Error(`Refresh failed: ${response.status}`);

            const data = await response.json();
            const { access_token, refresh_token: newRefreshToken } = data;

            if (!access_token) throw new Error('Refresh response missing access_token');

            // Persist new tokens
            const userData = await storage.getUserData();
            await storage.saveTokens(access_token, newRefreshToken || refreshToken, userData);

            notifyRefreshSubscribers(access_token);
            return access_token;
        } catch (error) {
            notifyRefreshSubscribers(null, error);
            // Refresh failed → forced logout
            await this.logout();
            throw error;
        } finally {
            _isRefreshing = false;
        }
    },

    /**
     * Restore session from AsyncStorage
     * Returns { user, isAuthenticated, navTarget } or null
     */
    async restoreSession() {
        try {
            const token = await storage.getToken();
            if (!token) return { isAuthenticated: false, user: null, navTarget: 'Auth' };

            // Validate token with backend using fetch (bypasses Axios Network Error)
            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired — attempt refresh
                    try {
                        await this.refreshAccessToken();
                        return this.restoreSession(); // Retry once with new token
                    } catch {
                        return { isAuthenticated: false, user: null, navTarget: 'Auth' };
                    }
                }
                throw new Error(`Auth check failed: ${response.status}`);
            }

            const rawUser = await response.json();
            const user = fixUserUrls(rawUser);
            // Persist refreshed user data
            await AsyncStorage.setItem(TOKEN_CONFIG.USER_DATA_KEY, JSON.stringify(user));

            return {
                isAuthenticated: true,
                user,
                navTarget: ROLE_NAVIGATION_MAP[user.role] || 'Auth',
            };
        } catch (error) {
            // 403 = stale session, network error, etc. — use cached user data
            const user = await storage.getUserData();
            if (user && Object.keys(user).length > 0) {
                return {
                    isAuthenticated: true,
                    user,
                    navTarget: ROLE_NAVIGATION_MAP[user.role] || 'Auth',
                };
            }
            return { isAuthenticated: false, user: null, navTarget: 'Auth' };
        }
    },

    /**
     * Check if current user has a specific permission
     */
    async hasPermission(permission) {
        const user = await storage.getUserData();
        if (!user?.role) return false;
        const permissions = ROLE_PERMISSIONS[user.role] || [];
        return permissions.includes(permission);
    },

    /**
     * Get current user role
     */
    async getCurrentRole() {
        const user = await storage.getUserData();
        return user?.role || null;
    },

    /**
     * Verify account is active (not suspended/blocked)
     * Backend returns 401 if inactive
     */
    async verifyAccountStatus() {
        const token = await storage.getToken();
        if (!token) return { active: false, reason: 'No session' };

        try {
            await rawClient.get('/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
            });
            return { active: true };
        } catch (error) {
            const status = error.response?.status;
            const detail = error.response?.data?.detail || 'Unknown error';
            return {
                active: false,
                reason: detail,
                status,
            };
        }
    },

    // Expose storage helpers for external use
    storage,
};

export default AuthService;
