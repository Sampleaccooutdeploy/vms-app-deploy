"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
    CameraIcon,
    CloudArrowUpIcon,
    ArrowPathIcon,
    XMarkIcon,
    VideoCameraIcon,
} from "@heroicons/react/24/outline";
import styles from "./FaceCapture.module.css";

interface FaceCaptureProps {
    /** Currently selected file (from parent state) */
    selectedFile: File | null;
    /** Preview URL string (from parent state) */
    previewUrl: string;
    /** Callback when a file is selected/captured */
    onFileSelect: (file: File | null) => void;
    /** Callback when preview URL changes */
    onPreviewChange: (url: string) => void;
    /** Whether photo is required */
    required?: boolean;
}

type CaptureMode = "upload" | "camera";
type CameraFacing = "user" | "environment";

export default function FaceCapture({
    selectedFile,
    previewUrl,
    onFileSelect,
    onPreviewChange,
    required = true,
}: FaceCaptureProps) {
    const [mode, setMode] = useState<CaptureMode>("upload");
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<CameraFacing>("user");
    const [countdown, setCountdown] = useState<number | null>(null);
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => {
            const mobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            ) || window.innerWidth <= 768;
            setIsMobile(mobile);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Detect multiple cameras
    useEffect(() => {
        async function checkCameras() {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter((d) => d.kind === "videoinput");
                setHasMultipleCameras(videoDevices.length > 1);
            } catch {
                setHasMultipleCameras(false);
            }
        }
        if (typeof navigator !== "undefined" && navigator.mediaDevices) {
            checkCameras();
        }
    }, []);

    /** Stop camera stream */
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
        setCameraReady(false);
        setCameraError(null);
        setCountdown(null);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    /** Start camera stream */
    const startCamera = useCallback(async () => {
        setCameraError(null);
        setCameraReady(false);
        setCameraActive(true);

        // Guard: mediaDevices API requires a secure context (HTTPS or localhost)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraActive(false);
            setCameraError(
                "Camera is not available. Please use HTTPS or localhost, or try a different browser."
            );
            return;
        }

        try {
            // Stop existing stream first
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                },
                audio: false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setCameraReady(true);
                };
            }
        } catch (err) {
            console.error("Camera access error:", err);
            setCameraActive(false);
            if (err instanceof DOMException) {
                if (err.name === "NotAllowedError") {
                    setCameraError(
                        "Camera permission denied. Please allow camera access in your browser settings."
                    );
                } else if (err.name === "NotFoundError") {
                    setCameraError("No camera found on this device.");
                } else if (err.name === "NotReadableError") {
                    setCameraError(
                        "Camera is in use by another application. Please close other apps using the camera."
                    );
                } else {
                    setCameraError(`Camera error: ${err.message}`);
                }
            } else {
                setCameraError("Failed to access camera. Please try again.");
            }
        }
    }, [facingMode]);

    /** Flip camera (mobile) */
    const flipCamera = useCallback(() => {
        const newFacing = facingMode === "user" ? "environment" : "user";
        setFacingMode(newFacing);
        if (cameraActive) {
            stopCamera();
            // Restart with new facing after a brief delay
            setTimeout(() => {
                startCamera();
            }, 300);
        }
    }, [facingMode, cameraActive, stopCamera, startCamera]);

    // Restart camera when facingMode changes while active
    useEffect(() => {
        if (cameraActive && streamRef.current) {
            // Camera is already running, the flipCamera handles restart
        }
    }, [facingMode, cameraActive]);

    /** Capture photo from video stream */
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Set canvas to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Mirror the image if using front camera
        if (facingMode === "user") {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Convert to blob
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    const file = new File([blob], `face_capture_${Date.now()}.jpg`, {
                        type: "image/jpeg",
                    });
                    const url = URL.createObjectURL(blob);
                    onFileSelect(file);
                    onPreviewChange(url);
                    stopCamera();
                }
            },
            "image/jpeg",
            0.92
        );
    }, [facingMode, onFileSelect, onPreviewChange, stopCamera]);

    /** Capture with countdown */
    const captureWithCountdown = useCallback(() => {
        setCountdown(3);
        let count = 3;
        const interval = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(interval);
                setCountdown(null);
                capturePhoto();
            } else {
                setCountdown(count);
            }
        }, 1000);
    }, [capturePhoto]);

    /** Handle file upload */
    const handleFileUpload = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                onFileSelect(file);
                const url = URL.createObjectURL(file);
                onPreviewChange(url);
            } else {
                onFileSelect(null);
                onPreviewChange("");
            }
        },
        [onFileSelect, onPreviewChange]
    );

    /** Clear photo */
    const clearPhoto = useCallback(() => {
        onFileSelect(null);
        onPreviewChange("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [onFileSelect, onPreviewChange]);

    /** Switch mode */
    const switchMode = useCallback(
        (newMode: CaptureMode) => {
            if (cameraActive) stopCamera();
            setMode(newMode);
        },
        [cameraActive, stopCamera]
    );

    // ── Render ──────────────────────────────────────────────

    // If we already have a preview, show it
    if (previewUrl && selectedFile) {
        return (
            <div className={styles.container}>
                <div className={styles.previewContainer}>
                    <div className={styles.previewImageWrapper}>
                        <img
                            src={previewUrl}
                            alt="Captured face"
                            className={styles.previewImage}
                        />
                        <div className={styles.previewBadge}>
                            {mode === "camera" ? (
                                <>
                                    <CameraIcon className={styles.badgeIcon} /> Live Capture
                                </>
                            ) : (
                                <>
                                    <CloudArrowUpIcon className={styles.badgeIcon} /> Uploaded
                                </>
                            )}
                        </div>
                    </div>
                    <div className={styles.previewActions}>
                        <button
                            type="button"
                            className={styles.retakeBtn}
                            onClick={clearPhoto}
                        >
                            <ArrowPathIcon className={styles.actionIcon} />
                            Change Photo
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Mode Toggle Tabs */}
            <div className={styles.modeToggle}>
                <button
                    type="button"
                    className={`${styles.modeBtn} ${mode === "upload" ? styles.modeBtnActive : ""}`}
                    onClick={() => switchMode("upload")}
                >
                    <CloudArrowUpIcon className={styles.modeBtnIcon} />
                    Upload Photo
                </button>
                <button
                    type="button"
                    className={`${styles.modeBtn} ${mode === "camera" ? styles.modeBtnActive : ""}`}
                    onClick={() => switchMode("camera")}
                >
                    <CameraIcon className={styles.modeBtnIcon} />
                    Live Capture
                </button>
            </div>

            {/* Upload Mode */}
            {mode === "upload" && (
                <div className={styles.uploadZone}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png, image/jpeg, image/webp"
                        className={styles.fileInput}
                        id="face-upload-input"
                        onChange={handleFileUpload}
                        required={required && !selectedFile}
                    />
                    <label htmlFor="face-upload-input" className={styles.uploadLabel}>
                        <div className={styles.uploadIconWrapper}>
                            <CloudArrowUpIcon className={styles.uploadMainIcon} />
                        </div>
                        <span className={styles.uploadText}>
                            {isMobile ? "Tap to select a photo" : "Click to upload or drag & drop"}
                        </span>
                        <span className={styles.uploadHint}>
                            JPG, PNG or WebP &bull; Max 5 MB
                        </span>
                    </label>
                </div>
            )}

            {/* Camera Mode */}
            {mode === "camera" && (
                <div className={styles.cameraZone}>
                    {/* Camera Error */}
                    {cameraError && (
                        <div className={styles.cameraError}>
                            <XMarkIcon className={styles.errorIcon} />
                            <p>{cameraError}</p>
                            <button
                                type="button"
                                className={styles.retryBtn}
                                onClick={startCamera}
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Camera not started yet */}
                    {!cameraActive && !cameraError && (
                        <div className={styles.cameraPrompt}>
                            <div className={styles.cameraPromptIcon}>
                                <VideoCameraIcon className={styles.promptIcon} />
                            </div>
                            <p className={styles.promptText}>
                                {isMobile
                                    ? "Tap the button below to open your camera"
                                    : "Click the button below to start your webcam"}
                            </p>
                            <button
                                type="button"
                                className={styles.startCameraBtn}
                                onClick={startCamera}
                            >
                                <CameraIcon className={styles.actionIcon} />
                                Open Camera
                            </button>
                        </div>
                    )}

                    {/* Camera Active */}
                    {cameraActive && !cameraError && (
                        <div className={styles.cameraViewport}>
                            <div className={styles.videoContainer}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`${styles.video} ${facingMode === "user" ? styles.videoMirrored : ""}`}
                                />

                                {/* Face Guide Oval */}
                                {cameraReady && (
                                    <div className={styles.faceGuideOverlay}>
                                        <div className={styles.faceOval}>
                                            <div className={styles.faceOvalCornerTL} />
                                            <div className={styles.faceOvalCornerTR} />
                                            <div className={styles.faceOvalCornerBL} />
                                            <div className={styles.faceOvalCornerBR} />
                                        </div>
                                        <p className={styles.guidanceText}>
                                            Position your face within the oval
                                        </p>
                                    </div>
                                )}

                                {/* Countdown Overlay */}
                                {countdown !== null && (
                                    <div className={styles.countdownOverlay}>
                                        <span className={styles.countdownNumber}>{countdown}</span>
                                    </div>
                                )}

                                {/* Loading spinner while camera initializes */}
                                {!cameraReady && (
                                    <div className={styles.cameraLoading}>
                                        <div className={styles.spinner} />
                                        <span>Starting camera...</span>
                                    </div>
                                )}
                            </div>

                            {/* Camera Controls */}
                            {cameraReady && (
                                <div className={styles.cameraControls}>
                                    {/* Flip camera on mobile */}
                                    {hasMultipleCameras && (
                                        <button
                                            type="button"
                                            className={styles.controlBtn}
                                            onClick={flipCamera}
                                            title="Flip Camera"
                                        >
                                            <ArrowPathIcon className={styles.controlIcon} />
                                        </button>
                                    )}

                                    {/* Capture button */}
                                    <button
                                        type="button"
                                        className={styles.captureBtn}
                                        onClick={captureWithCountdown}
                                        disabled={countdown !== null}
                                        title="Capture Photo"
                                    >
                                        <div className={styles.captureBtnInner} />
                                    </button>

                                    {/* Close camera */}
                                    <button
                                        type="button"
                                        className={styles.controlBtn}
                                        onClick={stopCamera}
                                        title="Close Camera"
                                    >
                                        <XMarkIcon className={styles.controlIcon} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className={styles.hiddenCanvas} />
        </div>
    );
}
