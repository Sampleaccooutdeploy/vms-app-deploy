"use server";

import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Notify department admin(s) via email when a new visitor request is submitted.
 * Uses admin client because this is called from the public registration page
 * where the user is NOT authenticated.
 */
export async function notifyDepartmentAdmin(
    department: string,
    visitorName: string,
    visitorEmail: string,
    organization: string,
    purpose: string
) {
    try {
        const adminClient = createAdminClient();

        // Find department admin(s) for this department
        const { data: admins, error } = await adminClient
            .from("profiles")
            .select("email")
            .eq("role", "department_admin")
            .eq("department", department);

        if (error || !admins || admins.length === 0) {
            console.warn(`[Notify] No department admins found for ${department}:`, error?.message);
            return { success: false, error: "No department admin found" };
        }

        // Send email to all admins of this department
        const { sendNewRequestNotificationEmail } = await import("@/utils/email");

        const results = await Promise.allSettled(
            admins
                .filter((admin) => admin.email) // skip null emails
                .map((admin) =>
                    sendNewRequestNotificationEmail(
                        admin.email!,
                        visitorName,
                        visitorEmail,
                        organization,
                        department,
                        purpose
                    )
                )
        );

        const sent = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
        const failed = results.length - sent;

        console.log(`[Notify] Department ${department}: ${sent} sent, ${failed} failed`);

        return { success: true, sent, failed };
    } catch (error) {
        console.error("[Notify] Error notifying department admin:", error);
        return { success: false, error: "Failed to send notification" };
    }
}
