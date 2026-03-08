import { API_CONFIG } from './config';
import { Platform } from 'react-native';

/**
 * Global helper to fix MinIO/internal URLs for mobile
 */
export const fixUrl = (url) => {
    if (!url || typeof url !== 'string') return url;

    // Use centralized config
    const isAws = API_CONFIG.BASE_URL.includes('107.20.98.130');

    // If AWS, we want to keep the AWS IP.
    // If Local, we use 10.0.2.2 for Android or localhost for iOS/Web.
    const PUBLIC_HOST = isAws ? '107.20.98.130' : API_CONFIG.PUBLIC_HOST;
    const API_PORT = API_CONFIG.API_PORT;
    const MINIO_PORT = API_CONFIG.MINIO_PORT;

    // 0. IMPORTANT: If this is a presigned URL, we MUST NOT modify the host.
    // Presigned URLs include the host in their signature. Changing localhost -> 10.0.2.2
    // will cause a 'SignatureDoesNotMatch' error from MinIO.
    // We rely on 'adb reverse tcp:9010 tcp:9010' to make localhost work on Android.
    if (url.toLowerCase().includes('x-amz-signature')) {
        return url;
    }

    let fixedUrl = url;

    // 1. Fix MinIO internal hostnames/ports (e.g., minio:9000 -> localhost:9010)
    if (url.includes('minio:') || url.includes(':9000')) {
        fixedUrl = url
            .replace(/https?:\/\/minio:\d+\//, `http://${PUBLIC_HOST}:${MINIO_PORT}/`)
            .replace(/https?:\/\/[^/]+:9000\//, `http://${PUBLIC_HOST}:${MINIO_PORT}/`);
    }

    // 2. Fix potential localhost issues in returned URLs (Only if PUBLIC_HOST is NOT localhost)
    if (PUBLIC_HOST !== 'localhost' && (
        url.includes('localhost:9010') || url.includes('127.0.0.1:9010') ||
        url.includes('localhost:8000') || url.includes('127.0.0.1:8000')
    )) {
        // Handle MinIO ports
        fixedUrl = fixedUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1):9010\//, `http://${PUBLIC_HOST}:${MINIO_PORT}/`);
        fixedUrl = fixedUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1):9000\//, `http://${PUBLIC_HOST}:${MINIO_PORT}/`);

        // Handle API ports
        fixedUrl = fixedUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000\//, `http://${PUBLIC_HOST}:${API_PORT}/`);
    }

    // 3. Handle relative paths if they occur (prefixed with /media or /storage)
    if (url.startsWith('/media/') || url.startsWith('/storage/')) {
        fixedUrl = `http://${PUBLIC_HOST}:${API_PORT}${url}`;
    }

    if (fixedUrl !== url) {
        console.log(`🔗 [fixUrl] Fixed: ${url.substring(0, 60)}${url.length > 60 ? '...' : ''} -> ${fixedUrl.substring(0, 60)}${fixedUrl.length > 60 ? '...' : ''}`);
    }

    return fixedUrl;
};

/**
 * Fix URLs in profile/user objects (Avatar, etc.)
 */
export const fixUserUrls = (user) => {
    if (!user) return user;

    // Create a deep enough copy
    const fixedUser = { ...user };

    if (fixedUser.avatar) fixedUser.avatar = fixUrl(fixedUser.avatar);
    if (fixedUser.avatar_url) fixedUser.avatar_url = fixUrl(fixedUser.avatar_url);
    if (fixedUser.url) fixedUser.url = fixUrl(fixedUser.url);
    if (fixedUser.preview_url) fixedUser.preview_url = fixUrl(fixedUser.preview_url);

    // Handle nested objects if they have these fields
    if (fixedUser.patient && typeof fixedUser.patient === 'object') {
        fixedUser.patient = fixUserUrls(fixedUser.patient);
    }

    return fixedUser;
};
