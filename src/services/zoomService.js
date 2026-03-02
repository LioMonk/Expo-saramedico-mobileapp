// Zoom SDK removed — video calls will be handled via Google Meet (backend)
// This file is a stub to prevent import errors during migration

const zoomService = {
    initializeSDK: async () => {
        console.warn('Zoom SDK removed. Video calls handled via Google Meet.');
        return false;
    },
    joinMeetingAsHost: async (meetingData) => {
        console.warn('Zoom SDK removed. Video calls handled via Google Meet.');
        return { success: false, message: 'Video calls now use Google Meet. Please check your email for the meeting link.' };
    },
    joinMeetingAsParticipant: async (meetingData) => {
        console.warn('Zoom SDK removed. Video calls handled via Google Meet.');
        return { success: false, message: 'Video calls now use Google Meet. Please check your appointment for the meeting link.' };
    },
    leaveMeeting: async () => {
        console.warn('Zoom SDK removed. Video calls handled via Google Meet.');
        return { success: false };
    },
};

export default zoomService;
