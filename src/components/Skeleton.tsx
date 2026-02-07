import styles from "./Skeleton.module.css";
import { cn } from "@/lib/utils";

interface SkeletonProps {
    /** Width — number (px) or CSS string */
    width?: string | number;
    /** Height — number (px) or CSS string */
    height?: string | number;
    /** Preset variant */
    variant?: "text" | "textSm" | "textLg" | "title" | "circle" | "card" | "avatar" | "button";
    /** Additional CSS class */
    className?: string;
    /** Border radius override */
    borderRadius?: string | number;
    /** Inline style overrides */
    style?: React.CSSProperties;
}

export function Skeleton({
    width,
    height,
    variant,
    className,
    borderRadius,
    style,
}: SkeletonProps) {
    const variantClass = variant ? styles[variant] : undefined;

    return (
        <div
            className={cn(styles.skeleton, variantClass, className)}
            style={{
                width: typeof width === "number" ? `${width}px` : width,
                height: typeof height === "number" ? `${height}px` : height,
                borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
                ...style,
            }}
            aria-hidden="true"
        />
    );
}

/** Page-level skeleton for department admin */
export function DeptAdminSkeleton() {
    return (
        <div className={styles.pageContainer}>
            <Skeleton variant="title" width="30%" />
            <Skeleton variant="textSm" width="50%" style={{ marginBottom: "1.5rem" }} />

            {/* Stats grid */}
            <div className={styles.statsGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className={styles.statCard} />
                ))}
            </div>

            {/* Chart placeholder */}
            <Skeleton height={280} style={{ marginBottom: "2rem", borderRadius: "var(--radius-lg)" }} />

            {/* Tab bar */}
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <Skeleton variant="button" width={160} />
                <Skeleton variant="button" width={120} />
            </div>

            {/* Cards */}
            <div className={styles.cardsGrid}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className={styles.requestCard} />
                ))}
            </div>
        </div>
    );
}

/** Page-level skeleton for security gate */
export function SecuritySkeleton() {
    return (
        <div className={styles.pageContainer}>
            <Skeleton variant="title" width="25%" />
            <Skeleton variant="textSm" width="40%" style={{ marginBottom: "1.5rem" }} />

            {/* Search bar */}
            <Skeleton height={44} style={{ marginBottom: "1.5rem", borderRadius: "var(--radius-md)" }} />

            {/* Table rows */}
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.tableRow}>
                    <Skeleton variant="avatar" />
                    <Skeleton className={styles.tableCell} style={{ flex: 2 }} />
                    <Skeleton className={styles.tableCell} style={{ flex: 1.5 }} />
                    <Skeleton className={styles.tableCell} style={{ flex: 1 }} />
                    <Skeleton variant="button" width={90} />
                </div>
            ))}
        </div>
    );
}

/** Page-level skeleton for super admin */
export function SuperAdminSkeleton() {
    return (
        <div className={styles.pageContainer}>
            <Skeleton variant="title" width="35%" />
            <Skeleton variant="textSm" width="55%" style={{ marginBottom: "1.5rem" }} />

            {/* Stats */}
            <div className={styles.statsGrid}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className={styles.statCard} />
                ))}
            </div>

            {/* Chart */}
            <Skeleton height={300} style={{ marginBottom: "2rem", borderRadius: "var(--radius-lg)" }} />

            {/* User table */}
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={styles.tableRow}>
                    <Skeleton className={styles.tableCell} style={{ flex: 2 }} />
                    <Skeleton className={styles.tableCell} style={{ flex: 1.5 }} />
                    <Skeleton className={styles.tableCell} style={{ flex: 1 }} />
                    <Skeleton variant="button" width={80} />
                </div>
            ))}
        </div>
    );
}

export default Skeleton;
