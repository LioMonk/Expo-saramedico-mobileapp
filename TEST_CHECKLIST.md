# TEST CHECKLIST - Sara Medico Mobile App

## 🟢 1. Authentication & Security
- [ ] Login with Email/Password (Patient)
- [ ] Login with Email/Password (Doctor)
- [ ] Login with Email/Password (Hospital/Admin)
- [ ] Sign Up (Patient)
- [ ] Sign Up (Doctor)
- [ ] Sign Up (Hospital/Organization)
- [ ] Google OAuth Login
- [ ] Forgot Password Flow
- [ ] Token Refresh Logic (401 Interceptor)
- [ ] Multi-Factor Authentication (MFA) Setup

## 🟢 2. Patient Dashboard & Features
- [ ] Dashboard Metrics Loading
- [ ] Appointment Request
- [ ] View My Appointments
- [ ] Upload Medical History (File Upload)
- [ ] View My Documents
- [ ] Search Doctors
- [ ] Profile Settings Update

## 🟢 3. Doctor Dashboard & Features
- [ ] Dashboard Metrics Loading
- [ ] View Scheduled Appointments
- [ ] Approve/Reject Appointment
- [ ] Start Consultation
- [ ] Complete Consultation (SOAP Note Generation)
- [ ] AI Diagnosis Assist Chat
- [ ] Patient Directory Search
- [ ] Add Health Metrics for Patient

## 🟢 4. Hospital/Admin Dashboard
- [ ] Organization Overview Loading
- [ ] Staff Management (Invite/Update/Remove)
- [ ] Patient Records Overview
- [ ] Department-specific Doctor View
- [ ] Audit Logs View
- [ ] Organization Settings Update

## 🟢 5. Technical & Integration
- [ ] API Base URL Configuration (Local/AWS)
- [ ] MinIO Image Rendering (Avatar & Documents)
- [ ] Error Handling (Toasts & Alerts)
- [ ] Network Error Handling (Offline state)
- [ ] AI Stream Chat Integration
