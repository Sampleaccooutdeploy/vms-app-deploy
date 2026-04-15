"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import styles from "./page.module.css";
import {
    MagnifyingGlassIcon,
    ArrowRightOnRectangleIcon,
    CheckCircleIcon,
    SignalIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    ArrowRightStartOnRectangleIcon,
    ShieldCheckIcon,
    TableCellsIcon,
    ArrowPathIcon,
    LockClosedIcon,
    ArrowRightEndOnRectangleIcon,
} from "@heroicons/react/24/outline";
import type { VisitorRequest } from "@/lib/types";
import { useBarcodeScanner } from "@/lib/useBarcodeScanner";
import { UID_PREFIX, ID_PROOF_TYPES } from "@/lib/constants";

// Get human-readable label for ID proof type
const getIdProofLabel = (value: string | null): string => {
    if (!value) return "ID Proof";
    const found = ID_PROOF_TYPES.find(t => t.value === value);
    return found ? found.label : value;
};

export default function SecurityDashboard() {
    // Authentication State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [pinError, setPinError] = useState<string | null>(null);
    const [pinLoading, setPinLoading] = useState(false);

    // Dashboard State
    const [uidInput, setUidInput] = useState("");
    const [visitor, setVisitor] = useState<VisitorRequest | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Daily Activity State
    const [dailyVisitors, setDailyVisitors] = useState<VisitorRequest[]>([]);
    const [dailyLoading, setDailyLoading] = useState(false);
    const [dailyError, setDailyError] = useState<string | null>(null);

    // Guard against concurrent searches (scanner double-fire, Enter + form submit race)
    const searchingRef = useRef(false);

    // Search logic (defined before hook to pass as callback)
    const searchVisitor = useCallback(async (uid: string) => {
        if (!uid.trim() || searchingRef.current) return;
        searchingRef.current = true;

        console.log("[Security] searchVisitor called with:", uid);
        setLoading(true);
        setMessage(null);
        setVisitor(null);

        // Always prepend the prefix for the actual lookup
        const upper = uid.trim().toUpperCase();
        const fullUid = upper.startsWith(UID_PREFIX) ? upper : `${UID_PREFIX}${upper}`;

        console.log("[Security] Looking up UID:", fullUid);

        try {
            const { getVisitorByUid } = await import("@/app/actions/security");
            const result = await getVisitorByUid(fullUid);

            console.log("[Security] Lookup result:", result.error || "found");

            if (result.error || !result.visitor) {
                throw new Error(result.error || "Visitor not found or invalid UID.");
            }

            setVisitor(result.visitor as VisitorRequest);
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "Search failed";
            setMessage({ type: "error", text: errMsg });
        } finally {
            setLoading(false);
            setUidInput("");
            searchingRef.current = false;
        }
    }, []);

    // Load daily activity on mount and after check-in/check-out
    const loadDailyActivity = useCallback(async () => {
        setDailyLoading(true);
        setDailyError(null);
        try {
            const { getDailyActivity } = await import("@/app/actions/security");
            const result = await getDailyActivity();
            if (result.error) throw new Error(result.error);
            setDailyVisitors(result.visitors || []);
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "Failed to load daily activity";
            setDailyError(errMsg);
        } finally {
            setDailyLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            loadDailyActivity();
        }
    }, [loadDailyActivity, isAuthenticated]);

    // PIN Authentication
    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pinInput.trim()) return;
        setPinLoading(true);
        setPinError(null);

        try {
            const { verifySecurityPin } = await import("@/app/actions/security");
            const result = await verifySecurityPin(pinInput);

            if (!result.success) {
                throw new Error(result.error || "Invalid PIN");
            }

            setIsAuthenticated(true);
            setPinInput("");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "Authentication failed";
            setPinError(errMsg);
            setPinInput("");
        } finally {
            setPinLoading(false);
        }
    };

    // Logout
    const handleLogout = async () => {
        try {
            const { logoutSecurity } = await import("@/app/actions/security");
            await logoutSecurity();
        } catch { /* ignore */ }
        setIsAuthenticated(false);
        setVisitor(null);
        setDailyVisitors([]);
        setMessage(null);
        setUidInput("");
    };

    // Use the barcode scanner hook
    const { status: scannerStatus, inputRef } = useBarcodeScanner(searchVisitor);

    // Combine hook ref with local DOM ref so we can clear the input after search
    const inputDomRef = useRef<HTMLInputElement | null>(null);
    const combinedRef = useCallback(
        (node: HTMLInputElement | null) => {
            inputDomRef.current = node;
            inputRef(node);
        },
        [inputRef]
    );

    // Get status label for scanner chip
    const getScannerLabel = () => {
        switch (scannerStatus) {
            case "scanning":
                return "Scanning...";
            case "connected":
                return "Scanner Ready";
            case "disconnected":
                return "No Scanner";
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        const val = inputDomRef.current?.value?.trim() || uidInput.trim();
        if (!val) return;
        searchVisitor(val);
        // Clear DOM input for next entry
        if (inputDomRef.current) inputDomRef.current.value = "";
    };

    const handleAction = async (action: "check_in" | "check_out") => {
        if (!visitor) return;
        setLoading(true);
        setMessage(null);

        try {
            const { updateVisitorStatus } = await import("@/app/actions/security");
            const result = await updateVisitorStatus(visitor.id, action);

            if (result.error) throw new Error(result.error);

            setMessage({
                type: "success",
                text: result.message || `Visitor ${action === "check_in" ? "checked in" : "checked out"} successfully.`,
            });

            // Refresh daily activity table after status change
            loadDailyActivity();

            // Refresh local state with updates
            if (result.updates) {
                setVisitor((prev) => (prev ? { ...prev, ...result.updates } : null));
            } else {
                const updates: Record<string, string> = { status: action };
                if (action === "check_in") updates.check_in_time = new Date().toISOString();
                else updates.check_out_time = new Date().toISOString();
                setVisitor((prev) => (prev ? { ...prev, ...updates } : null));
            }
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "Action failed";
            setMessage({ type: "error", text: errMsg });
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (iso: string | null) => {
        if (!iso) return "—";
        return new Date(iso).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    const getStatusLabel = (status: string | null) => {
        switch (status) {
            case "approved": return "Approved";
            case "checked_in": return "Checked In";
            case "checked_out": return "Checked Out";
            case "pending": return "Pending";
            case "rejected": return "Rejected";
            default: return status || "Unknown";
        }
    };

    const getStatusClass = (status: string | null) => {
        switch (status) {
            case "approved": return styles.statusApproved;
            case "checked_in": return styles.statusCheckedIn;
            case "checked_out": return styles.statusCheckedOut;
            default: return styles.statusDefault;
        }
    };

    // ===================================
    // PIN LOGIN SCREEN
    // ===================================
    if (!isAuthenticated) {
        return (
            <div className="container">
                <div className={styles.loginWrapper}>
                    <div className={styles.loginCard}>
                        <div className={styles.loginIconWrap}>
                            <ShieldCheckIcon className={styles.loginIcon} />
                        </div>
                        <h1 className={styles.loginTitle}>Security Portal</h1>
                        <p className={styles.loginSubtitle}>Enter your security access PIN to continue</p>

                        <form onSubmit={handlePinSubmit} className={styles.loginForm}>
                            <div className={styles.pinInputGroup}>
                                <LockClosedIcon className={styles.pinFieldIcon} />
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    placeholder="Enter Access PIN"
                                    className={styles.pinInput}
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value)}
                                    autoFocus
                                    maxLength={10}
                                    aria-label="Security access PIN"
                                />
                            </div>

                            {pinError && (
                                <div className={`${styles.toast} ${styles.toastError}`} role="alert">
                                    <ExclamationTriangleIcon className={styles.toastIcon} />
                                    <span>{pinError}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                className={styles.pinSubmitBtn}
                                disabled={pinLoading || !pinInput.trim()}
                            >
                                {pinLoading ? "Verifying..." : "Unlock Portal"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // ===================================
    // AUTHENTICATED DASHBOARD
    // ===================================
    return (
        <div className="container">
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <ShieldCheckIcon className={styles.headerIcon} />
                    <div>
                        <h1>Security Portal</h1>
                        <p className={styles.headerSub}>Visitor Check-In & Check-Out</p>
                    </div>
                </div>
                <div
                    className={`${styles.scannerChip} ${scannerStatus === "connected" ? styles.scannerActive : ""} ${scannerStatus === "scanning" ? styles.scannerScanning : ""} ${scannerStatus === "disconnected" ? styles.scannerDisconnected : ""}`}
                    title={scannerStatus === "connected" ? "USB barcode scanner detected and ready" : scannerStatus === "scanning" ? "Receiving scan data..." : "No scanner detected — connect USB scanner"}
                >
                    <SignalIcon className={styles.scannerIcon} />
                    <span>{getScannerLabel()}</span>
                </div>
                <button
                    className={styles.logoutBtn}
                    onClick={handleLogout}
                    title="End security session"
                >
                    <ArrowRightEndOnRectangleIcon className={styles.logoutIcon} />
                    Logout
                </button>
            </header>

            <div className={styles.dashboard}>
                {/* Search Section */}
                <div className={styles.searchSection}>
                    <form onSubmit={handleSearch} className={styles.searchForm}>
                        <div className={styles.searchInputGroup}>
                            <MagnifyingGlassIcon className={styles.searchIcon} />
                            {!uidInput.toUpperCase().startsWith(UID_PREFIX) && (
                                <span className={styles.uidPrefix}>{UID_PREFIX}</span>
                            )}
                            <input
                                ref={combinedRef}
                                type="text"
                                placeholder="Scan barcode or type UID..."
                                className={styles.searchInput}
                                onInput={(e) => {
                                    const input = e.target as HTMLInputElement;
                                    const upper = input.value.toUpperCase();
                                    if (input.value !== upper) input.value = upper;
                                    setUidInput(upper);
                                }}
                                autoFocus
                                aria-label="Visitor UID input"
                            />
                            <button type="submit" className={styles.searchBtn} disabled={loading || !uidInput.trim()}>
                                {loading ? "Searching..." : "Look Up"}
                            </button>
                        </div>
                    </form>

                    {message && (
                        <div className={`${styles.toast} ${message.type === "error" ? styles.toastError : styles.toastSuccess}`} role="alert">
                            {message.type === "error"
                                ? <ExclamationTriangleIcon className={styles.toastIcon} />
                                : <CheckCircleIcon className={styles.toastIcon} />
                            }
                            <span>{message.text}</span>
                        </div>
                    )}
                </div>

                {/* Visitor Card */}
                {visitor && (
                    <div className={styles.visitorCard}>
                        {/* Card Header with status */}
                        <div className={styles.cardHeader}>
                            <span className={`${styles.statusChip} ${getStatusClass(visitor.status)}`}>
                                {getStatusLabel(visitor.status)}
                            </span>
                            <span className={styles.uid}>{visitor.visitor_uid}</span>
                        </div>

                        {/* Card Body */}
                        <div className={styles.cardBody}>
                            <div className={styles.photoCol}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={visitor.photo_url || "/placeholder-user.png"} alt={visitor.name} className={styles.photo} />
                            </div>

                            <div className={styles.detailsCol}>
                                <h3 className={styles.visitorName}>{visitor.name}</h3>
                                {visitor.designation && (
                                    <p className={styles.visitorDesignation}>{visitor.designation}</p>
                                )}
                                <div className={styles.detailGrid}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Department</span>
                                        <span className={styles.detailValue}>{visitor.department}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Purpose</span>
                                        <span className={styles.detailValue}>{visitor.purpose || "—"}</span>
                                    </div>
                                    {visitor.organization && (
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Organization</span>
                                            <span className={styles.detailValue}>{visitor.organization}</span>
                                        </div>
                                    )}
                                    {visitor.phone && (
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Phone</span>
                                            <span className={styles.detailValue}>{visitor.phone}</span>
                                        </div>
                                    )}
                                    {visitor.email && (
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Email</span>
                                            <span className={styles.detailValue}>{visitor.email}</span>
                                        </div>
                                    )}
                                    {visitor.id_proof_type && (
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>{getIdProofLabel(visitor.id_proof_type)}</span>
                                            <span className={`${styles.detailValue} ${styles.idProofValue}`}>
                                                {visitor.id_proof_number || "—"}
                                            </span>
                                        </div>
                                    )}
                                    {(visitor.expected_date || visitor.expected_time) && (
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Expected Arrival</span>
                                            <span className={styles.detailValue}>
                                                {visitor.expected_date && new Date(visitor.expected_date + "T00:00:00").toLocaleDateString("en-IN", { dateStyle: "medium" })}
                                                {visitor.expected_date && visitor.expected_time && " at "}
                                                {visitor.expected_time && new Date(`1970-01-01T${visitor.expected_time}`).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Timestamps */}
                        {(visitor.check_in_time || visitor.check_out_time) && (
                            <div className={styles.timestamps}>
                                {visitor.check_in_time && (
                                    <div className={styles.timeItem}>
                                        <ClockIcon className={styles.timeIcon} />
                                        <div>
                                            <span className={styles.timeLabel}>Check-In</span>
                                            <span className={styles.timeValue}>{formatTime(visitor.check_in_time)}</span>
                                        </div>
                                    </div>
                                )}
                                {visitor.check_out_time && (
                                    <div className={styles.timeItem}>
                                        <ArrowRightStartOnRectangleIcon className={styles.timeIcon} />
                                        <div>
                                            <span className={styles.timeLabel}>Check-Out</span>
                                            <span className={styles.timeValue}>{formatTime(visitor.check_out_time)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Footer */}
                        <div className={styles.cardFooter}>
                            {visitor.status === "approved" && (
                                <>
                                    <p className={styles.actionHint}>Please verify visitor details before proceeding.</p>
                                    <button onClick={() => handleAction("check_in")} className={styles.btnCheckIn} disabled={loading}>
                                        <CheckCircleIcon className={styles.btnIcon} />
                                        {loading ? "Processing..." : "Check In Visitor"}
                                    </button>
                                </>
                            )}
                            {visitor.status === "checked_in" && (
                                <button onClick={() => handleAction("check_out")} className={styles.btnCheckOut} disabled={loading}>
                                    <ArrowRightOnRectangleIcon className={styles.btnIcon} />
                                    {loading ? "Processing..." : "Check Out Visitor"}
                                </button>
                            )}
                            {visitor.status === "checked_out" && (
                                <div className={styles.completedBanner}>
                                    <CheckCircleIcon className={styles.completedIcon} />
                                    <div>
                                        <strong>Visit Completed</strong>
                                        <span>All timestamps have been recorded successfully.</span>
                                    </div>
                                </div>
                            )}
                            {visitor.status === "pending" && (
                                <div className={styles.pendingBanner}>
                                    <ExclamationTriangleIcon className={styles.pendingIcon} />
                                    <span>This visit request is still pending approval from the department admin.</span>
                                </div>
                            )}
                            {visitor.status === "rejected" && (
                                <div className={styles.rejectedBanner}>
                                    <ExclamationTriangleIcon className={styles.rejectedIcon} />
                                    <span>This visit request has been rejected. Entry is not permitted.</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ===================================
                   DAILY ACTIVITY TABLE
                   =================================== */}
                <div className={styles.dailySection}>
                    <div className={styles.dailySectionHeader}>
                        <div className={styles.dailyTitleRow}>
                            <TableCellsIcon className={styles.dailyTitleIcon} />
                            <div>
                                <h2 className={styles.dailyTitle}>Today&apos;s Activity</h2>
                                <p className={styles.dailySubtitle}>
                                    {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                </p>
                            </div>
                        </div>
                        <button
                            className={styles.refreshBtn}
                            onClick={loadDailyActivity}
                            disabled={dailyLoading}
                            title="Refresh daily activity"
                        >
                            <ArrowPathIcon className={`${styles.refreshIcon} ${dailyLoading ? styles.refreshSpin : ""}`} />
                            Refresh
                        </button>
                    </div>

                    {dailyError && (
                        <div className={`${styles.toast} ${styles.toastError}`} role="alert">
                            <ExclamationTriangleIcon className={styles.toastIcon} />
                            <span>{dailyError}</span>
                        </div>
                    )}

                    {dailyVisitors.length === 0 && !dailyLoading && !dailyError ? (
                        <div className={styles.emptyState}>
                            <ClockIcon className={styles.emptyIcon} />
                            <p>No visitor activity recorded today.</p>
                        </div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.activityTable}>
                                <thead>
                                    <tr>
                                        <th>Visitor</th>
                                        <th>UID</th>
                                        <th>Department</th>
                                        <th>Status</th>
                                        <th>Check-In</th>
                                        <th>Check-Out</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyVisitors.map((v) => (
                                        <tr key={v.id} className={v.status === "checked_in" ? styles.rowActive : styles.rowCompleted}>
                                            <td>
                                                <div className={styles.cellVisitor}>
                                                    <span className={styles.cellName}>{v.name}</span>
                                                    {v.organization && (
                                                        <span className={styles.cellOrg}>{v.organization}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={styles.cellUid}>{v.visitor_uid}</td>
                                            <td>{v.department}</td>
                                            <td>
                                                <span className={`${styles.tableStatusChip} ${v.status === "checked_in" ? styles.tableStatusActive : styles.tableStatusDone}`}>
                                                    {v.status === "checked_in" ? "Active" : "Completed"}
                                                </span>
                                            </td>
                                            <td className={styles.cellTime}>
                                                {v.check_in_time
                                                    ? new Date(v.check_in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                                                    : "—"}
                                            </td>
                                            <td className={styles.cellTime}>
                                                {v.check_out_time
                                                    ? new Date(v.check_out_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                                                    : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Summary Footer */}
                    {dailyVisitors.length > 0 && (
                        <div className={styles.dailySummary}>
                            <span className={styles.summaryItem}>
                                <strong>{dailyVisitors.filter(v => v.status === "checked_in").length}</strong> Active
                            </span>
                            <span className={styles.summaryDivider}>|</span>
                            <span className={styles.summaryItem}>
                                <strong>{dailyVisitors.filter(v => v.status === "checked_out").length}</strong> Completed
                            </span>
                            <span className={styles.summaryDivider}>|</span>
                            <span className={styles.summaryItem}>
                                <strong>{dailyVisitors.length}</strong> Total
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
