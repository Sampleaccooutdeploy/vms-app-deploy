"use client";

import React, { useEffect, useRef, useId } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import styles from "./WebcamScanner.module.css";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface WebcamScannerProps {
    onScan: (value: string) => void;
    onClose: () => void;
}

export default function WebcamScanner({ onScan, onClose }: WebcamScannerProps) {
    // Unique ID so we can mount/unmount cleanly without collisions
    const rawId = useId();
    const qrcodeRegionId = `qr-${rawId.replace(/:/g, "")}`;
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Prevent double init in React strict mode
        if (!scannerRef.current) {
            scannerRef.current = new Html5QrcodeScanner(
                qrcodeRegionId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    rememberLastUsedCamera: true,
                },
                /* verbose= */ false
            );

            scannerRef.current.render(
                (decodedText) => {
                    // Prevent multiple re-reads firing rapidly
                    if (scannerRef.current) {
                        try {
                            scannerRef.current.pause(true);
                        } catch {
                            /* silently ignore pause errors */
                        }
                    }
                    onScan(decodedText);
                },
                (error) => {
                    // We purposefully ignore the flood of "not found" errors the library emits
                }
            );
        }

        return () => {
            if (scannerRef.current) {
                // Must catch promise rejections if the user closes it while it's parsing
                scannerRef.current.clear().catch((e) => {
                    console.error("Failed to clear html5QrcodeScanner. ", e);
                });
                scannerRef.current = null;
            }
        };
    }, [onScan]);

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Scan Barcode / QR</h3>
                    <button onClick={onClose} className={styles.closeBtn} title="Close Scanner">
                        <XMarkIcon className={styles.closeIcon} />
                    </button>
                </div>
                
                <div className={styles.scannerWrapper}>
                    <div id={qrcodeRegionId} className={styles.readerDiv}></div>
                </div>
                
                <p className={styles.instructions}>
                    Hold your phone screen or printed pass steady in the frame.
                </p>
            </div>
        </div>
    );
}
