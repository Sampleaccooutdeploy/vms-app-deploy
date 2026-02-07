"use client";

import { useState, useRef, useEffect } from "react";
import { createUser, deleteUser, getUsers } from "@/app/actions/users";
import { getPasswordResetRequests, processPasswordReset } from "@/app/actions/password";
import { logout } from "@/app/actions/auth";
import styles from "./page.module.css";
import { CustomDialog } from "@/components/ui/CustomDialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { DEPARTMENTS } from "@/lib/constants";
import type { Profile, PasswordResetRequest } from "@/lib/types";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function SuperAdminDashboard() {
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const [selectedRole, setSelectedRole] = useState("department_admin");
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<Profile[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    // Password reset state
    const [passwordRequests, setPasswordRequests] = useState<PasswordResetRequest[]>([]);
    const [newPasswords, setNewPasswords] = useState<{ [key: string]: string }>({});
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; userId: string; email: string }>({ open: false, userId: "", email: "" });

    useEffect(() => {
        fetchUsers();
        fetchPasswordRequests();
    }, [refreshKey]);

    const fetchUsers = async () => {
        const result = await getUsers();
        if (result.success) {
            setUsers(result.users || []);
        } else {
            console.error("Failed to fetch users:", result.error);
        }
    };

    const fetchPasswordRequests = async () => {
        const result = await getPasswordResetRequests();
        if (result.success) {
            setPasswordRequests(result.requests || []);
        }
    };

    const handleCreateUser = async (formData: FormData) => {
        setLoading(true);
        setMessage(null);

        const result = await createUser(formData);

        if (result.error) {
            setMessage({ type: 'error', text: result.error });
        } else if (result.success) {
            setMessage({ type: 'success', text: result.message! });
            formRef.current?.reset();
            setRefreshKey(prev => prev + 1); // Refresh list
        }
        setLoading(false);
    };

    const handleDeleteUser = async (userId: string, email: string) => {
        setConfirmDialog({ open: true, userId, email });
    };

    const confirmDeleteUser = async () => {
        const userId = confirmDialog.userId;
        setConfirmDialog({ open: false, userId: "", email: "" });

        // Optimistic update
        setUsers(prev => prev.filter(u => u.id !== userId));

        const result = await deleteUser(userId);
        if (result.error) {
            setMessage({ type: 'error', text: result.error });
            setRefreshKey(prev => prev + 1); // Revert if failed
        } else {
            setMessage({ type: 'success', text: "User deleted successfully" });
        }
    };

    const handleProcessReset = async (requestId: string) => {
        const newPassword = newPasswords[requestId];
        if (!newPassword || newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setProcessingId(requestId);
        const result = await processPasswordReset(requestId, newPassword);

        if (result.success) {
            setMessage({ type: 'success', text: result.message || 'Password reset successful!' });
            setPasswordRequests(prev => prev.filter(r => r.id !== requestId));
            setNewPasswords(prev => {
                const updated = { ...prev };
                delete updated[requestId];
                return updated;
            });
        } else {
            setMessage({ type: 'error', text: result.error || 'Failed to reset password' });
        }
        setProcessingId(null);
    };

    return (
        <div className="container">
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, flexWrap: 'wrap' as const }}>
                    <a href="/" className={styles.backBtn} title="Go back">
                        <ArrowLeftIcon style={{ width: 20, height: 20 }} />
                    </a>
                    <h1 style={{ margin: 0 }}>Super Admin</h1>
                    <span className="badge badge-primary">User Management</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' as const }}>
                    <a href="/admin/super/analytics" className="btn btn-outline">
                        View Analytics
                    </a>
                    <form action={logout}>
                        <button type="submit" className="btn btn-danger">
                            Logout
                        </button>
                    </form>
                </div>
            </header>

            <div className={styles.grid}>
                <Card variant="default">
                    <CardHeader>
                        <CardTitle>Create New User</CardTitle>
                        <CardDescription>Add department admins or security staff</CardDescription>
                    </CardHeader>
                    <CardContent>
                    {message && (
                        <div className={`${styles.message} ${message.type === 'error' ? styles.error : styles.success}`}>
                            {message.text}
                        </div>
                    )}

                    <form action={handleCreateUser} ref={formRef} className={styles.form}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input name="email" type="email" required className="form-input" placeholder="Enter your email" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input name="password" type="password" required className="form-input" minLength={6} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select
                                name="role"
                                className="form-select"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                            >
                                <option value="department_admin">Department Admin</option>
                                <option value="security">Security Staff</option>
                            </select>
                        </div>

                        {selectedRole === 'department_admin' && (
                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <select name="department" className="form-select" required>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? "Creating..." : "Create User"}
                        </button>
                    </form>
                    </CardContent>
                </Card>

                <Card variant="default">
                    <CardHeader>
                        <CardTitle>Existing Users</CardTitle>
                        <CardDescription>Manage registered accounts</CardDescription>
                    </CardHeader>
                    <CardContent>
                    {users.length === 0 ? (
                        <p className={styles.placeholder}>No users found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '0.5rem' }}>Email</th>
                                        <th style={{ padding: '0.5rem' }}>Role</th>
                                        <th style={{ padding: '0.5rem' }}>Dept</th>
                                        <th style={{ padding: '0.5rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '0.5rem' }}>{user.email}</td>
                                            <td style={{ padding: '0.5rem' }}>{user.role}</td>
                                            <td style={{ padding: '0.5rem' }}>{user.department || '-'}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                {user.role !== 'super_admin' && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.email || "unknown")}
                                                        className="btn btn-outline"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderColor: 'red', color: 'red' }}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    </CardContent>
                </Card>

                {/* Password Reset Requests Section - Professional Design */}
                {passwordRequests.length > 0 && (
                    <Card variant="default" className={styles.resetSection}>
                        <div className={styles.resetHeader}>
                            <div className={styles.resetTitleGroup}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.resetIcon}>
                                    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                                </svg>
                                <h2>Password Reset Requests</h2>
                                <span className={styles.resetBadge}>{passwordRequests.length}</span>
                            </div>
                            <p className={styles.resetSubtitle}>
                                Review pending requests and set new credentials
                            </p>
                        </div>

                        <div className={styles.resetList}>
                            {passwordRequests.map((req, index) => (
                                <div
                                    key={req.id}
                                    className={styles.resetCard}
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    <div className={styles.resetCardHeader}>
                                        <div className={styles.resetAvatar}>
                                            {req.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className={styles.resetUserInfo}>
                                            <span className={styles.resetEmail}>{req.email}</span>
                                            <span className={styles.resetTime}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                                                </svg>
                                                {new Date(req.created_at).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <span className={styles.pendingTag}>Pending</span>
                                    </div>

                                    <div className={styles.resetCardBody}>
                                        <div className={styles.passwordField}>
                                            <label>New Password</label>
                                            <input
                                                type="password"
                                                placeholder="Min 6 characters"
                                                className="form-input"
                                                value={newPasswords[req.id] || ''}
                                                onChange={(e) => setNewPasswords(prev => ({
                                                    ...prev,
                                                    [req.id]: e.target.value
                                                }))}
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleProcessReset(req.id)}
                                            className={styles.resetButton}
                                            disabled={processingId === req.id || !newPasswords[req.id]}
                                        >
                                            {processingId === req.id ? (
                                                <>
                                                    <span className={styles.spinner}></span>
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
                                                        <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
                                                    </svg>
                                                    Reset & Notify
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <CustomDialog
                open={confirmDialog.open}
                onOpenChange={(open) => !open && setConfirmDialog({ open: false, userId: "", email: "" })}
                title="Confirm Delete"
                description={`Are you sure you want to delete user "${confirmDialog.email}"? This action cannot be undone.`}
            >
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" onClick={() => setConfirmDialog({ open: false, userId: "", email: "" })}>Cancel</button>
                    <button className="btn btn-danger" onClick={confirmDeleteUser} style={{ backgroundColor: 'var(--error-color)', color: 'white', borderColor: 'var(--error-color)' }}>Delete User</button>
                </div>
            </CustomDialog>
        </div>
    );
}
