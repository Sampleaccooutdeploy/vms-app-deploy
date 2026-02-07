"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { XMarkIcon } from "@heroicons/react/24/outline";

// Styles mimicking Shadcn/Tailwind default feeling but with plain CSS
const overlayStyle: React.CSSProperties = {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    position: "fixed",
    inset: 0,
    zIndex: 50,
    animation: "overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
    backdropFilter: "blur(4px)" // Nice blurred background
};

const contentStyle: React.CSSProperties = {
    backgroundColor: "var(--surface-color)",
    borderRadius: "8px",
    boxShadow: "0 10px 38px -10px rgba(22, 23, 24, 0.35), 0 10px 20px -15px rgba(22, 23, 24, 0.2)",
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "calc(100vw - 2rem)",
    maxWidth: "500px",
    maxHeight: "85vh",
    padding: "24px",
    zIndex: 51,
    animation: "contentShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
    border: "1px solid var(--border-color)",
    overflowY: "auto" as const,
    boxSizing: "border-box" as const,
};

const titleStyle: React.CSSProperties = {
    marginTop: 0,
    marginBottom: "8px",
    fontWeight: 600,
    fontSize: "1.25rem",
    lineHeight: 1.2,
    color: "var(--text-primary)"
};

const descStyle: React.CSSProperties = {
    margin: "10px 0 20px",
    fontSize: "1rem", // slightly larger for readability
    lineHeight: 1.5,
    color: "var(--text-secondary)"
};

const closeBtnStyle: React.CSSProperties = {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    color: "var(--text-muted)",
    display: "flex", // for centering icon
    alignItems: "center",
    justifyContent: "center"
};

// Keyframes injected globally for simplicity
const globalKeyframes = `
@keyframes overlayShow {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes contentShow {
  from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
`;

interface CustomDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: React.ReactNode; // Flexible content
    children?: React.ReactNode;
}

export function CustomDialog({ open, onOpenChange, title, description, children }: CustomDialogProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <style>{globalKeyframes}</style>
                <Dialog.Overlay style={overlayStyle} />
                <Dialog.Content style={contentStyle}>
                    <Dialog.Title style={titleStyle}>{title}</Dialog.Title>
                    <div style={descStyle}>{description}</div>

                    {children}

                    <Dialog.Close asChild>
                        <button style={closeBtnStyle} aria-label="Close">
                            <XMarkIcon style={{ width: 20, height: 20 }} />
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
