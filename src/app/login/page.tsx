"use client";

import { useState, Suspense, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { CustomDialog } from "@/components/ui/CustomDialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    LockPasswordIcon,
    Mail01Icon,
    ArrowRight01Icon,
    ViewIcon,
    ViewOffSlashIcon,
    AlertCircleIcon,
    Key01Icon
} from "@hugeicons/core-free-icons";

function LoginForm() {
    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();

    const role = searchParams.get("role") || "admin";
    const redirectTo = searchParams.get("redirect") || "";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Forgot password state
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Check Caps Lock
    const handleKeyDown = (e: React.KeyboardEvent) => {
        setCapsLockOn(e.getModifierState("CapsLock"));
    };

    const getTitle = () => {
        if (role === "security") return "Security Login";
        if (role === "super_admin") return "Super Admin Login";
        return "Department Staff Login";
    };

    // Check "Remember Me" on mount
    useEffect(() => {
        const rememberedEmail = localStorage.getItem("rememberedEmail");
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            setLoading(false);
            return;
        }

        try {
            if (rememberMe) {
                localStorage.setItem("rememberedEmail", email);
            } else {
                localStorage.removeItem("rememberedEmail");
            }

            const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw new Error("Incorrect email or password. Please try again.");

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", data.user?.id)
                .single();

            if (!profile) throw new Error("Profile not found. Contact administrator.");

            // Redirect to original destination or role-based dashboard
            if (redirectTo) {
                router.push(redirectTo);
            } else if (profile.role === "department_admin") router.push("/admin/dept");
            else if (profile.role === "security") router.push("/security");
            else if (profile.role === "super_admin") router.push("/admin/super");
            else router.push("/");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "Login failed";
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotMessage(null);

        try {
            const { submitPasswordResetRequest } = await import("@/app/actions/password");
            const result = await submitPasswordResetRequest(forgotEmail);

            if (result.success) {
                setForgotMessage({ type: "success", text: result.message || "Request submitted!" });
                setForgotEmail("");
            } else {
                setForgotMessage({ type: "error", text: result.error || "Something went wrong" });
            }
        } catch {
            setForgotMessage({ type: "error", text: "Failed to submit request" });
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            {/* Subtle dot pattern background */}
            <div className={styles.bgPattern} aria-hidden="true" />
            <div className={styles.loginCard}>
                <div className={styles.iconHeader}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/login.png" alt="SCSVMV Login Logo" className={styles.logo} onError={(e) => (e.currentTarget.src = "/window.svg")} />
                </div>

                <h1 className={styles.title}>{getTitle()}</h1>
                <p className={styles.subtitle}>Sign in to your account</p>

                {error && (
                    <div className={styles.error} role="alert" aria-live="polite">
                        <HugeiconsIcon icon={AlertCircleIcon} size={18} className={styles.errorIcon} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className={styles.form}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address</label>
                        <div className={styles.inputWrapper}>
                            <HugeiconsIcon icon={Mail01Icon} size={20} className={styles.inputIcon} />
                            <input
                                id="email"
                                type="email"
                                required
                                className="form-input"
                                style={{ paddingLeft: "2.5rem" }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                            <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                            <button type="button" className={styles.forgotLink} onClick={() => setShowForgotModal(true)}>
                                <HugeiconsIcon icon={Key01Icon} size={14} className={styles.keyIcon} /> Forgot Password?
                            </button>
                        </div>
                        <div className={styles.inputWrapper}>
                            <HugeiconsIcon icon={LockPasswordIcon} size={20} className={styles.inputIcon} />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                required
                                className="form-input"
                                style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className={styles.toggleBtn}
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <HugeiconsIcon icon={ViewOffSlashIcon} size={20} className={styles.eyeIcon} /> : <HugeiconsIcon icon={ViewIcon} size={20} className={styles.eyeIcon} />}
                            </button>
                        </div>
                        {capsLockOn && (
                            <div className={styles.warningText}>
                                <HugeiconsIcon icon={AlertCircleIcon} size={14} /> Caps Lock is ON
                            </div>
                        )}
                    </div>

                    <div className={styles.rememberMe}>
                        <input
                            type="checkbox"
                            id="remember"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className={styles.checkbox}
                        />
                        <label htmlFor="remember">Remember me</label>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
                        {loading ? "Signing In..." : "Sign In"} <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                    </button>
                </form>

                <p className={styles.footerText}>
                    Need help? <a href="mailto:support@scsvmv.ac.in">Contact Support</a>
                </p>
            </div>

            {/* Forgot Password Modal — Using Radix CustomDialog */}
            <CustomDialog
                open={showForgotModal}
                onOpenChange={setShowForgotModal}
                title="Forgot Password"
                description="Enter your email address and we'll send a password reset request to the administrator."
            >
                {forgotMessage && (
                    <div
                        style={{
                            padding: "0.75rem",
                            borderRadius: "8px",
                            marginBottom: "1rem",
                            background: forgotMessage.type === "success" ? "#E6F4EA" : "#FDEAEA",
                            color: forgotMessage.type === "success" ? "#1E8E3E" : "#EA4335",
                            fontSize: "0.9rem",
                        }}
                    >
                        {forgotMessage.text}
                    </div>
                )}

                <form onSubmit={handleForgotPassword}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="forgot-email">Email Address</label>
                        <input
                            id="forgot-email"
                            type="email"
                            required
                            className="form-input"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="Enter your email"
                        />
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                        <button type="button" className="btn btn-outline" onClick={() => setShowForgotModal(false)} style={{ flex: 1 }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={forgotLoading}>
                            {forgotLoading ? "Submitting..." : "Submit Request"}
                        </button>
                    </div>
                </form>
            </CustomDialog>
        </div>
    );
}

export default function Login() {
    return (
        <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "85vh" }}>Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
