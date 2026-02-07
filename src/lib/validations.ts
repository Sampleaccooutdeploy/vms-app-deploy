import { z } from "zod/v4";
import { DEPARTMENTS, ALLOWED_PHOTO_TYPES, MAX_PHOTO_SIZE_BYTES, MIN_PASSWORD_LENGTH, ROLES } from "./constants";

// Visitor Registration Schema
export const visitorRegistrationSchema = z.object({
    name: z.string().min(1, "Name is required").max(30, "Name must be 30 characters or less"),
    designation: z.string().min(1, "Designation is required").max(100),
    organization: z.string().min(1, "Organization is required").max(200),
    phone: z.string().min(7, "Phone number must be at least 7 digits").max(20),
    email: z.email("Please enter a valid email address"),
    purpose: z.string().min(1, "Purpose is required").max(500),
    department: z.enum(DEPARTMENTS, { message: "Please select a valid department" }),
});

// Login Schema
export const loginSchema = z.object({
    email: z.email("Please enter a valid email address"),
    password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
});

// Create User Schema
export const createUserSchema = z.object({
    email: z.email("Please enter a valid email address"),
    password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
    role: z.enum(["department_admin", "security"] as const, { message: "Invalid role" }),
    department: z.string().optional(),
}).refine(
    (data) => data.role !== "department_admin" || (data.department && data.department.length > 0),
    { message: "Department is required for department admins", path: ["department"] }
);

// Password Reset Request Schema
export const passwordResetRequestSchema = z.object({
    email: z.email("Please enter a valid email address"),
});

// Password Reset Process Schema
export const processPasswordResetSchema = z.object({
    requestId: z.string().uuid("Invalid request ID"),
    newPassword: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
});

// Visitor UID Search Schema
export const visitorUidSearchSchema = z.object({
    uid: z.string().min(1, "UID is required").max(20).transform(val => val.toUpperCase()),
});

// File validation helper (can't use Zod for File objects directly)
export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
        return { valid: false, error: `File size must be less than ${MAX_PHOTO_SIZE_BYTES / 1024 / 1024}MB` };
    }
    if (!ALLOWED_PHOTO_TYPES.includes(file.type as typeof ALLOWED_PHOTO_TYPES[number])) {
        return { valid: false, error: "Only JPEG, PNG, or WebP images are allowed" };
    }
    return { valid: true };
}

// Pagination Schema
export const paginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
});

// Appointment Scheduling Schema
export const appointmentSchema = z.object({
    date: z.string().min(1, "Date is required"),
    timeSlot: z.string().min(1, "Time slot is required"),
    visitorId: z.string().uuid().optional(),
});

export type VisitorRegistrationData = z.infer<typeof visitorRegistrationSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
