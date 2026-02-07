import React from "react";
import styles from "./Card.module.css";

/* ─── ShadCN-inspired Card system (CSS Modules, no Tailwind) ─── */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "elevated";
}

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={`${styles.card} ${styles[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.cardHeader} ${className ?? ""}`} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`${styles.cardTitle} ${className ?? ""}`} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`${styles.cardDescription} ${className ?? ""}`} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.cardContent} ${className ?? ""}`} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.cardFooter} ${className ?? ""}`} {...props} />;
}
