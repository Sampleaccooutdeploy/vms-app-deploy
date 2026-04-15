"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "100vh",
                        padding: "2rem",
                        textAlign: "center",
                        fontFamily:
                            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                        color: "#e2e8f0",
                    }}
                >
                    <div
                        style={{
                            background: "rgba(255,255,255,0.05)",
                            backdropFilter: "blur(12px)",
                            borderRadius: "16px",
                            padding: "3rem 2rem",
                            maxWidth: "480px",
                            width: "100%",
                            border: "1px solid rgba(255,255,255,0.1)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "3rem",
                                marginBottom: "1rem",
                            }}
                        >
                            ⚠️
                        </div>
                        <h1
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: 700,
                                marginBottom: "0.75rem",
                                color: "#f8fafc",
                            }}
                        >
                            Something went wrong
                        </h1>
                        <p
                            style={{
                                fontSize: "0.95rem",
                                color: "#94a3b8",
                                marginBottom: "2rem",
                                lineHeight: 1.6,
                            }}
                        >
                            An unexpected error occurred. Please try again or contact the
                            IT department if the issue persists.
                        </p>
                        <button
                            onClick={reset}
                            style={{
                                padding: "0.75rem 2rem",
                                borderRadius: "8px",
                                border: "none",
                                background: "linear-gradient(135deg, #FF9933, #FF6600)",
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                cursor: "pointer",
                                transition: "opacity 0.2s",
                            }}
                            onMouseOver={(e) =>
                                (e.currentTarget.style.opacity = "0.9")
                            }
                            onMouseOut={(e) =>
                                (e.currentTarget.style.opacity = "1")
                            }
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
