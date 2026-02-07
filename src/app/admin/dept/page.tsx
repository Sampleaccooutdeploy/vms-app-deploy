import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import styles from "./page.module.css";
import { logout } from "@/app/actions/auth";
import { UserIcon, BuildingOfficeIcon, PhoneIcon, CheckBadgeIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import DepartmentClient from "./DepartmentClient";

export default async function DepartmentDashboard() {
    const supabase = await createClient();

    // 1. Verify User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login?role=department_admin");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, department")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "department_admin" || !profile.department) {
        redirect("/"); // Unauthorized
    }

    // 2. Fetch Pending Requests
    const { data: pendingRequests } = await supabase
        .from("visitor_requests")
        .select("*")
        .eq("department", profile.department)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    // 3. Fetch Approved Visitors (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: approvedVisitors } = await supabase
        .from("visitor_requests")
        .select("*")
        .eq("department", profile.department)
        .eq("status", "approved")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });



    return (
        <div className="container">
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <a href="/" className={styles.backBtn} title="Go back">
                        <ArrowLeftIcon style={{ width: 20, height: 20 }} />
                    </a>
                    <div>
                        <h1>Department Dashboard</h1>
                        <p className={styles.subtitle}>{profile.department} Department</p>
                    </div>
                </div>
                <form action={logout} style={{ marginLeft: 'auto' }}>
                    <button className="btn btn-danger">
                        Logout
                    </button>
                </form>
            </header>

            {/* Client Component handles Search, Filter, Modal & Analytics */}
            <DepartmentClient
                pendingRequests={pendingRequests || []}
                approvedVisitors={approvedVisitors || []}
                department={profile.department}
            />

        </div>
    );
}
