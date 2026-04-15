"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Create an untyped admin client for audit_logs table.
 * The audit_logs table isn't in the auto-generated Supabase types yet,
 * so we use an untyped client to avoid TypeScript errors.
 */
function getAuditClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined");
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export interface AuditLogEntry {
    action: string;
    performed_by: string;
    performed_by_email: string;
    target_id: string;
    target_type: "visitor" | "user" | "password_reset" | "system";
    details: string;
}

/**
 * Log an audit event. Uses an untyped client since audit_logs
 * table may not be in generated types yet.
 * Falls back gracefully if the table doesn't exist.
 */
export async function logAuditEvent(entry: AuditLogEntry) {
    try {
        const client = getAuditClient();

        const { error } = await client.from("audit_logs").insert({
            action: entry.action,
            performed_by: entry.performed_by,
            performed_by_email: entry.performed_by_email,
            target_id: entry.target_id,
            target_type: entry.target_type,
            details: entry.details,
            created_at: new Date().toISOString(),
        });

        if (error) {
            // Silently fail if table doesn't exist yet — don't break the main flow
            console.warn("[Audit] Failed to log event:", error.message);
        }
    } catch (err) {
        console.warn("[Audit] Logging skipped:", err);
    }
}

/**
 * Get audit logs (Super Admin only)
 */
export async function getAuditLogs(limit: number = 50) {
    try {
        const supabase = await createServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return { error: "Unauthorized", logs: [] };

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "super_admin") {
            return { error: "Unauthorized", logs: [] };
        }

        const client = getAuditClient();
        const { data: logs, error } = await client
            .from("audit_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("[Audit] Failed to fetch logs:", error.message);
            return { error: "Failed to fetch audit logs", logs: [] };
        }

        return { success: true, logs: logs || [] };
    } catch (err) {
        console.error("[Audit] Error:", err);
        return { error: "Failed to fetch audit logs", logs: [] };
    }
}
