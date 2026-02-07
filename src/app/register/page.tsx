"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import styles from "./page.module.css";
import { CustomDialog } from "@/components/ui/CustomDialog";
import { DEPARTMENTS, MAX_PHOTO_SIZE_BYTES, ALLOWED_PHOTO_TYPES } from "@/lib/constants";
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
} from "@heroicons/react/24/outline";
import CalendarTimePicker from "@/components/ui/CalendarTimePicker";

// Progress step definitions
const FORM_STEPS = [
    { id: "personal", label: "Personal", fields: ["name", "designation"] },
    { id: "contact", label: "Contact", fields: ["organization", "email", "phone"] },
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
    const [submittedData, setSubmittedData] = useState<{
        name: string;
        designation: string;
        organization: string;
        phone: string;
        email: string;
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

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '');
        // Allow up to 15 digits for international support
        if (val.length <= 15) {
            setFormData(prev => ({ ...prev, phone: val }));
        }
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const email = e.target.value;
        setFormData(prev => ({ ...prev, email }));
        setEmailValidFormat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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
        const { error } = await supabase.from("visitor_requests").insert({
            name: formData.name,
            designation: formData.designation,
            organization: formData.organization,
            phone: `${formData.countryCode} ${formData.phone}`,
            email: formData.email,
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
                    <p className={styles.subtitle}>Welcome to SCSVMV. Please fill in your details.</p>
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
                                placeholder="Enter your name"
                            />
                            <span className={styles.hint}>{formData.name.length}/30 characters</span>
                        </div>

                        {/* Designation */}
                        <div className="form-group">
                            <label className={styles.label}>
                                <BriefcaseIcon className={styles.labelIcon} /> Designation
                            </label>
                            <input
                                name="designation"
                                type="text"
                                required
                                className={styles.input}
                                value={formData.designation}
                                onChange={handleChange}
                                placeholder="e.g. Senior Professor"
                            />
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
                                placeholder="Where are you visiting from?"
                            />
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label className={styles.label}>
                                <EnvelopeIcon className={styles.labelIcon} /> Email Address
                                {emailValidFormat && <span className={styles.verifiedBadge}><CheckBadgeIcon className={styles.verifiedIcon} /> Valid Format</span>}
                            </label>
                            <input
                                name="email"
                                type="email"
                                required
                                className={`${styles.input} ${emailValidFormat ? styles.inputVerified : ''}`}
                                value={formData.email}
                                onChange={handleEmailChange}
                                placeholder="Enter your email"
                            />
                        </div>

                        {/* Phone */}
                        <div className="form-group">
                            <label className={styles.label}>
                                <PhoneIcon className={styles.labelIcon} /> Phone Number
                            </label>
                            <div className={styles.phoneGroup}>
                                <select
                                    name="countryCode"
                                    className={styles.countrySelect}
                                    value={formData.countryCode}
                                    onChange={handleChange}
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
                                    className={styles.input}
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                    placeholder="Enter mobile number"
                                />
                            </div>
                        </div>

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
                                <option value="">Select Department</option>
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
                                placeholder="Briefly describe the purpose of your visit"
                            ></textarea>
                        </div>


                        {/* Photo Upload */}
                        <div className={`form-group ${styles.fullWidth}`}>
                            <label className={styles.label}>
                                <CloudArrowUpIcon className={styles.labelIcon} /> Visitor Photo
                            </label>

                            <div className={styles.photoUploadContainer}>
                                {previewUrl ? (
                                    <div className={styles.previewWrapper}>
                                        <img
                                            src={previewUrl}
                                            alt="Visitor Preview"
                                            className={styles.previewImage}
                                        />
                                        <button
                                            type="button"
                                            className={styles.removePreviewBtn}
                                            onClick={() => {
                                                setPreviewUrl("");
                                                setSelectedFile(null);
                                                // Reset file input value if needed via ref
                                                const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
                                                if (fileInput) fileInput.value = "";
                                            }}
                                        >
                                            Change Photo
                                        </button>
                                    </div>
                                ) : (
                                    <div className={styles.fileUpload}>
                                        <input
                                            type="file"
                                            name="photo"
                                            accept="image/png, image/jpeg, image/webp"
                                            required
                                            id="photo-upload"
                                            className={styles.fileInput}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setSelectedFile(file); // Set selected file
                                                    const url = URL.createObjectURL(file);
                                                    setPreviewUrl(url);
                                                } else {
                                                    setPreviewUrl("");
                                                    setSelectedFile(null);
                                                }
                                            }}
                                        />
                                        <label htmlFor="photo-upload" className={styles.fileLabel}>
                                            <CloudArrowUpIcon className={styles.uploadIcon} />
                                            <span>Click to upload photo</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                            <p className={styles.hint}>JPG, PNG or WebP. Max 5MB. Will be used as your profile picture.</p>
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
