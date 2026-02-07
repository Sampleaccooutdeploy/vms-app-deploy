// Application Constants - Extracted from magic numbers throughout the codebase

export const APP_NAME = "SCSVMV Visitor Management System";
export const APP_SHORT_NAME = "SCSVMV VMS";
export const UNIVERSITY_NAME = "Sri Chandrasekharendra Saraswathi Viswa Mahavidyalaya";
export const UNIVERSITY_SHORT = "SCSVMV";

// UID Generation
export const UID_PREFIX = "SCSVMV";
export const UID_RANDOM_LENGTH = 6; // 6 digits = 900,000 combos vs old 4 digits = 9,000
export const UID_MONTH_CODES = ["J", "F", "M", "A", "Y", "U", "L", "G", "S", "O", "N", "D"] as const;

// Time Windows
export const APPROVED_VISITORS_WINDOW_DAYS = 30;
export const SECURITY_SESSION_DURATION_HOURS = 8;
export const TOAST_AUTO_DISMISS_MS = 4000;
export const FORM_AUTOSAVE_DELAY_MS = 1000;

// File Upload
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Rate Limiting (in-memory, per server instance)
export const LOGIN_RATE_LIMIT_MAX = 5; // max attempts
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const PUBLIC_FORM_RATE_LIMIT_MAX = 10;
export const PUBLIC_FORM_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Departments
export const DEPARTMENTS = [
    "CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "EIE",
    "ADMINISTRATION", "LIBRARY", "HOSTEL"
] as const;

export type Department = typeof DEPARTMENTS[number];

// Roles
export const ROLES = ["super_admin", "department_admin", "security"] as const;
export type UserRole = typeof ROLES[number];

// Visit Statuses
export const VISIT_STATUSES = ["pending", "approved", "rejected", "checked_in", "checked_out"] as const;
export type VisitStatus = typeof VISIT_STATUSES[number];

// Password
export const MIN_PASSWORD_LENGTH = 6;

// i18n supported locales
export const SUPPORTED_LOCALES = ["en", "ta", "hi"] as const;
export const DEFAULT_LOCALE = "en" as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
