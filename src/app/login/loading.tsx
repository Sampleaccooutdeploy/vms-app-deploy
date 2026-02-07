import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", padding: "2rem" }}>
            <div style={{ width: "100%", maxWidth: 480 }}>
                <Skeleton variant="title" width="60%" style={{ margin: "0 auto 1rem" }} />
                <Skeleton height={44} style={{ marginBottom: "1rem" }} />
                <Skeleton height={44} style={{ marginBottom: "1.5rem" }} />
                <Skeleton variant="button" width="100%" height={44} />
            </div>
        </div>
    );
}
