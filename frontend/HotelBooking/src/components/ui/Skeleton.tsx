import React, { CSSProperties } from "react";
import styles from "@/styles/Skeleton.module.css";

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: string;
    className?: string;
}

export function Skeleton({ width = "100%", height = "1rem", borderRadius = "6px", className }: SkeletonProps) {
    const style: CSSProperties = {
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius,
    };
    return <span className={`${styles.skeleton} ${className ?? ""}`} style={style} aria-hidden="true" />;
}

export function SkeletonCard({ rows = 4 }: { rows?: number }) {
    return (
        <div className={styles.card}>
            <Skeleton height="1.2rem" width="60%" />
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} height="0.9rem" width={i % 3 === 0 ? "80%" : "100%"} />
            ))}
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className={styles.tableWrapper}>
            <div className={styles.tableHeader}>
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} height="0.85rem" width="70%" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className={styles.tableRow}>
                    {Array.from({ length: cols }).map((_, c) => (
                        <Skeleton key={c} height="0.85rem" width={c === 0 ? "90%" : "70%"} />
                    ))}
                </div>
            ))}
        </div>
    );
}
