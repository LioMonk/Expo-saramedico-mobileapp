import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_CONFIG } from './config';

/**
 * Centralized Error Handler for API Responses
 * 
 * Provides user-friendly error messages and handles common error scenarios
 */

class ErrorHandler {
    /**
     * Parse API error response and return user-friendly message
     * @param {Error} error - Axios error object
     * @returns {Object} - { message, statusCode, shouldLogout }
     */
    static handleError(error) {
        // Do not log 404s as full errors to avoid terminal noise for missing endpoints
        if (error.response?.status !== 404) {
            console.error('API Error:', error);
        }

        // Network error (no response from server)
        if (!error.response) {
            return {
                message: 'Network error. Please check your internet connection.',
                statusCode: null,
                shouldLogout: false,
            };
        }

        const { status, data } = error.response;

        // Handle specific status codes
        switch (status) {
            case 400:
                return {
                    message: data?.detail || 'Invalid request. Please check your input.',
                    statusCode: 400,
                    shouldLogout: false,
                };

            case 401:
                return {
                    message: data?.detail || 'Session expired. Please login again.',
                    statusCode: 401,
                    shouldLogout: true,
                };

            case 403:
                return {
                    message: data?.detail || 'Access denied. You do not have permission to perform this action.',
                    statusCode: 403,
                    shouldLogout: false,
                };

            case 404:
                return {
                    message: data?.detail || 'Resource not found.',
                    statusCode: 404,
                    shouldLogout: false,
                };

            case 422:
                // Validation error - extract field-specific errors if available
                if (data?.detail && Array.isArray(data.detail)) {
                    const fieldErrors = data.detail.map(err => `${err.loc?.[1] || 'Field'}: ${err.msg}`).join('\n');
                    return {
                        message: `Validation error:\n${fieldErrors}`,
                        statusCode: 422,
                        shouldLogout: false,
                    };
                }
                return {
                    message: data?.detail || 'Validation error. Please check your input.',
                    statusCode: 422,
                    shouldLogout: false,
                };

            case 500:
                return {
                    message: 'Server error. Please try again later.',
                    statusCode: 500,
                    shouldLogout: false,
                };

            case 503:
                return {
                    message: 'Service temporarily unavailable. Please try again later.',
                    statusCode: 503,
                    shouldLogout: false,
                };

            default:
                return {
                    message: data?.detail || `An error occurred (${status}). Please try again.`,
                    statusCode: status,
                    shouldLogout: false,
                };
        }
    }

    /**
     * Handle logout on authentication errors
     */
    static async handleLogout() {
        try {
            await AsyncStorage.multiRemove([
                TOKEN_CONFIG.ACCESS_TOKEN_KEY,
                TOKEN_CONFIG.REFRESH_TOKEN_KEY,
                TOKEN_CONFIG.USER_DATA_KEY,
            ]);
            console.log('User logged out due to authentication error');
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    /**
     * Check if error is a token expiration error
     * @param {Error} error - Axios error object
     * @returns {boolean}
     */
    static isTokenExpired(error) {
        return error.response?.status === 401;
    }

    /**
     * Check if error is a network error
     * @param {Error} error - Axios error object
     * @returns {boolean}
     */
    static isNetworkError(error) {
        return !error.response;
    }

    /**
     * Extract validation errors from 422 response
     * @param {Error} error - Axios error object
     * @returns {Object} - Field-specific error messages
     */
    static getValidationErrors(error) {
        if (error.response?.status !== 422) {
            return {};
        }

        const detail = error.response.data?.detail;
        if (!Array.isArray(detail)) {
            return {};
        }

        const errors = {};
        detail.forEach(err => {
            const field = err.loc?.[1] || 'general';
            errors[field] = err.msg;
        });

        return errors;
    }
}

export default ErrorHandler;
