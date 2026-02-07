import type { Database } from "@/types/supabase";

// Row types from database
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type VisitorRequest = Database["public"]["Tables"]["visitor_requests"]["Row"];
export type PasswordResetRequest = Database["public"]["Tables"]["password_reset_requests"]["Row"];

// Insert types
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type VisitorRequestInsert = Database["public"]["Tables"]["visitor_requests"]["Insert"];

// Update types
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type VisitorRequestUpdate = Database["public"]["Tables"]["visitor_requests"]["Update"];

// Enum types
export type UserRole = Database["public"]["Enums"]["user_role"];
export type VisitStatus = Database["public"]["Enums"]["visit_status"];

// Extended types for UI
export interface VisitorRequestWithDuration extends VisitorRequest {
    formattedDuration?: string;
}

// Audit Trail
export interface AuditEntry {
    id: string;
    action: string;
    performedBy: string;
    performedByEmail: string;
    targetId: string;
    targetType: "visitor" | "user" | "password_reset";
    details: string;
    timestamp: string;
}

// Analytics summary cards
export interface DashboardSummary {
    totalVisitors: number;
    pendingRequests: number;
    todayVisitors: number;
    checkedInNow: number;
    approvedToday: number;
    rejectedToday: number;
}

// Server Action Response
export interface ActionResponse<T = undefined> {
    success: boolean;
    error?: string;
    message?: string;
    data?: T;
}

// Pagination
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// Sort config
export interface SortConfig {
    key: string;
    direction: "asc" | "desc";
}

// Notification
export interface NotificationData {
    open: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
}

// Multi-day pass
export interface MultiDayPass {
    startDate: string;
    endDate: string;
    daysAllowed: number;
}

// Group visit
export interface GroupVisitor {
    name: string;
    designation: string;
    phone: string;
    email: string;
}
