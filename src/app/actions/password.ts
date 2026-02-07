"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { passwordResetRequestSchema, processPasswordResetSchema } from "@/lib/validations";
import type { PasswordResetRequest } from "@/lib/types";

/**
 * Submit a password reset request (called from login page)
 * Does NOT require authentication - anyone can request
 */
export async function submitPasswordResetRequest(email: string) {
    // Validate with Zod
    const validation = passwordResetRequestSchema.safeParse({ email });
    if (!validation.success) {
        return { success: false, error: validation.error.issues[0].message };
    }

    // Rate limit: 3 requests per 15 minutes per email
    const rateLimitKey = getRateLimitKey("password-reset", email.toLowerCase());
    const { allowed, remaining } = rateLimit(rateLimitKey, 3, 15 * 60 * 1000);
    if (!allowed) {
        return { success: false, error: "Too many requests. Please try again later." };
    }

    // Use admin client because this function is called from the login page
    // where the user is NOT authenticated — the regular client (anon role)
    // cannot read/write to password_reset_requests due to RLS policies.
    const adminClient = createAdminClient();

    // Check if this email exists in our profiles
    const { data: profile } = await adminClient
        .from("profiles")
        .select("id, email")
        .eq("email", email)
        .single();

    if (!profile) {
        // Don't reveal if email exists or not for security
        return { success: true, message: "If this email is registered, a request has been submitted." };
    }

    // Check for existing pending request
    const { data: existingRequest } = await adminClient
        .from("password_reset_requests")
        .select("id")
        .eq("email", email)
        .eq("status", "pending")
        .single();

    if (existingRequest) {
        return { success: true, message: "A password reset request is already pending for this email." };
    }

    // Create new password reset request
    const { error } = await adminClient
        .from("password_reset_requests")
        .insert({ email });

    if (error) {
        console.error("Failed to create password reset request:", error);
        return { success: false, error: "Failed to submit request. Please try again." };
    }

    return { success: true, message: "Password reset request submitted. The admin will process it shortly." };
}

/**
 * Get all password reset requests (Super Admin only)
 */
export async function getPasswordResetRequests(): Promise<{ success: boolean; error?: string; requests: PasswordResetRequest[] }> {
    const supabase = await createClient();

    // Verify super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Unauthorized", requests: [] };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "super_admin") {
        return { success: false, error: "Unauthorized: Super admin access required", requests: [] };
    }

    // Fetch all pending requests
    const { data: requests, error } = await supabase
        .from("password_reset_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to fetch password reset requests:", error);
        return { success: false, error: "Failed to fetch requests", requests: [] };
    }

    return { success: true, requests: (requests || []) as PasswordResetRequest[] };
}

/**
 * Process a password reset request (Super Admin only)
 * Updates the user's password and sends an email with new credentials
 */
export async function processPasswordReset(requestId: string, newPassword: string) {
    // Validate
    const validation = processPasswordResetSchema.safeParse({ requestId, newPassword });
    if (!validation.success) {
        return { success: false, error: validation.error.issues[0].message };
    }

    const supabase = await createClient();

    // Verify super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    const { data: adminProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (adminProfile?.role !== "super_admin") {
        return { success: false, error: "Unauthorized: Super admin access required" };
    }

    // Get the password reset request
    const { data: resetRequest, error: fetchError } = await supabase
        .from("password_reset_requests")
        .select("*")
        .eq("id", requestId)
        .eq("status", "pending")
        .single();

    if (fetchError || !resetRequest) {
        return { success: false, error: "Request not found or already processed" };
    }

    // Find the user by email
    const { data: userProfile } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", resetRequest.email)
        .single();

    if (!userProfile) {
        return { success: false, error: "User not found with this email" };
    }

    // Update the user's password using admin client
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
        userProfile.id,
        { password: newPassword }
    );

    if (updateError) {
        console.error("Failed to update user password:", updateError);
        return { success: false, error: "Failed to update password" };
    }

    // Mark request as completed
    const { error: markError } = await supabase
        .from("password_reset_requests")
        .update({
            status: "completed",
            updated_at: new Date().toISOString()
        })
        .eq("id", requestId);

    if (markError) {
        console.error("Failed to mark request as completed:", markError);
    }

    // Send email with new credentials
    const { sendPasswordResetEmail } = await import("@/utils/email");
    const emailResult = await sendPasswordResetEmail(
        resetRequest.email,
        resetRequest.email,
        newPassword
    );

    if (!emailResult.success) {
        console.error("Failed to send password reset email:", emailResult.error);
        return {
            success: true,
            message: "Password updated but email failed to send. Manual notification required.",
            emailSent: false
        };
    }

    revalidatePath("/admin/super");

    return {
        success: true,
        message: "Password updated and email sent successfully!",
        emailSent: true
    };
}
