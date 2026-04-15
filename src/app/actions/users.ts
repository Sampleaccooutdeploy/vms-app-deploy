"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { createUserSchema } from "@/lib/validations";
import type { Profile } from "@/lib/types";
import { logAuditEvent } from "./audit";

export async function deleteUser(userId: string) {
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
            return { error: "Unauthorized: Only Super Admin can delete users." };
        }

        const adminSupabase = createAdminClient();

        // 1. Delete from Profiles FIRST (to avoid FK constraint issues)
        const { error: dbError } = await adminSupabase
            .from("profiles")
            .delete()
            .eq("id", userId);

        if (dbError) {
            console.error("Profile delete error:", dbError);
        }

        // 2. Delete from Auth (requires service role)
        const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId);
        if (authError) {
            console.error("Auth delete error:", authError);
            return { error: `Failed to delete from Auth: ${authError.message}` };
        }

        revalidatePath("/admin/super");

        // Audit log
        logAuditEvent({
            action: "delete_user",
            performed_by: user.id,
            performed_by_email: user.email || "unknown",
            target_id: userId,
            target_type: "user",
            details: `Deleted user ${userId}`,
        });

        return { success: true, message: "User deleted successfully." };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to delete user.";
        console.error("Delete user error:", error);
        return { error: message };
    }
}

export async function getUsers(): Promise<{ success?: boolean; error?: string; users?: Profile[] }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Unauthorized" };
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (profile?.role !== "super_admin") return { error: "Unauthorized" };

        const { data: users, error } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { success: true, users: (users || []) as Profile[] };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch users";
        console.error("Get users error:", error);
        return { error: message };
    }
}

export async function createUser(formData: FormData) {
    const rawData = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        role: formData.get("role") as string,
        department: formData.get("department") as string,
    };

    // Validate with Zod
    const validation = createUserSchema.safeParse(rawData);
    if (!validation.success) {
        const firstError = validation.error.issues[0];
        return { error: firstError.message };
    }

    const { email, password, role, department } = validation.data;

    // 1. Verify Requestor is Super Admin
    const supabase = await createClient();
    const { data: { user: requestor } } = await supabase.auth.getUser();

    if (!requestor) return { error: "Unauthorized" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", requestor.id)
        .single();

    if (profile?.role !== "super_admin") {
        return { error: "Unauthorized: Only Super Admins can create users." };
    }

    // 2. Create or Update User using Service Role
    const adminSupabase = createAdminClient();

    // Try to create the user first
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (createError) {
        if (createError.message.toLowerCase().includes('already')) {
            return { error: "A user with this email already exists." };
        }
        return { error: createError.message };
    }

    if (!newUser.user) {
        return { error: "Failed to create user" };
    }

    // 3. Create Profile Entry
    const { error: profileError } = await adminSupabase
        .from("profiles")
        .insert({
            id: newUser.user.id,
            email: email,
            role: role,
            department: role === 'department_admin' ? department : null
        });

    if (profileError) {
        // Cleanup: Delete the auth user if profile creation fails
        await adminSupabase.auth.admin.deleteUser(newUser.user.id);
        console.error("Profile creation failed, rolled back user:", profileError);
        return { error: "User created but profile setup failed. User creation rolled back. Error: " + profileError.message };
    }

    revalidatePath("/admin/super");
    return { success: true, message: `User ${email} created successfully.` };
}
