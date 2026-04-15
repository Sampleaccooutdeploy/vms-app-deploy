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

// Designation suggestions (university/institutional context)
export const DESIGNATIONS = [
    // Academic
    "Professor",
    "Associate Professor",
    "Assistant Professor",
    "Senior Professor",
    "Visiting Professor",
    "Adjunct Professor",
    "Emeritus Professor",
    "Guest Lecturer",
    "Lecturer",
    "Senior Lecturer",
    "Research Scholar",
    "Research Associate",
    "Post-Doctoral Fellow",
    "Teaching Assistant",
    "Lab Instructor",
    // Students
    "Student",
    "PhD Scholar",
    "M.Tech Student",
    "B.Tech Student",
    "MBA Student",
    "MCA Student",
    // Administrative
    "Dean",
    "Head of Department",
    "Registrar",
    "Controller of Examinations",
    "Director",
    "Deputy Director",
    "Coordinator",
    "Administrative Officer",
    "Office Superintendent",
    "Clerk",
    "Accountant",
    "Cashier",
    // Technical
    "System Administrator",
    "Lab Technician",
    "Technical Assistant",
    "IT Manager",
    "Network Engineer",
    "Software Engineer",
    "Developer",
    // Management
    "Managing Director",
    "CEO",
    "CTO",
    "CFO",
    "General Manager",
    "Manager",
    "Senior Manager",
    "Project Manager",
    "Team Lead",
    "Supervisor",
    // External / Visitors
    "Consultant",
    "Auditor",
    "Inspector",
    "Vendor",
    "Contractor",
    "Parent",
    "Guardian",
    "Alumni",
    "Journalist",
    "Photographer",
    // Government
    "Government Official",
    "IAS Officer",
    "IPS Officer",
    "District Collector",
    "Block Development Officer",
    // Library & Support
    "Librarian",
    "Assistant Librarian",
    "Warden",
    "Security Officer",
    "Estate Officer",
    "Transport Officer",
    // Medical
    "Doctor",
    "Medical Officer",
    "Nurse",
    "Counselor",
    // Others
    "Entrepreneur",
    "Freelancer",
    "Self-Employed",
    "Retired Professional",
    "Homemaker",
    "Other",
] as const;

// Roles
export const ROLES = ["super_admin", "department_admin", "security"] as const;
export type UserRole = typeof ROLES[number];

// Identity Proof Types
export const ID_PROOF_TYPES = [
    { value: "aadhar", label: "Aadhar Card", pattern: /^\d{12}$/, placeholder: "Enter 12-digit Aadhar number", maxLength: 14, hint: "12-digit number (e.g. 1234 5678 9012)" },
    { value: "pan", label: "PAN Card", pattern: /^[A-Z]{5}\d{4}[A-Z]$/, placeholder: "Enter PAN (e.g. ABCDE1234F)", maxLength: 10, hint: "Format: ABCDE1234F" },
    { value: "passport", label: "Passport", pattern: /^[A-Z]\d{7}$/, placeholder: "Enter passport number (e.g. A1234567)", maxLength: 8, hint: "1 letter followed by 7 digits" },
    { value: "driving_license", label: "Driving License", pattern: /^[A-Z]{2}\d{2}\s?\d{11}$/, placeholder: "Enter DL number (e.g. TN01 20230001234)", maxLength: 16, hint: "State code + 13 digits" },
    { value: "voter_id", label: "Voter ID", pattern: /^[A-Z]{3}\d{7}$/, placeholder: "Enter Voter ID (e.g. ABC1234567)", maxLength: 10, hint: "3 letters followed by 7 digits" },
    { value: "college_id", label: "College / Employee ID", pattern: /^.{3,20}$/, placeholder: "Enter your institutional ID", maxLength: 20, hint: "Institutional ID as printed on card" },
    { value: "other", label: "Other Government ID", pattern: /^.{3,30}$/, placeholder: "Enter ID number", maxLength: 30, hint: "Any valid government-issued ID" },
] as const;

export type IdProofType = typeof ID_PROOF_TYPES[number]["value"];

// Visit Statuses
export const VISIT_STATUSES = ["pending", "approved", "rejected", "checked_in", "checked_out"] as const;
export type VisitStatus = typeof VISIT_STATUSES[number];

// Password
export const MIN_PASSWORD_LENGTH = 8;

// i18n supported locales
export const SUPPORTED_LOCALES = ["en", "ta", "hi"] as const;
export const DEFAULT_LOCALE = "en" as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
