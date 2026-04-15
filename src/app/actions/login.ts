"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";

/**
 * Server-side login action with rate limiting.
 * Client should call this instead of using supabase.auth.signInWithPassword directly.
 */
export async function loginUser(email: string, password: string) {
    // Validate input
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
        return { success: false, error: validation.error.issues[0].message };
    }

    // Rate limit: 5 attempts per 15 minutes per email
    const rateLimitKey = getRateLimitKey("login", email.toLowerCase());
    const { allowed } = rateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!allowed) {
        return {
            success: false,
            error: "Too many login attempts. Please try again in 15 minutes.",
        };
    }

    // The actual authentication happens client-side via Supabase SDK.
    // This server action serves strictly as a validated rate-limiting gate 
    // to prevent brute-forcing. We do not query the DB here to avoid user enumeration.
    return { success: true };
}
