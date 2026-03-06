import { UPLOAD_CONFIG } from './config';

/**
 * File Upload Utilities
 * 
 * Handles file validation, preparation, and upload progress tracking
 */

class FileUploadService {
    /**
     * Validate file before upload
     * @param {Object} file - File object with uri, name, size, type
     * @returns {Object} - { valid, error }
     */
    static validateFile(file) {
        if (!file || !file.uri) {
            return { valid: false, error: 'No file selected' };
        }

        // Check file size
        if (file.size && file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
            const maxSizeMB = UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
            return {
                valid: false,
                error: `File size exceeds ${maxSizeMB}MB limit`
            };
        }

        // Check file extension
        const fileName = file.name || file.uri.split('/').pop();
        const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

        if (!UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(fileExt)) {
            return {
                valid: false,
                error: `File type not allowed. Allowed types: ${UPLOAD_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`
            };
        }

        return { valid: true, error: null };
    }

    /**
     * Prepare FormData for file upload
     * @param {Object} file - File object with uri, name, type
     * @param {Object} additionalData - Additional form fields (category, title, description)
     * @returns {FormData}
     */
    static prepareFormData(file, additionalData = {}) {
        const formData = new FormData();

        // Add file
        const fileName = file.name || file.uri.split('/').pop();
        const fileType = file.type || this.getMimeType(fileName);

        formData.append('file', {
            uri: file.uri,
            name: fileName,
            type: fileType,
        });

        // Add additional fields
        Object.keys(additionalData).forEach(key => {
            if (additionalData[key] !== null && additionalData[key] !== undefined) {
                formData.append(key, additionalData[key]);
            }
        });

        return formData;
    }

    /**
     * Get MIME type from file extension
     * @param {string} fileName
     * @returns {string}
     */
    static getMimeType(fileName) {
        const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.dicom': 'application/dicom',
            '.dcm': 'application/dicom',
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Format file size for display
     * @param {number} bytes
     * @returns {string}
     */
    static formatFileSize(bytes) {
        if (!bytes) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Calculate upload progress percentage
     * @param {number} loaded - Bytes loaded
     * @param {number} total - Total bytes
     * @returns {number} - Progress percentage (0-100)
     */
    static calculateProgress(loaded, total) {
        if (!total) return 0;
        return Math.round((loaded / total) * 100);
    }

    /**
     * Create upload config with progress callback
     * @param {Function} onProgress - Progress callback function
     * @returns {Object} - Axios config object
     */
    static createUploadConfig(onProgress) {
        return {
            onUploadProgress: (progressEvent) => {
                const progress = this.calculateProgress(
                    progressEvent.loaded,
                    progressEvent.total
                );
                if (onProgress) {
                    onProgress(progress, progressEvent.loaded, progressEvent.total);
                }
            },
        };
    }
}

export default FileUploadService;
