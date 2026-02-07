"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { getVisitorLogs, getDashboardSummary } from "@/app/actions/analytics";
import styles from "../page.module.css";
import analyticsStyles from "./analytics.module.css";
import { DEPARTMENTS } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { VisitorRequest } from "@/lib/types";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface LogEntry extends VisitorRequest {
    formattedDuration: string;
}

const PIE_COLORS = ["#003366", "#FF9933", "#FFCC00", "#48BB78", "#4299E1", "#F56565", "#805AD5", "#DD6B20", "#38B2AC", "#E53E3E"];

export default function AnalyticsDashboard() {
    const [logs, setLogs] = useState<VisitorRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [summary, setSummary] = useState<{
        total: number;
        pending: number;
        approved: number;
        checkedIn: number;
        checkedOut: number;
        rejected: number;
        todayVisitors: number;
        byDepartment: Record<string, number>;
        weeklyTrend: { date: string; count: number }[];
    } | null>(null);

    // Filters
    const [deptFilter, setDeptFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        const fetchData = async () => {
            const [logsResult, summaryResult] = await Promise.all([
                getVisitorLogs(),
                getDashboardSummary(),
            ]);
            if (logsResult.success) setLogs(logsResult.logs || []);
            else setError(logsResult.error || "Failed to load analytics");
            if (summaryResult.success && summaryResult.summary) setSummary(summaryResult.summary);
            setLoading(false);
        };
        fetchData();
    }, []);

    const filteredLogs = useMemo(() => {
        const now = Date.now();
        return logs.reduce((acc: LogEntry[], log) => {
            if (deptFilter !== "all" && log.department !== deptFilter) return acc;
            if (statusFilter !== "all" && log.status !== statusFilter) return acc;

            let duration = "-";
            if (log.check_in_time) {
                const start = new Date(log.check_in_time).getTime();
                let end = now;
                let prefix = "Active: ";

                if (log.check_out_time) {
                    end = new Date(log.check_out_time).getTime();
                    prefix = "";
                } else if (log.status !== "checked_in") {
                    prefix = "";
                }

                if (log.status === "checked_in" || log.check_out_time) {
                    const diff = end - start;
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    duration = `${prefix}${hours}h ${minutes}m`;
                }
            }

            acc.push({ ...log, formattedDuration: duration });
            return acc;
        }, []);
    }, [logs, deptFilter, statusFilter]);

    // Chart data
    const deptChartData = useMemo(() => {
        if (!summary) return [];
        return Object.entries(summary.byDepartment).map(([name, value]) => ({ name, value }));
    }, [summary]);

    // CSV Export
    const exportCSV = useCallback(() => {
        const headers = ["Date", "Name", "UID", "Department", "Purpose", "Status", "Check-In", "Check-Out", "Duration"];
        const rows = filteredLogs.map((log) => [
            log.created_at ? new Date(log.created_at).toLocaleDateString() : "",
            log.name,
            log.visitor_uid || "",
            log.department,
            log.purpose || "",
            log.status || "",
            log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString() : "",
            log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString() : "",
            log.formattedDuration,
        ]);

        const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `visitor-logs-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [filteredLogs]);

    // PDF Export
    const exportPDF = useCallback(async () => {
        const { default: jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;
        const doc = new jsPDF({ orientation: "landscape" });

        doc.setFontSize(18);
        doc.text("SCSVMV Visitor Analytics Report", 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Total Records: ${filteredLogs.length}`, 14, 34);

        autoTable(doc, {
            startY: 40,
            head: [["Date", "Visitor", "UID", "Dept", "Status", "Duration", "Check-In", "Check-Out"]],
            body: filteredLogs.map((log) => [
                log.created_at ? new Date(log.created_at).toLocaleDateString() : "",
                log.name,
                log.visitor_uid || "-",
                log.department,
                (log.status || "").replace("_", " ").toUpperCase(),
                log.formattedDuration,
                log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-",
                log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-",
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 51, 102] },
        });

        doc.save(`visitor-report-${new Date().toISOString().split("T")[0]}.pdf`);
    }, [filteredLogs]);

    return (
        <div className="container">
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <a href="/admin/super" className={styles.backBtn} title="Back to Dashboard">
                        <ArrowLeftIcon style={{ width: 20, height: 20 }} />
                    </a>
                    <h1>Analytics & Logs</h1>
                </div>
                <div className={analyticsStyles.headerActions}>
                    <button className="btn btn-outline" onClick={exportCSV}>
                        Export CSV
                    </button>
                    <button className="btn btn-outline" onClick={exportPDF}>
                        Export PDF
                    </button>
                    <a href="/admin/super" className="btn btn-outline">
                        Back to Dashboard
                    </a>
                </div>
            </header>

            {/* ── Summary Stat Cards ── */}
            {summary && (
                <div className={analyticsStyles.statsGrid}>
                    {[
                        { label: "Total Visitors", value: summary.total, accent: "#003366", sub: "All time" },
                        { label: "Today", value: summary.todayVisitors, accent: "#4299E1", sub: "Registered today" },
                        { label: "Pending", value: summary.pending, accent: "#F6AD55", sub: "Awaiting approval" },
                        { label: "Approved", value: summary.approved, accent: "#48BB78", sub: "Ready for entry" },
                        { label: "Checked In", value: summary.checkedIn, accent: "#805AD5", sub: "Currently inside" },
                        { label: "Checked Out", value: summary.checkedOut, accent: "#718096", sub: "Completed visits" },
                    ].map((stat) => (
                        <Card key={stat.label} variant="default" className={analyticsStyles.statCard} style={{ borderLeftColor: stat.accent }}>
                            <CardContent className={analyticsStyles.statContent}>
                                <span className={analyticsStyles.statLabel}>{stat.label}</span>
                                <span className={analyticsStyles.statValue}>{stat.value}</span>
                                <span className={analyticsStyles.statSub}>{stat.sub}</span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* ── Charts Row ── */}
            {summary && (
                <div className={analyticsStyles.chartsGrid}>
                    <Card variant="default">
                        <CardHeader>
                            <CardTitle>Weekly Visitor Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={summary.weeklyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
                                    <YAxis allowDecimals={false} stroke="var(--text-secondary)" />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border-color)", fontSize: 13 }} />
                                    <Bar dataKey="count" fill="#003366" radius={[4, 4, 0, 0]} name="Visitors" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card variant="default">
                        <CardHeader>
                            <CardTitle>Distribution by Department</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={deptChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                                        {deptChartData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Visitor Logs Table ── */}
            <Card variant="default" className={analyticsStyles.logsCard}>
                <CardHeader className={analyticsStyles.logsHeader}>
                    <CardTitle>Visitor Logs</CardTitle>
                    <div className={analyticsStyles.filtersRow}>
                        <select
                            className="form-select"
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            aria-label="Filter by department"
                        >
                            <option value="all">All Departments</option>
                            {DEPARTMENTS.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>

                        <select
                            className="form-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            aria-label="Filter by status"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="checked_in">Checked In</option>
                            <option value="checked_out">Checked Out</option>
                        </select>

                        <span className={analyticsStyles.logCount}>
                            {filteredLogs.length} records
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className={analyticsStyles.loadingText}>Loading analytics...</p>
                    ) : error ? (
                        <p className={styles.error}>{error}</p>
                    ) : filteredLogs.length === 0 ? (
                        <p className={styles.placeholder}>No records found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className={analyticsStyles.logTable}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Visitor</th>
                                        <th>Department</th>
                                        <th>Purpose</th>
                                        <th>Status</th>
                                        <th>Duration</th>
                                        <th>Timings</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td>
                                                {log.created_at ? new Date(log.created_at).toLocaleDateString() : "-"}
                                            </td>
                                            <td>
                                                <strong>{log.name}</strong>
                                                <br />
                                                <span className={analyticsStyles.uidSmall}>{log.visitor_uid || "-"}</span>
                                            </td>
                                            <td>{log.department}</td>
                                            <td>{log.purpose}</td>
                                            <td>
                                                <span
                                                    className={`badge ${
                                                        log.status === "approved"
                                                            ? "badge-success"
                                                            : log.status === "checked_in"
                                                              ? "badge-warning"
                                                              : log.status === "rejected"
                                                                ? "badge-danger"
                                                                : "badge-neutral"
                                                    }`}
                                                >
                                                    {(log.status || "").replace("_", " ").toUpperCase()}
                                                </span>
                                            </td>
                                            <td className={analyticsStyles.durationCell}>{log.formattedDuration}</td>
                                            <td className={analyticsStyles.timingCell}>
                                                In: {log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                                                <br />
                                                Out: {log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
