"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
} from "@heroicons/react/24/outline";
import type { VisitorRequest } from "@/lib/types";

export default function SecurityDashboard() {
    // Dashboard State
    const [uidInput, setUidInput] = useState("");
    const [visitor, setVisitor] = useState<VisitorRequest | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Barcode scanner state
    const [scannerConnected, setScannerConnected] = useState(false);
    const barcodeBufferRef = useRef("");
    const barcodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus the input on mount so barcode gun input is captured
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // External barcode scanner listener
    // Barcode guns send rapid keystrokes followed by Enter
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in another input field (e.g., a modal)
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" && target !== inputRef.current) return;
            if (target.tagName === "TEXTAREA") return;

            // Clear previous timeout — chars must arrive within 50ms of each other
            if (barcodeTimeoutRef.current) {
                clearTimeout(barcodeTimeoutRef.current);
            }

            if (e.key === "Enter" && barcodeBufferRef.current.length >= 5) {
                // Barcode scan complete
                e.preventDefault();
                const scannedValue = barcodeBufferRef.current.trim();
                barcodeBufferRef.current = "";
                setUidInput(scannedValue);
                setScannerConnected(true);
                searchVisitor(scannedValue);
                return;
            }

            // Only accumulate printable characters
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                barcodeBufferRef.current += e.key;

                // Reset buffer after 100ms of no input (human typing is slower)
                barcodeTimeoutRef.current = setTimeout(() => {
                    barcodeBufferRef.current = "";
                }, 100);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current);
        };
    }, []);

    // Search logic
    const searchVisitor = useCallback(async (uid: string) => {
        if (!uid.trim()) return;
        setLoading(true);
        setMessage(null);
        setVisitor(null);

        try {
            const { getVisitorByUid } = await import("@/app/actions/security");
            const result = await getVisitorByUid(uid.trim());

            if (result.error || !result.visitor) {
                throw new Error(result.error || "Visitor not found or invalid UID.");
            }

            setVisitor(result.visitor as VisitorRequest);
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "Search failed";
            setMessage({ type: "error", text: errMsg });
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        searchVisitor(uidInput);
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
                    className={`${styles.scannerChip} ${scannerConnected ? styles.scannerActive : ""}`}
                    title={scannerConnected ? "Barcode scanner detected" : "Waiting for barcode scanner..."}
                >
                    <SignalIcon className={styles.scannerIcon} />
                    <span>{scannerConnected ? "Scanner Active" : "Scan Ready"}</span>
                </div>
            </header>

            <div className={styles.dashboard}>
                {/* Search Section */}
                <div className={styles.searchSection}>
                    <form onSubmit={handleSearch} className={styles.searchForm}>
                        <div className={styles.searchInputGroup}>
                            <MagnifyingGlassIcon className={styles.searchIcon} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Scan barcode or enter Visitor UID..."
                                className={styles.searchInput}
                                value={uidInput}
                                onChange={(e) => setUidInput(e.target.value)}
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
            </div>
        </div>
    );
}
