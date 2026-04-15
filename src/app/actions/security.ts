"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { createHmac } from "crypto";
import type { VisitorRequest } from "@/lib/types";

// Lazy initialization — NOT module scope
function getServiceClient() {
    return createAdminClient();
}

const CORRECT_PIN = process.env.SECURITY_ACCESS_PIN;
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 hours

/**
 * Create an HMAC-signed session token with embedded expiry.
 * Format: "expiry:hmac_hex"
 */
function createSignedToken(): string {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-secret";
    const expiry = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
    const payload = `security_session:${expiry}`;
    const hmac = createHmac("sha256", secret).update(payload).digest("hex");
    return `${expiry}:${hmac}`;
}

/**
 * Verify an HMAC-signed session token.
 */
function verifySignedToken(token: string): boolean {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-secret";
    const parts = token.split(":");
    if (parts.length !== 2) return false;

    const [expiryStr, providedHmac] = parts;
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Math.floor(Date.now() / 1000) > expiry) return false;

    const payload = `security_session:${expiry}`;
    const expectedHmac = createHmac("sha256", secret).update(payload).digest("hex");

    // Timing-safe comparison
    if (providedHmac.length !== expectedHmac.length) return false;
    let mismatch = 0;
    for (let i = 0; i < providedHmac.length; i++) {
        mismatch |= providedHmac.charCodeAt(i) ^ expectedHmac.charCodeAt(i);
    }
    return mismatch === 0;
}

export async function verifySecurityPin(pin: string) {
    if (!CORRECT_PIN) {
        return { success: false, error: "Server Configuration Error: PIN not set." };
    }

    // Rate limit: 5 attempts per 15 minutes
    const rateLimitKey = getRateLimitKey("security-pin", "global");
    const { allowed } = rateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!allowed) {
        return { success: false, error: "Too many attempts. Please try again in 15 minutes." };
    }

    if (pin === CORRECT_PIN) {
        // Set HTTP-only cookie with HMAC-signed token
        const token = createSignedToken();
        (await cookies()).set("security_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: SESSION_DURATION_SECONDS,
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
    const session = (await cookies()).get("security_session");
    if (!session?.value || !verifySignedToken(session.value)) {
        throw new Error("Unauthorized: Invalid Security Session");
    }
    return;
}

/** Mask sensitive ID proof number — only last 4 digits visible */
function maskIdProof(record: { id_proof_type?: string | null; id_proof_number?: string | null }) {
    if (!record.id_proof_number) return;
    const raw = record.id_proof_number.replace(/\s/g, "");
    if (record.id_proof_type === "aadhar" && raw.length === 12) {
        record.id_proof_number = `XXXX XXXX ${raw.slice(8)}`;
    } else if (raw.length > 4) {
        record.id_proof_number = "X".repeat(raw.length - 4) + raw.slice(-4);
    }
}

export async function getVisitorByUid(uid: string) {
    if (!uid) return { error: "Invalid Visitor UID" };

    try {
        await checkAuth();
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

        // Mask sensitive ID proof number before sending to client
        maskIdProof(data);

        return { success: true, visitor: data as VisitorRequest };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { error: message };
    }
}

export async function updateVisitorStatus(id: string, action: 'check_in' | 'check_out') {
    try {
        await checkAuth();
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
        await checkAuth();
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from("visitor_requests")
            .select("*")
            .eq("status", "checked_in")
            .order("check_in_time", { ascending: false });

        if (error) throw error;

        // Mask sensitive ID proof numbers for all returned visitors
        const visitors = (data || []) as VisitorRequest[];
        visitors.forEach(maskIdProof);

        return { success: true, visitors };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { error: message };
    }
}

// Get all visitor activity for today (checked-in + checked-out)
export async function getDailyActivity() {
    try {
        await checkAuth();
        const supabase = getServiceClient();

        // Build today's date range in UTC (start of day → end of day)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

        // Fetch visitors who checked in today OR checked out today
        const { data, error } = await supabase
            .from("visitor_requests")
            .select("*")
            .in("status", ["checked_in", "checked_out"])
            .or(`check_in_time.gte.${startOfDay},check_out_time.gte.${startOfDay}`)
            .order("check_in_time", { ascending: false });

        if (error) throw error;

        // Filter to only today's activity (belt & suspenders)
        const visitors = (data || []).filter((v) => {
            const cin = v.check_in_time ? new Date(v.check_in_time) : null;
            const cout = v.check_out_time ? new Date(v.check_out_time) : null;
            return (cin && cin >= new Date(startOfDay) && cin < new Date(endOfDay))
                || (cout && cout >= new Date(startOfDay) && cout < new Date(endOfDay));
        }) as VisitorRequest[];

        visitors.forEach(maskIdProof);

        return { success: true, visitors };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { error: message };
    }
}
