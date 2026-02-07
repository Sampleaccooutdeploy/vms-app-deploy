"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UID_PREFIX, UID_RANDOM_LENGTH, UID_MONTH_CODES } from "@/lib/constants";

/**
 * Generate a unique visitor UID with retry logic to avoid collisions.
 * Format: SCSVMV######M (e.g. SCSVMV102345J)
 */
function generateUID(): string {
    const currentMonthCode = UID_MONTH_CODES[new Date().getMonth()];
    const min = Math.pow(10, UID_RANDOM_LENGTH - 1);
    const max = Math.pow(10, UID_RANDOM_LENGTH) - 1;
    const uniqueNumber = Math.floor(min + Math.random() * (max - min + 1));
    return `${UID_PREFIX}${uniqueNumber}${currentMonthCode}`;
}

export async function approveVisitor(formData: FormData) {
    const requestId = formData.get("id") as string;

    if (!requestId) {
        return { error: "Request ID is required" };
    }

    const supabase = await createClient();

    // 1. Verify User is Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login?role=admin");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, department")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "department_admin") {
        return { error: "Unauthorized: Only Department Admins can approve requests." };
    }

    // 2. Fetch the request to verify department match
    const { data: request } = await supabase
        .from("visitor_requests")
        .select("department, name, email, status")
        .eq("id", requestId)
        .single();

    if (!request || request.department !== profile.department) {
        return { error: "Unauthorized or Request Not Found" };
    }

    if (request.status !== "pending") {
        return { error: "This request has already been processed." };
    }

    // 3. Generate UID with collision retry (up to 5 attempts)
    let uid = "";
    let retries = 5;
    while (retries > 0) {
        uid = generateUID();
        const { data: existing } = await supabase
            .from("visitor_requests")
            .select("id")
            .eq("visitor_uid", uid)
            .maybeSingle();

        if (!existing) break; // No collision
        retries--;
    }

    if (retries === 0) {
        return { error: "Failed to generate unique UID. Please try again." };
    }

    // 4. Update Database
    const { error } = await supabase
        .from("visitor_requests")
        .update({
            status: "approved",
            visitor_uid: uid
        })
        .eq("id", requestId);

    if (error) {
        return { error: "Failed to approve request: " + error.message };
    }

    // 5. Send Email
    const { sendApprovalEmail } = await import("@/utils/email");
    const emailResult = await sendApprovalEmail(
        request.email || "visitor@example.com",
        request.name,
        uid,
        request.department
    );

    if (!emailResult.success) {
        console.error("Failed to send approval email:", emailResult.error);
    }

    // 6. Revalidate Dashboard
    revalidatePath("/admin/dept");
    return { success: true, message: `Visitor approved with UID: ${uid}` };
}

export async function rejectVisitor(formData: FormData) {
    const requestId = formData.get("id") as string;
    const reason = (formData.get("reason") as string) || "No reason provided";

    if (!requestId) {
        return { error: "Request ID is required" };
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login?role=admin");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, department")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "department_admin") {
        return { error: "Unauthorized" };
    }

    const { data: request } = await supabase
        .from("visitor_requests")
        .select("department, status")
        .eq("id", requestId)
        .single();

    if (!request || request.department !== profile.department) {
        return { error: "Unauthorized or Request Not Found" };
    }

    if (request.status !== "pending") {
        return { error: "This request has already been processed." };
    }

    const { error } = await supabase
        .from("visitor_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

    if (error) {
        return { error: "Failed to reject request: " + error.message };
    }

    revalidatePath("/admin/dept");
    return { success: true, message: "Visitor request rejected." };
}
