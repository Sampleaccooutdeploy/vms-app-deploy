"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import styles from "./page.module.css";
import { CustomDialog } from "@/components/ui/CustomDialog";
import { DEPARTMENTS, DESIGNATIONS, ID_PROOF_TYPES, MAX_PHOTO_SIZE_BYTES, ALLOWED_PHOTO_TYPES } from "@/lib/constants";
import {
    CheckCircleIcon,
    CloudArrowUpIcon,
    UserIcon,
    BriefcaseIcon,
    BuildingOfficeIcon,
    PhoneIcon,
    EnvelopeIcon,
    ChatBubbleBottomCenterTextIcon,
    MapPinIcon,
    CheckBadgeIcon,
    ExclamationTriangleIcon,
    CameraIcon,
    IdentificationIcon,
} from "@heroicons/react/24/outline";
import CalendarTimePicker from "@/components/ui/CalendarTimePicker";
import FaceCapture from "@/components/ui/FaceCapture";

// Progress step definitions
const FORM_STEPS = [
    { id: "personal", label: "Personal", fields: ["name", "designation"] },
    { id: "contact", label: "Contact", fields: ["organization", "email", "phone"] },
    { id: "identity", label: "ID Proof", fields: ["idProofType", "idProofNumber"] },
    { id: "visit", label: "Visit Details", fields: ["department", "purpose", "expectedDate", "expectedTime"] },
    { id: "photo", label: "Photo", fields: [] }, // Photo tracked separately
] as const;

