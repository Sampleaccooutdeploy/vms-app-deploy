"use client";

import { useState, useEffect, useMemo } from "react";
import { approveVisitor, rejectVisitor } from "@/app/actions/approve";
import { resendVisitorEmail } from "@/app/actions/resend";
import { getDepartmentAnalytics } from "@/app/actions/analytics";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/Toast";
import {
    BuildingOfficeIcon,
    PhoneIcon,
    CheckBadgeIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    BellAlertIcon,
    EnvelopeIcon,
    CalendarDaysIcon,
    ClockIcon,
    BriefcaseIcon,
    ChatBubbleBottomCenterTextIcon,
    MapPinIcon,
    UserIcon,
    IdentificationIcon,
    ArrowRightStartOnRectangleIcon,
    ArrowLeftEndOnRectangleIcon,
} from "@heroicons/react/24/outline";
import styles from "./page.module.css";
import { CustomDialog } from "@/components/ui/CustomDialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { VisitorRequest } from "@/lib/types";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

interface DeptAnalytics {
    total: number;
    pending: number;
    approved: number;
    checkedIn: number;
    checkedOut: number;
    rejected: number;
    todayVisitors: number;
    weeklyTrend: { date: string; count: number }[];
}

interface DepartmentClientProps {
    pendingRequests: VisitorRequest[];
    approvedVisitors: VisitorRequest[];
    department: string;
}

