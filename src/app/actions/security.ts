"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import type { VisitorRequest } from "@/lib/types";

// Lazy initialization — NOT module scope
function getServiceClient() {
    return createAdminClient();
}

const CORRECT_PIN = process.env.SECURITY_ACCESS_PIN;

export async function verifySecurityPin(pin: string) {
    if (!CORRECT_PIN) {
        return { success: false, error: "Server Configuration Error: PIN not set." };
    }

    if (pin === CORRECT_PIN) {
        // Set HTTP-only cookie
        (await cookies()).set("security_session", "valid", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 8, // 8 hours
            path: "/",
            sameSite: "lax",
        });
        return { success: true };
    } else {
        return { success: false, error: "Invalid Access PIN" };
    }
}

export async function logoutSecurity() {
    (await cookies()).delete("security_session");
    return { success: true };
}

async function checkAuth() {
    // Re-enabled security session check
    const session = (await cookies()).get("security_session");
    if (session?.value !== "valid") {
        throw new Error("Unauthorized: Invalid Security Session");
    }
    return;
}

export async function getVisitorByUid(uid: string) {
    if (!uid) return { error: "Invalid Visitor UID" };

    try {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from("visitor_requests")
            .select("*")
            .eq("visitor_uid", uid.toUpperCase())
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        console.log(`[Security] Searching UID: ${uid}. Found: ${data?.id}, Status: ${data?.status}`);

        if (error || !data) {
            return { error: "Visitor not found or invalid UID." };
        }

        return { success: true, visitor: data as VisitorRequest };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { error: message };
    }
}

export async function updateVisitorStatus(id: string, action: 'check_in' | 'check_out') {
    try {
        const supabase = getServiceClient();

        const timestamp = new Date().toISOString();
        const updates: Record<string, string> = {};
        let statusFilter: "pending" | "approved" | "rejected" | "checked_in" | "checked_out" = 'approved';

        if (action === 'check_in') {
            updates.status = 'checked_in';
            updates.check_in_time = timestamp;
            statusFilter = 'approved';
        } else {
            updates.status = 'checked_out';
            updates.check_out_time = timestamp;
            statusFilter = 'checked_in';
        }

        // Atomic Update: Update only if id matches AND current status matches expected flow
        const { data, error } = await supabase
            .from("visitor_requests")
            .update(updates)
            .eq("id", id)
            .eq("status", statusFilter)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            const { data: current } = await supabase.from("visitor_requests").select("status").eq("id", id).single();
            if (!current) throw new Error("Visitor not found");

            if (action === 'check_in' && current.status !== 'approved') {
                if (current.status === 'checked_in') throw new Error("Visitor already checked in.");
                if (current.status === 'checked_out') throw new Error("Visitor pass already used (checked out).");
                throw new Error(`Cannot check in. Visitor status is '${current.status}'.`);
            }
            if (action === 'check_out' && current.status !== 'checked_in') {
                if (current.status === 'checked_out') throw new Error("Visitor already checked out.");
                if (current.status === 'approved') throw new Error("Visitor has not checked in yet.");
                throw new Error(`Cannot check out. Visitor status is '${current.status}'.`);
            }
            throw new Error("Invalid status update.");
        }

        console.log(`[Security] Update Success: ID ${id} -> ${action}`);
        revalidatePath('/security');
        revalidatePath('/admin/dept');
        revalidatePath('/admin/super');
        return { success: true, message: `Visitor ${action === 'check_in' ? 'checked in' : 'checked out'} successfully.`, updates };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { error: message };
    }
}

// Get all currently checked-in visitors (for emergency evacuation)
export async function getCheckedInVisitors() {
    try {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from("visitor_requests")
            .select("*")
            .eq("status", "checked_in")
            .order("check_in_time", { ascending: false });

        if (error) throw error;

        return { success: true, visitors: (data || []) as VisitorRequest[] };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { error: message };
    }
}
