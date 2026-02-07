"use server";

import { createClient } from "@/utils/supabase/server";
import type { VisitorRequest } from "@/lib/types";

interface VisitorLogWithDuration extends VisitorRequest {
    formattedDuration?: string;
}

export async function getVisitorLogs(): Promise<{ success?: boolean; error?: string; logs?: VisitorLogWithDuration[] }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Unauthorized" };

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "super_admin") {
            return { error: "Unauthorized: Only Super Admin can view analytics." };
        }

        const { data: logs, error } = await supabase
            .from("visitor_requests")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching logs:", error);
            return { error: "Failed to fetch logs" };
        }

        return { success: true, logs: (logs || []) as VisitorLogWithDuration[] };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown analytics error";
        console.error("Analytics error:", error);
        return { error: message };
    }
}

export async function getDashboardSummary() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Unauthorized" };

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "super_admin") {
            return { error: "Unauthorized" };
        }

        // Get counts by status
        const { data: allRequests } = await supabase
            .from("visitor_requests")
            .select("status, department, created_at, check_in_time, check_out_time");

        if (!allRequests) return { error: "Failed to fetch data" };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const summary = {
            total: allRequests.length,
            pending: allRequests.filter(r => r.status === "pending").length,
            approved: allRequests.filter(r => r.status === "approved").length,
            checkedIn: allRequests.filter(r => r.status === "checked_in").length,
            checkedOut: allRequests.filter(r => r.status === "checked_out").length,
            rejected: allRequests.filter(r => r.status === "rejected").length,
            todayVisitors: allRequests.filter(r => r.created_at && new Date(r.created_at) >= today).length,
            byDepartment: {} as Record<string, number>,
            weeklyTrend: [] as { date: string; count: number }[],
        };

        // Count by department
        for (const req of allRequests) {
            const dept = req.department || "Unknown";
            summary.byDepartment[dept] = (summary.byDepartment[dept] || 0) + 1;
        }

        // Weekly trend (last 7 days)
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = allRequests.filter(r => {
                if (!r.created_at) return false;
                const created = new Date(r.created_at);
                return created >= date && created < nextDate;
            }).length;

            summary.weeklyTrend.push({
                date: date.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" }),
                count,
            });
        }

        return { success: true, summary };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch summary";
        console.error("Dashboard summary error:", error);
        return { error: message };
    }
}

/**
 * Get analytics summary for a specific department (department_admin only)
 */
export async function getDepartmentAnalytics(department: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Unauthorized" };

        const { data: profile } = await supabase
            .from("profiles")
            .select("role, department")
            .eq("id", user.id)
            .single();

        if (!profile || profile.role !== "department_admin" || profile.department !== department) {
            return { error: "Unauthorized" };
        }

        const { data: requests } = await supabase
            .from("visitor_requests")
            .select("status, created_at, check_in_time, check_out_time")
            .eq("department", department);

        if (!requests) return { error: "Failed to fetch data" };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const summary = {
            total: requests.length,
            pending: requests.filter(r => r.status === "pending").length,
            approved: requests.filter(r => r.status === "approved").length,
            checkedIn: requests.filter(r => r.status === "checked_in").length,
            checkedOut: requests.filter(r => r.status === "checked_out").length,
            rejected: requests.filter(r => r.status === "rejected").length,
            todayVisitors: requests.filter(r => r.created_at && new Date(r.created_at) >= today).length,
            weeklyTrend: [] as { date: string; count: number }[],
        };

        // Weekly trend (last 7 days)
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = requests.filter(r => {
                if (!r.created_at) return false;
                const created = new Date(r.created_at);
                return created >= date && created < nextDate;
            }).length;

            summary.weeklyTrend.push({
                date: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
                count,
            });
        }

        return { success: true, summary };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch department analytics";
        console.error("Department analytics error:", error);
        return { error: message };
    }
}