export default function Register() {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [draftRestored, setDraftRestored] = useState(false);
    const [honeypotField, setHoneypotField] = useState(""); // Anti-bot honeypot
    const [submittedData, setSubmittedData] = useState<{
        name: string;
        designation: string;
        organization: string;
        phone: string;
        email: string;
        idProofType: string;
        idProofNumber: string;
        purpose: string;
        department: string;
        photoUrl: string;
        expectedDate: string;
        expectedTime: string;
    } | null>(null);

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogContent, setDialogContent] = useState({ title: "", message: "", type: "error" });

    // Helper to show dialog
    const showDialog = (title: string, message: string, type: "error" | "success" = "error") => {
        setDialogContent({ title, message, type });
        setDialogOpen(true);
    };

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        designation: "",
        organization: "",
        countryCode: "+91",
        phone: "",
        email: "",
        idProofType: "",
        idProofNumber: "",
        purpose: "",
        department: "",
        expectedDate: "",
        expectedTime: "",
    });

    // Calculate form progress
    const formProgress = useMemo(() => {
        const stepStatuses = FORM_STEPS.map((step) => {
            if (step.id === "photo") return selectedFile ? true : false;
            return step.fields.every((field) => {
                const val = formData[field as keyof typeof formData];
                return val !== undefined && val !== "";
            });
        });
        const completedSteps = stepStatuses.filter(Boolean).length;
        const percentage = Math.round((completedSteps / FORM_STEPS.length) * 100);
        return { stepStatuses, completedSteps, percentage };
    }, [formData, selectedFile]);

    const [emailValidFormat, setEmailValidFormat] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [phoneTouched, setPhoneTouched] = useState(false);

    // Designation autocomplete state
    const [designationFocused, setDesignationFocused] = useState(false);
    const [designationHighlight, setDesignationHighlight] = useState(-1);
    const designationRef = useRef<HTMLDivElement>(null);

    const filteredDesignations = useMemo(() => {
        const query = formData.designation.trim().toLowerCase();
        if (!query) return DESIGNATIONS.slice(0, 8); // Show top 8 when empty
        return DESIGNATIONS.filter((d) =>
            d.toLowerCase().includes(query)
        ).slice(0, 8);
    }, [formData.designation]);

    const handleDesignationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, designation: val }));
        setDesignationHighlight(-1);
    };

    const selectDesignation = (value: string) => {
        setFormData(prev => ({ ...prev, designation: value }));
        setDesignationFocused(false);
        setDesignationHighlight(-1);
    };

    const handleDesignationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!designationFocused || filteredDesignations.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setDesignationHighlight(prev =>
                prev < filteredDesignations.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setDesignationHighlight(prev =>
                prev > 0 ? prev - 1 : filteredDesignations.length - 1
            );
        } else if (e.key === "Enter" && designationHighlight >= 0) {
            e.preventDefault();
            selectDesignation(filteredDesignations[designationHighlight]);
        } else if (e.key === "Escape") {
            setDesignationFocused(false);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (designationRef.current && !designationRef.current.contains(e.target as Node)) {
                setDesignationFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Autosave Logic (Session Storage for security)
    useEffect(() => {
        const savedDraft = sessionStorage.getItem("visitor_form_draft");
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                setFormData(parsed);
                if (parsed.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.email)) {
                    setEmailValidFormat(true);
                }
                setDraftRestored(true);
                setTimeout(() => setDraftRestored(false), 3000);
            } catch (e) {
                console.error("Failed to restore draft", e);
            }
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            sessionStorage.setItem("visitor_form_draft", JSON.stringify(formData));
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData]);

    // Handlers

    // Cleanup Object URL on unmount or change
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val.length <= 30) {
            setFormData(prev => ({ ...prev, name: val }));
        }
    };

    // ── Phone formatting helpers ────────────────────────────
    const formatPhoneDisplay = (raw: string, code: string): string => {
        if (!raw) return "";
        // India: 5-5  (98765 43210)
        if (code === "+91" && raw.length <= 10) {
            if (raw.length <= 5) return raw;
            return `${raw.slice(0, 5)} ${raw.slice(5)}`;
        }
        // US/Canada: 3-3-4  (201 555 0123)
        if (code === "+1" && raw.length <= 10) {
            if (raw.length <= 3) return raw;
            if (raw.length <= 6) return `${raw.slice(0, 3)} ${raw.slice(3)}`;
            return `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6)}`;
        }
        // UK: 4-3-4 or 4-7
        if (code === "+44" && raw.length <= 11) {
            if (raw.length <= 4) return raw;
            if (raw.length <= 7) return `${raw.slice(0, 4)} ${raw.slice(4)}`;
            return `${raw.slice(0, 4)} ${raw.slice(4, 7)} ${raw.slice(7)}`;
        }
        // Default: groups of 4
        return raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    };

    const getPhoneMaxDigits = (code: string): number => {
        if (code === "+91") return 10;
        if (code === "+1") return 10;
        if (code === "+44") return 11;
        return 15;
    };

    const isPhoneComplete = (raw: string, code: string): boolean => {
        if (code === "+91") return raw.length === 10;
        if (code === "+1") return raw.length === 10;
        if (code === "+44") return raw.length >= 10 && raw.length <= 11;
        return raw.length >= 7;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Strip everything except digits from the input
        const raw = e.target.value.replace(/\D/g, "");
        const max = getPhoneMaxDigits(formData.countryCode);
        if (raw.length <= max) {
            setFormData(prev => ({ ...prev, phone: raw }));
        }
        if (!phoneTouched) setPhoneTouched(true);
    };

    // ── Email validation helpers ────────────────────────────
    const KNOWN_DOMAINS = [
        "gmail.com", "yahoo.com", "yahoo.in", "outlook.com", "hotmail.com",
        "live.com", "icloud.com", "protonmail.com", "rediffmail.com",
        "zoho.com", "aol.com", "mail.com", "yandex.com",
    ];

    const getEmailStatus = (email: string): { valid: boolean; hint: string } => {
        if (!email) return { valid: false, hint: "" };
        const basic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!basic) {
            if (!email.includes("@")) return { valid: false, hint: 'Missing "@" symbol' };
            const [, domain] = email.split("@");
            if (!domain || !domain.includes(".")) return { valid: false, hint: "Incomplete domain (e.g. gmail.com)" };
            return { valid: false, hint: "Invalid email format" };
        }
        // Extra checks
        const [localPart, domain] = email.split("@");
        if (localPart.length < 1) return { valid: false, hint: "Username is empty" };
        if (domain.length < 4) return { valid: false, hint: "Domain too short" };
        // Suggest known domain if close
        const lowerDomain = domain.toLowerCase();
        if (!lowerDomain.includes(".") || lowerDomain.endsWith(".")) {
            return { valid: false, hint: "Incomplete domain" };
        }
        return { valid: true, hint: "" };
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const email = e.target.value;
        setFormData(prev => ({ ...prev, email }));
        const { valid } = getEmailStatus(email);
        setEmailValidFormat(valid);
        if (!emailTouched) setEmailTouched(true);
    };

    // ── ID Proof validation helpers ────────────────────────────
    const [idProofTouched, setIdProofTouched] = useState(false);

    const selectedIdProof = useMemo(() => {
        return ID_PROOF_TYPES.find(t => t.value === formData.idProofType) ?? null;
    }, [formData.idProofType]);

    const formatAadhar = (raw: string): string => {
        const digits = raw.replace(/\D/g, "").slice(0, 12);
        if (digits.length <= 4) return digits;
        if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
        return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
    };

    const isIdProofValid = useMemo((): boolean => {
        if (!formData.idProofType || !formData.idProofNumber) return false;
        if (!selectedIdProof) return false;
        const value = formData.idProofType === "aadhar"
            ? formData.idProofNumber.replace(/\s/g, "")
            : formData.idProofNumber.trim();
        return selectedIdProof.pattern.test(value);
    }, [formData.idProofType, formData.idProofNumber, selectedIdProof]);

    const handleIdProofNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;

        if (formData.idProofType === "aadhar") {
            // Only allow digits, auto-format with spaces
            value = formatAadhar(value);
        } else if (formData.idProofType === "pan") {
            // Uppercase, max 10 chars
            value = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
        } else if (formData.idProofType === "passport") {
            value = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
        } else if (formData.idProofType === "voter_id") {
            value = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
        } else if (formData.idProofType === "driving_license") {
            value = value.toUpperCase().replace(/[^A-Z0-9\s]/g, "").slice(0, 16);
        }

        setFormData(prev => ({ ...prev, idProofNumber: value }));
        if (!idProofTouched) setIdProofTouched(true);
    };

    const handleIdProofTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, idProofType: e.target.value, idProofNumber: "" }));
        setIdProofTouched(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Honeypot anti-bot check — silently reject if filled
        if (honeypotField) {
            setSuccess(true);
            return;
        }

        setLoading(true);

        // Validation
        const isIndia = formData.countryCode === "+91";
        if (isIndia && formData.phone.length !== 10) {
            showDialog("Invalid Phone Number", "Please enter a valid 10-digit mobile number for India.");
            setLoading(false);
            return;
        }
        if (formData.phone.length < 7) {
            showDialog("Invalid Phone Number", "Please enter a valid phone number.");
            setLoading(false);
            return;
        }

        // ID proof validation
        if (!formData.idProofType) {
            showDialog("ID Proof Required", "Please select a type of identity proof.");
            setLoading(false);
            return;
        }
        if (!formData.idProofNumber) {
            showDialog("ID Number Required", "Please enter your identity proof number.");
            setLoading(false);
            return;
        }
        if (!isIdProofValid) {
            const proofLabel = selectedIdProof?.label ?? "ID";
            showDialog("Invalid ID Number", `Please enter a valid ${proofLabel} number.`);
            setLoading(false);
            return;
        }

        if (!selectedFile) {
            showDialog("Photo Required", "Please upload a visitor photo.");
            setLoading(false);
            return;
        }

        // Client-side validation
        if (selectedFile.size > MAX_PHOTO_SIZE_BYTES) {
            showDialog("File Too Large", "File size must be less than 5MB");
            setLoading(false);
            return;
        }

        if (!(ALLOWED_PHOTO_TYPES as readonly string[]).includes(selectedFile.type)) {
            showDialog("Invalid File Type", "Only JPEG, PNG, or WebP images are allowed");
            setLoading(false);
            return;
        }

        const fileExt = selectedFile.name.split('.').pop();
        const fileNamePath = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // 1. Upload Photo
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("visitor-photos")
            .upload(fileNamePath, selectedFile);

        if (uploadError) {
            console.error(uploadError);
            showDialog("Upload Failed", "Failed to upload photo. Please try again.");
            setLoading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from("visitor-photos")
            .getPublicUrl(fileNamePath);

        // 2. Insert Data
        const idNumberClean = formData.idProofType === "aadhar"
            ? formData.idProofNumber.replace(/\s/g, "")
            : formData.idProofNumber.trim();

        const { error } = await supabase.from("visitor_requests").insert({
            name: formData.name,
            designation: formData.designation,
            organization: formData.organization,
            phone: `${formData.countryCode} ${formData.phone}`,
            email: formData.email,
            id_proof_type: formData.idProofType,
            id_proof_number: idNumberClean,
            purpose: formData.purpose,
            department: formData.department,
            photo_url: publicUrl,
            status: "pending",
            expected_date: formData.expectedDate || null,
            expected_time: formData.expectedTime || null,
        });

        if (error) {
            console.error(error);
            showDialog("Registration Failed", "Failed to register: " + error.message);
        } else {
            setSubmittedData({
                name: formData.name,
                designation: formData.designation,
                organization: formData.organization,
                phone: `${formData.countryCode} ${formData.phone}`,
                email: formData.email,
                idProofType: selectedIdProof?.label ?? formData.idProofType,
                idProofNumber: formData.idProofType === "aadhar"
                    ? formatAadhar(formData.idProofNumber.replace(/\s/g, ""))
                    : formData.idProofNumber,
                purpose: formData.purpose,
                department: formData.department,
                photoUrl: publicUrl,
                expectedDate: formData.expectedDate,
                expectedTime: formData.expectedTime,
            });
            setSuccess(true);
            sessionStorage.removeItem("visitor_form_draft");

            // Notify department admin(s) via email — fire-and-forget
            import("@/app/actions/notify").then(({ notifyDepartmentAdmin }) => {
                notifyDepartmentAdmin(
                    formData.department,
                    formData.name,
                    formData.email,
                    formData.organization,
                    formData.purpose
                ).catch((err) => console.error("Notification failed:", err));
            });
        }
        setLoading(false);
    };

    if (success && submittedData) {
        return (
            <div className={styles.successPageWrapper}>
                <div className={styles.successCard}>
                    <div className={styles.successIconWrapper}>
                        <CheckCircleIcon className={styles.successIcon} />
                    </div>
                    <h1 className={styles.serifTitle}>Registration Complete!</h1>
                    <p className={styles.welcomeGreeting}>
                        Welcome, <strong>{submittedData.name}</strong>! Your visit request has been submitted for approval.
                    </p>

                    {/* Visitor Details Card */}
                    <div className={styles.visitorDetailsCard}>
                        <div className={styles.profileSection}>
                            <img
                                src={submittedData.photoUrl}
                                alt={submittedData.name}
                                className={styles.profileImageLarge}
                            />
                        </div>
                        <div className={styles.detailsGrid}>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Name</span>
                                <span className={styles.detailValue}>{submittedData.name}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Designation</span>
                                <span className={styles.detailValue}>{submittedData.designation}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Organization</span>
                                <span className={styles.detailValue}>{submittedData.organization}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Email</span>
                                <span className={styles.detailValue}>{submittedData.email}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Phone</span>
                                <span className={styles.detailValue}>{submittedData.phone}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>ID Proof</span>
                                <span className={styles.detailValue}>
                                    {submittedData.idProofType}:{" "}
                                    {(() => {
                                        const num = submittedData.idProofNumber.replace(/\s/g, "");
                                        if (submittedData.idProofType === "Aadhar Card" && num.length === 12) {
                                            return `XXXX XXXX ${num.slice(8)}`;
                                        }
                                        if (num.length > 4) {
                                            return "X".repeat(num.length - 4) + num.slice(-4);
                                        }
                                        return num;
                                    })()}
                                </span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Department</span>
                                <span className={styles.detailValue}>{submittedData.department}</span>
                            </div>
                            <div className={`${styles.detailRow} ${styles.fullWidth}`}>
                                <span className={styles.detailLabel}>Purpose</span>
                                <span className={styles.detailValue}>{submittedData.purpose}</span>
                            </div>
                            {(submittedData.expectedDate || submittedData.expectedTime) && (
                                <div className={`${styles.detailRow} ${styles.fullWidth}`}>
                                    <span className={styles.detailLabel}>Expected Arrival</span>
                                    <span className={styles.detailValue}>
                                        {submittedData.expectedDate && new Date(submittedData.expectedDate + "T00:00:00").toLocaleDateString("en-IN", { dateStyle: "medium" })}
                                        {submittedData.expectedDate && submittedData.expectedTime && " at "}
                                        {submittedData.expectedTime && new Date(`1970-01-01T${submittedData.expectedTime}`).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <p className={styles.approvalNote}>
                        You will receive an email with your Visitor Pass once approved by the department.
                    </p>

                    <button onClick={() => window.location.reload()} className={styles.submitBtn} style={{ marginTop: '1.5rem' }}>
                        New Registration
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageWrapper}>
            <CustomDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                title={dialogContent.title}
                description={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {dialogContent.type === 'error' && (
                            <div style={{ color: '#e53e3e', flexShrink: 0 }}>
                                <ExclamationTriangleIcon style={{ width: 24, height: 24 }} />
                            </div>
                        )}
                        <p style={{ margin: 0 }}>{dialogContent.message}</p>
                    </div>
                }
            >
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button
                        onClick={() => setDialogOpen(false)}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1.5rem' }}
                    >
                        Okay
                    </button>
                </div>
            </CustomDialog>

            {draftRestored && (
                <div className={styles.toast}>
                    Draft Restored
                </div>
            )}

            {/* Header Removed for Minimalist Look */}
            {/* <div className={styles.headerSection}> ... </div> */}

            <div className={styles.card}>
                <div className={styles.cardHeader}> {/* Restored standard header markup */}
                    <h1 className={styles.title}>Visitor Registration</h1>
                    <p className={styles.subtitle}>Please fill in your details to register your visit.</p>
                </div>

                {/* Form Progress Indicator */}
                <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${formProgress.percentage}%` }}
                        />
                    </div>
                    <div className={styles.progressSteps}>
                        {FORM_STEPS.map((step, idx) => (
                            <div
                                key={step.id}
                                className={`${styles.progressStep} ${formProgress.stepStatuses[idx] ? styles.progressStepDone : ""}`}
                            >
                                <div className={styles.progressDot}>
                                    {formProgress.stepStatuses[idx] ? (
                                        <CheckCircleIcon className={styles.progressCheckIcon} />
                                    ) : (
                                        <span className={styles.progressDotNumber}>{idx + 1}</span>
                                    )}
                                </div>
                                <span className={styles.progressLabel}>{step.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Honeypot anti-bot field — hidden from real users */}
                    <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
                        <label htmlFor="website">Website (do not fill)</label>
                        <input
                            type="text"
                            id="website"
                            name="website"
                            autoComplete="off"
                            tabIndex={-1}
                            value={honeypotField}
                            onChange={(e) => setHoneypotField(e.target.value)}
                        />
                    </div>

                    <div className={styles.grid}>

                        {/* Name */}
                        <div className="form-group">
                            <label className={styles.label}>
                                <UserIcon className={styles.labelIcon} /> Full Name
                            </label>
                            <input
                                name="name"
                                type="text"
                                required
                                className={styles.input}
                                value={formData.name}
                                onChange={handleNameChange}
                                placeholder="Full name as per ID"
                            />
                            <span className={styles.hint}>{formData.name.length}/30 characters</span>
                        </div>

                        {/* Designation */}
                        <div className="form-group" ref={designationRef}>
                            <label className={styles.label}>
                                <BriefcaseIcon className={styles.labelIcon} /> Designation
                            </label>
                            <div className={styles.autocompleteWrapper}>
                                <input
                                    name="designation"
                                    type="text"
                                    required
                                    autoComplete="off"
                                    className={styles.input}
                                    value={formData.designation}
                                    onChange={handleDesignationChange}
                                    onFocus={() => setDesignationFocused(true)}
                                    onKeyDown={handleDesignationKeyDown}
                                    placeholder="Type your designation"
                                    role="combobox"
                                    aria-expanded={designationFocused && filteredDesignations.length > 0}
                                    aria-autocomplete="list"
                                    aria-controls="designation-listbox"
                                    aria-activedescendant={
                                        designationHighlight >= 0
                                            ? `designation-opt-${designationHighlight}`
                                            : undefined
                                    }
                                />
                                {designationFocused && filteredDesignations.length > 0 && (
                                    <ul
                                        id="designation-listbox"
                                        role="listbox"
                                        className={styles.autocompleteDropdown}
                                    >
                                        {filteredDesignations.map((d, idx) => {
                                            // Highlight matching text
                                            const query = formData.designation.trim().toLowerCase();
                                            let label: React.ReactNode = d;
                                            if (query) {
                                                const matchIdx = d.toLowerCase().indexOf(query);
                                                if (matchIdx >= 0) {
                                                    label = (
                                                        <>
                                                            {d.slice(0, matchIdx)}
                                                            <strong className={styles.autocompleteMatch}>
                                                                {d.slice(matchIdx, matchIdx + query.length)}
                                                            </strong>
                                                            {d.slice(matchIdx + query.length)}
                                                        </>
                                                    );
                                                }
                                            }
                                            return (
                                                <li
                                                    key={d}
                                                    id={`designation-opt-${idx}`}
                                                    role="option"
                                                    aria-selected={idx === designationHighlight}
                                                    className={`${styles.autocompleteItem} ${idx === designationHighlight ? styles.autocompleteItemActive : ""
                                                        }`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // Prevent blur before click
                                                        selectDesignation(d);
                                                    }}
                                                    onMouseEnter={() => setDesignationHighlight(idx)}
                                                >
                                                    {label}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Organization */}
                        <div className={`form-group ${styles.fullWidth}`}>
                            <label className={styles.label}>
                                <BuildingOfficeIcon className={styles.labelIcon} /> Organization / College
                            </label>
                            <input
                                name="organization"
                                type="text"
                                required
                                className={styles.input}
                                value={formData.organization}
                                onChange={handleChange}
                                placeholder="Organization or institution name"
                            />
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label className={styles.label}>
                                <EnvelopeIcon className={styles.labelIcon} /> Email Address
                                {emailValidFormat && (
                                    <span className={styles.verifiedBadge}>
                                        <CheckBadgeIcon className={styles.verifiedIcon} /> Valid
                                    </span>
                                )}
                            </label>
                            <div className={styles.inputWrapper}>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className={`${styles.input} ${emailValidFormat
                                        ? styles.inputVerified
                                        : emailTouched && formData.email && !emailValidFormat
                                            ? styles.inputError
                                            : ""
                                        }`}
                                    value={formData.email}
                                    onChange={handleEmailChange}
                                    onBlur={() => setEmailTouched(true)}
                                    placeholder="Enter your email address"
                                />
                            </div>
                            {emailTouched && formData.email && !emailValidFormat && (
                                <span className={styles.errorHint}>
                                    {getEmailStatus(formData.email).hint}
                                </span>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="form-group">
                            <label className={styles.label}>
                                <PhoneIcon className={styles.labelIcon} /> Phone Number
                                {phoneTouched && formData.phone && isPhoneComplete(formData.phone, formData.countryCode) && (
                                    <span className={styles.verifiedBadge}>
                                        <CheckBadgeIcon className={styles.verifiedIcon} /> Valid
                                    </span>
                                )}
                            </label>
                            <div className={styles.phoneGroup}>
                                <select
                                    name="countryCode"
                                    className={styles.countrySelect}
                                    value={formData.countryCode}
                                    onChange={(e) => {
                                        handleChange(e);
                                        // Clear phone when country changes to avoid mismatched lengths
                                        setFormData(prev => ({ ...prev, phone: "", countryCode: e.target.value }));
                                    }}
                                >
                                    <option value="+91">🇮🇳 +91</option>
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+44">🇬🇧 +44</option>
                                    <option value="+971">🇦🇪 +971</option>
                                    <option value="+65">🇸🇬 +65</option>
                                    <option value="+61">🇦🇺 +61</option>
                                    <option value="+49">🇩🇪 +49</option>
                                    <option value="+33">🇫🇷 +33</option>
                                    <option value="+81">🇯🇵 +81</option>
                                    <option value="+86">🇨🇳 +86</option>
                                    <option value="+82">🇰🇷 +82</option>
                                    <option value="+60">🇲🇾 +60</option>
                                    <option value="+94">🇱🇰 +94</option>
                                    <option value="+977">🇳🇵 +977</option>
                                    <option value="+880">🇧🇩 +880</option>
                                </select>
                                <input
                                    name="phone"
                                    type="tel"
                                    required
                                    autoComplete="tel"
                                    inputMode="numeric"
                                    className={`${styles.input} ${phoneTouched && formData.phone && isPhoneComplete(formData.phone, formData.countryCode)
                                        ? styles.inputVerified
                                        : ""
                                        }`}
                                    value={formatPhoneDisplay(formData.phone, formData.countryCode)}
                                    onChange={handlePhoneChange}
                                    onBlur={() => setPhoneTouched(true)}
                                    placeholder={formData.countryCode === "+91" ? "Enter 10-digit mobile number" : "Enter your phone number"}
                                />
                            </div>
                            {phoneTouched && formData.phone && !isPhoneComplete(formData.phone, formData.countryCode) && (
                                <span className={styles.errorHint}>
                                    {formData.countryCode === "+91"
                                        ? `${formData.phone.length}/10 digits entered`
                                        : `${formData.phone.length} digits entered — minimum 7 required`}
                                </span>
                            )}
                            {!formData.phone && (
                                <span className={styles.hint}>
                                    {formData.countryCode === "+91" ? "10-digit Indian mobile number" : "Include area code if applicable"}
                                </span>
                            )}
                        </div>

                        {/* Proof of Identity */}
                        <div className="form-group">
                            <label className={styles.label}>
                                <IdentificationIcon className={styles.labelIcon} /> ID Proof Type
                            </label>
                            <select
                                name="idProofType"
                                required
                                className={styles.select}
                                value={formData.idProofType}
                                onChange={handleIdProofTypeChange}
                            >
                                <option value="">Select identity proof</option>
                                {ID_PROOF_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        {formData.idProofType && (
                            <div className="form-group">
                                <label className={styles.label}>
                                    <IdentificationIcon className={styles.labelIcon} /> {selectedIdProof?.label ?? "ID"} Number
                                    {isIdProofValid && (
                                        <span className={styles.verifiedBadge}>
                                            <CheckBadgeIcon className={styles.verifiedIcon} /> Valid
                                        </span>
                                    )}
                                </label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        name="idProofNumber"
                                        type="text"
                                        required
                                        autoComplete="off"
                                        inputMode={formData.idProofType === "aadhar" ? "numeric" : "text"}
                                        className={`${styles.input} ${isIdProofValid
                                            ? styles.inputVerified
                                            : idProofTouched && formData.idProofNumber && !isIdProofValid
                                                ? styles.inputError
                                                : ""
                                            }`}
                                        value={formData.idProofNumber}
                                        onChange={handleIdProofNumberChange}
                                        onBlur={() => setIdProofTouched(true)}
                                        placeholder={selectedIdProof?.placeholder ?? "Enter ID number"}
                                        maxLength={selectedIdProof?.maxLength ?? 30}
                                    />
                                </div>
                                {selectedIdProof && (
                                    <span className={
                                        idProofTouched && formData.idProofNumber && !isIdProofValid
                                            ? styles.errorHint
                                            : styles.hint
                                    }>
                                        {idProofTouched && formData.idProofNumber && !isIdProofValid
                                            ? `Invalid format — ${selectedIdProof.hint}`
                                            : selectedIdProof.hint}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Department */}
                        <div className="form-group">
                            <label className={styles.label}>
                                <MapPinIcon className={styles.labelIcon} /> Department to Visit
                            </label>
                            <select
                                name="department"
                                required
                                className={styles.select}
                                value={formData.department}
                                onChange={handleChange}
                            >
                                <option value="">Choose department</option>
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        {/* Expected Date & Time of Arrival — Calendar + Time Presets */}
                        <div className={`form-group ${styles.fullWidth}`}>
                            <CalendarTimePicker
                                label="Expected Date & Time of Arrival"
                                hint="Optional — helps the department prepare for your visit"
                                selectedDate={formData.expectedDate}
                                selectedTime={formData.expectedTime}
                                onDateChange={(date) => setFormData(prev => ({ ...prev, expectedDate: date }))}
                                onTimeChange={(time) => setFormData(prev => ({ ...prev, expectedTime: time }))}
                            />
                        </div>

                        {/* Purpose */}
                        <div className={`form-group ${styles.fullWidth}`}>
                            <label className={styles.label}>
                                <ChatBubbleBottomCenterTextIcon className={styles.labelIcon} /> Purpose of Visit
                            </label>
                            <textarea
                                name="purpose"
                                required
                                className={styles.textarea}
                                rows={3}
                                value={formData.purpose}
                                onChange={handleChange}
                                placeholder="Describe the reason for your visit"
                            ></textarea>
                        </div>


                        {/* Photo — Live Face Capture or Upload */}
                        <div className={`form-group ${styles.fullWidth}`}>
                            <label className={styles.label}>
                                <CameraIcon className={styles.labelIcon} /> Visitor Photo
                            </label>

                            <FaceCapture
                                selectedFile={selectedFile}
                                previewUrl={previewUrl}
                                onFileSelect={(file) => setSelectedFile(file)}
                                onPreviewChange={(url) => setPreviewUrl(url)}
                                required
                            />
                            <p className={styles.hint}>Take a live photo or upload one. Max 5 MB.</p>
                        </div>

                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? "Submitting..." : "Submit Registration"}
                    </button>
                </form>
            </div>
        </div>
    );
}
