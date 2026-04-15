"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type ScannerStatus = "disconnected" | "connected" | "scanning";

interface UseBarcodeScanner {
    status: ScannerStatus;
    lastScannedValue: string;
    inputRef: (node: HTMLInputElement | null) => void;
}

/**
 * Custom hook for USB barcode scanner (keyboard-wedge mode).
 *
 * Uses a callback ref so the keydown listener is correctly attached
 * even when the input is conditionally rendered (e.g. after PIN auth).
 *
 * Strategy:
 *  - keydown captures every printable character into a buffer
 *  - Enter key  → immediate submit (buffer or DOM value, whichever longer)
 *  - 300 ms idle → auto-submit ONLY when ≥ 6 chars arrived within 2 s (scanner speed)
 *  - paste event → immediate submit
 *  - 500 ms scan-lock prevents double-fire
 */
export function useBarcodeScanner(
    onScan: (value: string) => void
): UseBarcodeScanner {
    const [status, setStatus] = useState<ScannerStatus>("disconnected");
    const [lastScannedValue, setLastScannedValue] = useState("");

    // Track the actual DOM element via state so effects re-run on mount/unmount.
    const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);

    // Callback ref — React calls this when the element mounts / unmounts
    const inputRef = useCallback((node: HTMLInputElement | null) => {
        setInputEl(node);
    }, []);

    const bufferRef = useRef<string[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lockRef = useRef(false);
    const firstCharTimeRef = useRef(0);

    // Audio feedback
    const playBeep = useCallback(() => {
        try {
            const ctx = new (
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext })
                    .webkitAudioContext
            )();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 1200;
            osc.type = "sine";
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
            
            // Clean up to prevent AudioContext memory leaks
            setTimeout(() => {
                try {
                    ctx.close();
                } catch (e) { }
            }, 150);
        } catch {
            // Audio API not available
        }
    }, []);

    const focusInput = useCallback(() => {
        if (inputEl && document.activeElement !== inputEl) {
            inputEl.focus();
        }
    }, [inputEl]);

    // Status: connected when input element exists
    useEffect(() => {
        setStatus(inputEl ? "connected" : "disconnected");
    }, [inputEl]);

    // Focus on mount
    useEffect(() => {
        focusInput();
    }, [focusInput]);

    // ── Core keydown + paste handlers ──
    useEffect(() => {
        if (!inputEl) return;

        console.log("[BarcodeScanner] v5 — listeners attached");

        const processScan = (value: string) => {
            if (lockRef.current || value.length < 3) return;

            console.log("[BarcodeScanner] ✅ Scan submitted:", value);
            lockRef.current = true;
            playBeep();
            setLastScannedValue(value);
            setStatus("connected");
            onScan(value);

            // Reset
            bufferRef.current = [];
            firstCharTimeRef.current = 0;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            setTimeout(() => {
                lockRef.current = false;
            }, 500);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (lockRef.current) return;

            // Start burst timer on first printable char
            if (e.key.length === 1 && !firstCharTimeRef.current) {
                firstCharTimeRef.current = Date.now();
            }

            // Buffer every printable character (ignores Shift, Ctrl, etc.)
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                bufferRef.current.push(e.key);
                console.log(
                    "[BarcodeScanner] Key:",
                    e.key,
                    "| Buffer:",
                    bufferRef.current.join("")
                );

                // Visual feedback for rapid input
                if (
                    bufferRef.current.length >= 3 &&
                    Date.now() - firstCharTimeRef.current < 1000
                ) {
                    setStatus("scanning");
                }
            }

            // Clear pending auto-submit on every keystroke
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            // ── Enter = immediate submit ──
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();

                const bufVal = bufferRef.current.join("").trim();
                const domVal = inputEl.value.trim();
                const value = bufVal.length >= domVal.length ? bufVal : domVal;

                console.log(
                    "[BarcodeScanner] Enter | Buffer:",
                    bufVal,
                    "| DOM:",
                    domVal,
                    "| Using:",
                    value
                );

                if (value.length >= 3) {
                    processScan(value);
                } else {
                    bufferRef.current = [];
                    firstCharTimeRef.current = 0;
                }
                return;
            }

            // ── Auto-submit after 300 ms silence ──
            // Only fires when ≥ 6 chars arrived within 2 s (scanner speed)
            timerRef.current = setTimeout(() => {
                const bufVal = bufferRef.current.join("").trim();
                const domVal = inputEl.value.trim();
                const value = bufVal.length >= domVal.length ? bufVal : domVal;
                const elapsed = Date.now() - firstCharTimeRef.current;

                console.log(
                    "[BarcodeScanner] Timeout | Buffer:",
                    bufVal,
                    "| DOM:",
                    domVal,
                    "| Elapsed:",
                    elapsed + "ms"
                );

                if (value.length >= 6 && elapsed < 2000) {
                    processScan(value);
                } else {
                    // Slow manual typing — reset, don't submit
                    bufferRef.current = [];
                    firstCharTimeRef.current = 0;
                    setStatus("connected");
                }
            }, 300);
        };

        // Some scanners paste data via clipboard
        const handlePaste = (e: ClipboardEvent) => {
            if (lockRef.current) return;
            const text = e.clipboardData?.getData("text")?.trim();
            console.log("[BarcodeScanner] Paste detected:", text);
            if (text && text.length >= 3) {
                e.preventDefault();
                processScan(text);
            }
        };

        inputEl.addEventListener("keydown", handleKeyDown);
        inputEl.addEventListener("paste", handlePaste);
        return () => {
            inputEl.removeEventListener("keydown", handleKeyDown);
            inputEl.removeEventListener("paste", handlePaste);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [inputEl, onScan, playBeep]);

    // Global keydown — capture scanner keys when input isn't focused
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target === inputEl) return;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                console.log(
                    "[BarcodeScanner] Global key captured, refocusing:",
                    e.key
                );
                focusInput();
                bufferRef.current.push(e.key);
                if (!firstCharTimeRef.current) {
                    firstCharTimeRef.current = Date.now();
                }
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [inputEl, focusInput]);

    return {
        status,
        lastScannedValue,
        inputRef,
    };
}