export default function DepartmentClient({ pendingRequests, approvedVisitors, department }: DepartmentClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVisitor, setSelectedVisitor] = useState<VisitorRequest | null>(null);
    const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
    const [analytics, setAnalytics] = useState<DeptAnalytics | null>(null);

    // Live data with realtime updates
    const [livePending, setLivePending] = useState<VisitorRequest[]>(pendingRequests);
    const [liveApproved, setLiveApproved] = useState<VisitorRequest[]>(approvedVisitors);

    const { showToast } = useToast();

    useEffect(() => {
        getDepartmentAnalytics(department).then((res) => {
            if (res.success && res.summary) setAnalytics(res.summary);
        });
    }, [department]);

    // Supabase Realtime subscription
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`dept-${department}-visitors`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "visitor_requests",
                    filter: `department=eq.${department}`,
                },
                (payload) => {
                    const newVisitor = payload.new as VisitorRequest;
                    if (newVisitor.status === "pending") {
                        setLivePending((prev) => {
                            // Avoid duplicates
                            if (prev.some((v) => v.id === newVisitor.id)) return prev;
                            return [newVisitor, ...prev];
                        });
                        showToast(
                            `New visitor request from ${newVisitor.name} (${newVisitor.organization || "Unknown"})`,
                            "info"
                        );
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "visitor_requests",
                    filter: `department=eq.${department}`,
                },
                (payload) => {
                    const updated = payload.new as VisitorRequest;
                    if (updated.status === "approved") {
                        // Move from pending to approved
                        setLivePending((prev) => prev.filter((v) => v.id !== updated.id));
                        setLiveApproved((prev) => {
                            if (prev.some((v) => v.id === updated.id)) {
                                return prev.map((v) => (v.id === updated.id ? updated : v));
                            }
                            return [updated, ...prev];
                        });
                    } else if (updated.status === "rejected") {
                        setLivePending((prev) => prev.filter((v) => v.id !== updated.id));
                    } else {
                        // Update in both lists
                        setLivePending((prev) =>
                            prev.map((v) => (v.id === updated.id ? updated : v))
                        );
                        setLiveApproved((prev) =>
                            prev.map((v) => (v.id === updated.id ? updated : v))
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [department, showToast]);

    // Loading States — track by visitor ID for per-card feedback
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [isResending, setIsResending] = useState(false);

    // Reject confirmation dialog
    const [rejectDialog, setRejectDialog] = useState<{ open: boolean; visitorId: string; visitorName: string }>({ open: false, visitorId: "", visitorName: "" });

    // Notification Dialog
    const [notification, setNotification] = useState<{ open: boolean; title: string; message: string; type: "success" | "error" }>({ open: false, title: "", message: "", type: "success" });

    // Filter logic based on active tab - Memoized for performance
    const filteredRequests = useMemo(() => {
        const currentList = activeTab === "pending" ? livePending : liveApproved;
        return currentList.filter(req =>
            (req.name && req.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (req.organization && req.organization.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (req.phone && req.phone.includes(searchTerm))
        );
    }, [activeTab, livePending, liveApproved, searchTerm]);

    // Custom Approve Handler to show loading per visitor
    const handleApprove = async (formData: FormData) => {
        const visitorId = formData.get("id") as string;
        setApprovingId(visitorId);
        try {
            await approveVisitor(formData);
            setSelectedVisitor(null);
            setNotification({ open: true, title: "Success", message: "Visitor approved & email sent successfully!", type: "success" });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Failed to approve visitor";
            setNotification({ open: true, title: "Error", message: msg, type: "error" });
        } finally {
            setApprovingId(null);
        }
    };

    // Reject Handler
    const handleReject = async () => {
        if (!rejectDialog.visitorId) return;
        setRejectingId(rejectDialog.visitorId);
        try {
            const formData = new FormData();
            formData.append("id", rejectDialog.visitorId);
            const result = await rejectVisitor(formData);
            if (result.error) {
                setNotification({ open: true, title: "Error", message: result.error, type: "error" });
            } else {
                setNotification({ open: true, title: "Rejected", message: result.message || "Visitor request rejected.", type: "success" });
                setSelectedVisitor(null);
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Failed to reject visitor";
            setNotification({ open: true, title: "Error", message: msg, type: "error" });
        } finally {
            setRejectingId(null);
            setRejectDialog({ open: false, visitorId: "", visitorName: "" });
        }
    };

    // Resend Handler
    const handleResendEmail = async () => {
        if (!selectedVisitor) return;
        setIsResending(true);
        const formData = new FormData();
        formData.append("id", selectedVisitor.id);

        try {
            const result = await resendVisitorEmail(formData);
            if (result.success) {
                setNotification({ open: true, title: "Email Sent", message: "Approval email resent successfully.", type: "success" });
            } else {
                setNotification({ open: true, title: "Error", message: result.message || "Failed to resend email", type: "error" });
            }
        } catch (error: unknown) {
            setNotification({ open: true, title: "Error", message: "Unexpected error occurred", type: "error" });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div>
            {/* Notification Dialog */}
            <CustomDialog
                open={notification.open}
                onOpenChange={(open) => setNotification(prev => ({ ...prev, open }))}
                title={notification.title}
                description={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {notification.type === 'success' ? <CheckCircleIcon style={{ width: 24, color: 'green' }} /> : <ExclamationTriangleIcon style={{ width: 24, color: 'red' }} />}
                        {notification.message}
                    </div>
                }
            >
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => setNotification(prev => ({ ...prev, open: false }))}>OK</button>
                </div>
            </CustomDialog>

            {/* Tabs & Search ... (Same as before) */}

            {/* ── Department Analytics ── */}
            {analytics && (
                <div className={styles.analyticsSection}>
                    <div className={styles.deptStatsGrid}>
                        {[
                            { label: "Total Visitors", value: analytics.total, accent: "#003366" },
                            { label: "Today", value: analytics.todayVisitors, accent: "#4299E1" },
                            { label: "Pending", value: analytics.pending, accent: "#F6AD55" },
                            { label: "Approved", value: analytics.approved, accent: "#48BB78" },
                            { label: "Checked In", value: analytics.checkedIn, accent: "#805AD5" },
                            { label: "Rejected", value: analytics.rejected, accent: "#E53E3E" },
                        ].map((stat) => (
                            <Card key={stat.label} variant="default" className={styles.deptStatCard} style={{ borderLeftColor: stat.accent }}>
                                <CardContent className={styles.deptStatContent}>
                                    <span className={styles.deptStatLabel}>{stat.label}</span>
                                    <span className={styles.deptStatValue}>{stat.value}</span>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {analytics.weeklyTrend.length > 0 && (
                        <Card variant="default" className={styles.deptChartCard}>
                            <CardHeader>
                                <CardTitle>Weekly Trend — {department}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={analytics.weeklyTrend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
                                        <YAxis allowDecimals={false} stroke="var(--text-secondary)" />
                                        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border-color)", fontSize: 13 }} />
                                        <Bar dataKey="count" fill="#003366" radius={[4, 4, 0, 0]} name="Visitors" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ── Visitor Requests ── */}
            <Card variant="outline">
            <CardContent>
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === "pending" ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab("pending")}
                >
                    Pending Requests ({livePending.length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === "approved" ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab("approved")}
                >
                    Approved ({liveApproved.length})
                </button>
            </div>

            <div className={styles.filterBar}>
                {/* ... Search ... */}
                <div className={styles.searchWrapper}>
                    <MagnifyingGlassIcon className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search by name, org, or phone..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className={styles.stats}>
                    <span>{filteredRequests.length} {activeTab === "pending" ? "Pending" : "Approved"}</span>
                </div>
            </div>


            <div className={styles.requestGrid}>
                {filteredRequests.length === 0 && (
                    <div className={styles.emptyState}>
                        <CheckBadgeIcon className={styles.emptyIcon} style={{ width: 48, height: 48 }} />
                        <p>{searchTerm ? "No matching requests found." : activeTab === "pending" ? "No pending requests." : "No approved visitors yet."}</p>
                    </div>
                )}

                {filteredRequests.map((req) => (
                    <div key={req.id} className={`${styles.card} ${approvingId === req.id ? styles.cardApproving : ""}`} onClick={() => !approvingId && setSelectedVisitor(req)}>
                        {/* Per-card loading overlay */}
                        {approvingId === req.id && (
                            <div className={styles.cardLoadingOverlay}>
                                <ArrowPathIcon className="animate-spin" style={{ width: 28, height: 28 }} />
                                <span>Sending approval email…</span>
                            </div>
                        )}
                        <div className={styles.cardHeader}>
                            <img
                                src={req.photo_url || "/placeholder-user.png"}
                                alt={req.name}
                                className={styles.visitorPhoto}
                            />
                            <div className={styles.visitorInfo}>
                                <h3>{req.name}</h3>
                                <p className={styles.designation}>{req.designation}</p>
                                <div className={styles.iconText}>
                                    <BuildingOfficeIcon className={styles.miniIcon} />
                                    <span>{req.organization}</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.cardBody}>
                            <div className={styles.infoRow}>
                                <PhoneIcon className={styles.miniIcon} />
                                <span>{req.phone}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <strong>Purpose:</strong> <span className={styles.truncate}>{req.purpose}</span>
                            </div>
                            {activeTab === "approved" && req.visitor_uid && (
                                <div className={styles.approvedInfo}>
                                    <div className={styles.uidBadge}>
                                        <CheckBadgeIcon style={{ width: 16, height: 16 }} />
                                        <span>UID: {req.visitor_uid}</span>
                                    </div>
                                    <div className={styles.timestamp}>
                                        Approved: {req.created_at ? new Date(req.created_at).toLocaleString('en-IN', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short'
                                        }) : 'N/A'}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Card Footer Actions */}
                        {activeTab === "pending" && (
                            <div className={styles.cardFooter} onClick={(e) => e.stopPropagation()}>
                                <form action={handleApprove} style={{ flex: 1 }}>
                                    <input type="hidden" name="id" value={req.id} />
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                                        disabled={approvingId === req.id}
                                    >
                                        {approvingId === req.id ? (
                                            <>
                                                <ArrowPathIcon className="animate-spin" style={{ width: 18, height: 18 }} />
                                                Sending Email…
                                            </>
                                        ) : "Approve"}
                                    </button>
                                </form>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", color: "#dc2626", borderColor: "#dc2626" }}
                                    onClick={() => setRejectDialog({ open: true, visitorId: req.id, visitorName: req.name })}
                                    disabled={!!approvingId}
                                >
                                    <XCircleIcon style={{ width: 18, height: 18 }} />
                                    Reject
                                </button>
                            </div>
                        )}

                        {activeTab === "approved" && (
                            <div className={styles.cardFooter}>
                                <div className={styles.approvedBadge}>
                                    <CheckBadgeIcon style={{ width: 18, height: 18 }} />
                                    Approved
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>            </CardContent>
            </Card>
            {/* Full Profile Dialog */}
            <CustomDialog
                open={!!selectedVisitor}
                onOpenChange={(open) => !open && setSelectedVisitor(null)}
                title="Visitor Profile"
                description={`Full details for ${selectedVisitor?.name}`}
            >
                {selectedVisitor && (
                    <div className={styles.profileModal}>
                        <div className={styles.profileHeader}>
                            <img src={selectedVisitor.photo_url || "/placeholder-user.png"} alt={selectedVisitor.name} className={styles.largePhoto} />
                            <div>
                                <h2>{selectedVisitor.name}</h2>
                                <p className={styles.badge}>{selectedVisitor.designation || "—"}</p>
                                {selectedVisitor.visitor_uid && (
                                    <span className={styles.uidBadgeInline}>
                                        <IdentificationIcon style={{ width: 14, height: 14 }} />
                                        {selectedVisitor.visitor_uid}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Status Banner */}
                        <div className={`${styles.statusBanner} ${styles[`status_${selectedVisitor.status || "pending"}`]}`}>
                            {selectedVisitor.status === "approved" && <CheckCircleIcon style={{ width: 18, height: 18 }} />}
                            {selectedVisitor.status === "pending" && <ClockIcon style={{ width: 18, height: 18 }} />}
                            {selectedVisitor.status === "rejected" && <XCircleIcon style={{ width: 18, height: 18 }} />}
                            {selectedVisitor.status === "checked_in" && <ArrowRightStartOnRectangleIcon style={{ width: 18, height: 18 }} />}
                            {selectedVisitor.status === "checked_out" && <ArrowLeftEndOnRectangleIcon style={{ width: 18, height: 18 }} />}
                            <span>Status: <strong>{(selectedVisitor.status || "pending").replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</strong></span>
                        </div>

                        <div className={styles.profileGrid}>
                            {/* Personal Information */}
                            <div className={styles.profileItem}>
                                <label><UserIcon className={styles.profileIcon} /> Full Name</label>
                                <p>{selectedVisitor.name}</p>
                            </div>
                            <div className={styles.profileItem}>
                                <label><BriefcaseIcon className={styles.profileIcon} /> Designation</label>
                                <p>{selectedVisitor.designation || "—"}</p>
                            </div>
                            <div className={styles.profileItem}>
                                <label><BuildingOfficeIcon className={styles.profileIcon} /> Organization</label>
                                <p>{selectedVisitor.organization || "—"}</p>
                            </div>
                            <div className={styles.profileItem}>
                                <label><MapPinIcon className={styles.profileIcon} /> Department</label>
                                <p>{selectedVisitor.department}</p>
                            </div>

                            {/* Contact */}
                            <div className={styles.profileItem}>
                                <label><PhoneIcon className={styles.profileIcon} /> Phone</label>
                                <p>{selectedVisitor.phone || "—"}</p>
                            </div>
                            <div className={styles.profileItem}>
                                <label><EnvelopeIcon className={styles.profileIcon} /> Email</label>
                                <p>{selectedVisitor.email || "—"}</p>
                            </div>

                            {/* Visit Details */}
                            <div className={styles.profileItem} style={{ gridColumn: "1 / -1" }}>
                                <label><ChatBubbleBottomCenterTextIcon className={styles.profileIcon} /> Purpose of Visit</label>
                                <p>{selectedVisitor.purpose || "—"}</p>
                            </div>

                            {/* Scheduling */}
                            {(selectedVisitor.expected_date || selectedVisitor.expected_time) && (
                                <>
                                    <div className={styles.profileItem}>
                                        <label><CalendarDaysIcon className={styles.profileIcon} /> Expected Date</label>
                                        <p>{selectedVisitor.expected_date
                                            ? new Date(selectedVisitor.expected_date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                                            : "—"}</p>
                                    </div>
                                    <div className={styles.profileItem}>
                                        <label><ClockIcon className={styles.profileIcon} /> Expected Time</label>
                                        <p>{selectedVisitor.expected_time
                                            ? (() => {
                                                const [hStr, mStr] = selectedVisitor.expected_time.split(":");
                                                let h = parseInt(hStr, 10);
                                                const ampm = h >= 12 ? "PM" : "AM";
                                                if (h === 0) h = 12; else if (h > 12) h -= 12;
                                                return `${h}:${mStr} ${ampm}`;
                                            })()
                                            : "—"}</p>
                                    </div>
                                </>
                            )}

                            {/* Timestamps */}
                            <div className={styles.profileItem}>
                                <label><CalendarDaysIcon className={styles.profileIcon} /> Submitted On</label>
                                <p>{selectedVisitor.created_at
                                    ? new Date(selectedVisitor.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                                    : "—"}</p>
                            </div>

                            {selectedVisitor.visitor_uid && (
                                <div className={styles.profileItem}>
                                    <label><IdentificationIcon className={styles.profileIcon} /> Visitor UID</label>
                                    <p style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, color: "var(--primary-color)" }}>{selectedVisitor.visitor_uid}</p>
                                </div>
                            )}

                            {/* Check-in / Check-out */}
                            {selectedVisitor.check_in_time && (
                                <div className={styles.profileItem}>
                                    <label><ArrowRightStartOnRectangleIcon className={styles.profileIcon} /> Checked In</label>
                                    <p>{new Date(selectedVisitor.check_in_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                                </div>
                            )}
                            {selectedVisitor.check_out_time && (
                                <div className={styles.profileItem}>
                                    <label><ArrowLeftEndOnRectangleIcon className={styles.profileIcon} /> Checked Out</label>
                                    <p>{new Date(selectedVisitor.check_out_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                                </div>
                            )}
                        </div>

                        <div className={styles.modalActions}>
                            <button className="btn btn-outline" onClick={() => setSelectedVisitor(null)}>Close</button>

                            {selectedVisitor.status === "pending" ? (
                                <div style={{ display: "flex", gap: "10px", flex: 1 }}>
                                    <form action={handleApprove} style={{ flex: 1 }}>
                                        <input type="hidden" name="id" value={selectedVisitor.id} />
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                                            disabled={approvingId === selectedVisitor.id}
                                        >
                                            {approvingId === selectedVisitor.id ? (
                                                <>
                                                    <ArrowPathIcon className="animate-spin" style={{ width: 18, height: 18 }} />
                                                    Sending Approval Email…
                                                </>
                                            ) : "Approve Visitor"}
                                        </button>
                                    </form>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        style={{ display: "flex", alignItems: "center", gap: "6px", color: "#dc2626", borderColor: "#dc2626" }}
                                        onClick={() => setRejectDialog({ open: true, visitorId: selectedVisitor.id, visitorName: selectedVisitor.name })}
                                        disabled={!!approvingId}
                                    >
                                        <XCircleIcon style={{ width: 18, height: 18 }} />
                                        Reject
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                                    {/* Resend Email Button */}
                                    <button
                                        onClick={handleResendEmail}
                                        className="btn btn-outline"
                                        disabled={isResending}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        {isResending ? (
                                            <ArrowPathIcon className="animate-spin" style={{ width: 16, height: 16 }} />
                                        ) : (
                                            <ArrowPathIcon style={{ width: 16, height: 16 }} />
                                        )}
                                        {isResending ? "Sending..." : "Resend Email"}
                                    </button>

                                    <div className={styles.approvedBadge} style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                        <CheckBadgeIcon style={{ width: 18, height: 18 }} />
                                        Already Approved
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CustomDialog>

            {/* Reject Confirmation Dialog */}
            <CustomDialog
                open={rejectDialog.open}
                onOpenChange={(open) => !open && setRejectDialog({ open: false, visitorId: "", visitorName: "" })}
                title="Reject Visitor Request"
                description={`Are you sure you want to reject the request from ${rejectDialog.visitorName}?`}
            >
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1rem" }}>
                    <button className="btn btn-outline" onClick={() => setRejectDialog({ open: false, visitorId: "", visitorName: "" })} disabled={!!rejectingId}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        style={{ background: "#dc2626", borderColor: "#dc2626", display: "flex", alignItems: "center", gap: "8px" }}
                        onClick={handleReject}
                        disabled={!!rejectingId}
                    >
                        {rejectingId ? (
                            <>
                                <ArrowPathIcon className="animate-spin" style={{ width: 18, height: 18 }} />
                                Rejecting…
                            </>
                        ) : "Confirm Reject"}
                    </button>
                </div>
            </CustomDialog>
        </div>
    );
}
