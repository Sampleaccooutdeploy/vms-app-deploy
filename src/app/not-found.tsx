import Link from "next/link";

export default function NotFound() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "80vh",
                padding: "2rem",
                textAlign: "center",
            }}
        >
            <div
                style={{
                    background: "var(--card-bg, #fff)",
                    borderRadius: "16px",
                    padding: "3rem 2rem",
                    maxWidth: "480px",
                    width: "100%",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                    border: "1px solid var(--border, #e2e8f0)",
                }}
            >
                <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔍</div>
                <h1
                    style={{
                        fontSize: "2rem",
                        fontWeight: 700,
                        marginBottom: "0.5rem",
                        color: "var(--text-primary, #1e293b)",
                    }}
                >
                    404
                </h1>
                <h2
                    style={{
                        fontSize: "1.25rem",
                        fontWeight: 500,
                        marginBottom: "1rem",
                        color: "var(--text-secondary, #475569)",
                    }}
                >
                    Page Not Found
                </h2>
                <p
                    style={{
                        fontSize: "0.95rem",
                        color: "var(--text-muted, #94a3b8)",
                        marginBottom: "2rem",
                        lineHeight: 1.6,
                    }}
                >
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                    <Link
                        href="/register"
                        style={{
                            padding: "0.75rem 1.5rem",
                            borderRadius: "8px",
                            background: "linear-gradient(135deg, #FF9933, #FF6600)",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            textDecoration: "none",
                            transition: "opacity 0.2s",
                        }}
                    >
                        Visitor Registration
                    </Link>
                    <Link
                        href="/login"
                        style={{
                            padding: "0.75rem 1.5rem",
                            borderRadius: "8px",
                            background: "transparent",
                            color: "var(--text-primary, #1e293b)",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            textDecoration: "none",
                            border: "1px solid var(--border, #e2e8f0)",
                            transition: "background 0.2s",
                        }}
                    >
                        Staff Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
