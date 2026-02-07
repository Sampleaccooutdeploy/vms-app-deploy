import { SupportedLocale } from "./constants";

const translations: Record<SupportedLocale, Record<string, string>> = {
    en: {
        // Common
        "app.title": "SCSVMV Visitor Management System",
        "common.loading": "Loading...",
        "common.submit": "Submit",
        "common.cancel": "Cancel",
        "common.close": "Close",
        "common.save": "Save",
        "common.delete": "Delete",
        "common.search": "Search",
        "common.filter": "Filter",
        "common.logout": "Logout",
        "common.back": "Back",
        "common.ok": "OK",
        "common.yes": "Yes",
        "common.no": "No",
        "common.error": "Error",
        "common.success": "Success",
        "common.pending": "Pending",
        "common.approved": "Approved",
        "common.rejected": "Rejected",
        "common.checkedIn": "Checked In",
        "common.checkedOut": "Checked Out",
        
        // Navigation
        "nav.home": "Home",
        "nav.register": "Visitor Registration",
        "nav.admin": "Admin/Staff",
        "nav.security": "Security",
        "nav.analytics": "Analytics",
        "nav.trackStatus": "Track Status",
        
        // Registration
        "register.title": "Visitor Registration",
        "register.subtitle": "Welcome to SCSVMV. Please fill in your details.",
        "register.name": "Full Name",
        "register.designation": "Designation",
        "register.organization": "Organization / College",
        "register.email": "Email Address",
        "register.phone": "Phone Number",
        "register.department": "Department to Visit",
        "register.purpose": "Purpose of Visit",
        "register.photo": "Visitor Photo",
        "register.submit": "Submit Registration",
        "register.submitting": "Submitting...",
        "register.success.title": "Registration Complete!",
        "register.success.message": "Your visit request has been submitted for approval.",
        "register.success.note": "You will receive an email with your Visitor Pass once approved by the department.",
        "register.newRegistration": "New Registration",
        "register.draftRestored": "Draft Restored",
        "register.selectDept": "Select Department",
        "register.uploadPhoto": "Click to upload photo",
        "register.photoHint": "JPG, PNG or WebP. Max 5MB.",
        "register.changePhoto": "Change Photo",
        "register.validEmail": "Valid Format",
        "register.charCount": "characters",
        
        // Login
        "login.title.admin": "Department Staff Login",
        "login.title.security": "Security Login",
        "login.title.super": "Super Admin Login",
        "login.subtitle": "Sign in to your account",
        "login.email": "Email Address",
        "login.password": "Password",
        "login.forgotPassword": "Forgot Password?",
        "login.rememberMe": "Remember me",
        "login.signIn": "Sign In",
        "login.signingIn": "Signing In...",
        "login.capsLock": "Caps Lock is ON",
        "login.needHelp": "Need help?",
        "login.contactSupport": "Contact Support",
        
        // Forgot Password
        "forgot.title": "Forgot Password",
        "forgot.description": "Enter your email address and we'll send a password reset request to the administrator.",
        "forgot.submit": "Submit Request",
        "forgot.submitting": "Submitting...",
        
        // Security
        "security.title": "Security Portal",
        "security.checkInOut": "Visitor Check-In/Out",
        "security.enterUid": "Enter Visitor UID or Scan",
        "security.scanning": "Scanning...",
        "security.verifyCheckIn": "Verify & Check In",
        "security.checkOut": "Check Out",
        "security.visitCompleted": "Visit Completed",
        "security.timeRecorded": "Time recorded.",
        "security.verifyDetails": "Verify details above before checking in.",
        "security.scanBarcode": "Scan Barcode",
        
        // Department Admin
        "dept.title": "Department Dashboard",
        "dept.pending": "Pending Requests",
        "dept.approved": "Approved",
        "dept.searchPlaceholder": "Search by name, org, or phone...",
        "dept.approve": "Approve Request",
        "dept.reject": "Reject",
        "dept.rejectVisitor": "Reject Visitor",
        "dept.approving": "Processing...",
        "dept.noPending": "No pending requests.",
        "dept.noApproved": "No approved visitors yet.",
        "dept.noResults": "No matching requests found.",
        "dept.visitorProfile": "Visitor Profile",
        "dept.resendEmail": "Resend Email",
        "dept.alreadyApproved": "Already Approved",
        
        // Super Admin
        "super.title": "Super Admin",
        "super.userManagement": "User Management",
        "super.createUser": "Create New User",
        "super.existingUsers": "Existing Users",
        "super.viewAnalytics": "View Analytics",
        "super.email": "Email",
        "super.role": "Role",
        "super.dept": "Dept",
        "super.action": "Action",
        "super.creating": "Creating...",
        "super.deleteConfirm": "Are you sure you want to delete this user? This action cannot be undone.",
        "super.passwordReset": "Password Reset Requests",
        "super.newPassword": "New Password",
        "super.resetNotify": "Reset & Notify",
        "super.processing": "Processing...",
        
        // Analytics
        "analytics.title": "Analytics & Logs",
        "analytics.backToDashboard": "Back to Dashboard",
        "analytics.allDepartments": "All Departments",
        "analytics.allStatuses": "All Statuses",
        "analytics.total": "Total",
        "analytics.date": "Date",
        "analytics.visitor": "Visitor",
        "analytics.department": "Department",
        "analytics.purpose": "Purpose",
        "analytics.status": "Status",
        "analytics.duration": "Duration",
        "analytics.timings": "Timings",
        "analytics.exportCSV": "Export CSV",
        "analytics.exportPDF": "Export PDF",
        "analytics.noRecords": "No records found.",
        
        // Status Tracking
        "track.title": "Track Your Visit",
        "track.subtitle": "Enter your email or phone to check your visit request status.",
        "track.email": "Email Address",
        "track.phone": "Phone Number",
        "track.search": "Search",
        "track.noResults": "No visit requests found for this email/phone.",
        
        // Emergency
        "emergency.title": "Emergency Evacuation List",
        "emergency.subtitle": "All currently checked-in visitors",
        "emergency.printList": "Print List",
        "emergency.noVisitors": "No visitors currently checked in.",
        "emergency.totalCheckedIn": "Total Checked In",
    },
    ta: {
        // Tamil translations
        "app.title": "SCSVMV பார்வையாளர் மேலாண்மை அமைப்பு",
        "common.loading": "ஏற்றுகிறது...",
        "common.submit": "சமர்ப்பி",
        "common.cancel": "ரத்து",
        "common.close": "மூடு",
        "common.logout": "வெளியேறு",
        "common.search": "தேடு",
        "common.error": "பிழை",
        "common.success": "வெற்றி",
        "register.title": "பார்வையாளர் பதிவு",
        "register.subtitle": "SCSVMV க்கு வரவேற்கிறோம். உங்கள் விவரங்களை நிரப்பவும்.",
        "register.name": "முழு பெயர்",
        "register.designation": "பதவி",
        "register.organization": "நிறுவனம் / கல்லூரி",
        "register.email": "மின்னஞ்சல் முகவரி",
        "register.phone": "தொலைபேசி எண்",
        "register.department": "பார்வையிட வேண்டிய துறை",
        "register.purpose": "வருகையின் நோக்கம்",
        "register.photo": "பார்வையாளர் புகைப்படம்",
        "register.submit": "பதிவை சமர்ப்பி",
        "nav.home": "முகப்பு",
        "nav.register": "பார்வையாளர் பதிவு",
        "nav.admin": "நிர்வாகி/ஊழியர்",
        "login.signIn": "உள்நுழை",
        "security.title": "பாதுகாப்பு போர்டல்",
    },
    hi: {
        // Hindi translations
        "app.title": "SCSVMV आगंतुक प्रबंधन प्रणाली",
        "common.loading": "लोड हो रहा है...",
        "common.submit": "जमा करें",
        "common.cancel": "रद्द करें",
        "common.close": "बंद करें",
        "common.logout": "लॉग आउट",
        "common.search": "खोजें",
        "common.error": "त्रुटि",
        "common.success": "सफलता",
        "register.title": "आगंतुक पंजीकरण",
        "register.subtitle": "SCSVMV में आपका स्वागत है। कृपया अपना विवरण भरें।",
        "register.name": "पूरा नाम",
        "register.designation": "पदनाम",
        "register.organization": "संगठन / कॉलेज",
        "register.email": "ईमेल पता",
        "register.phone": "फ़ोन नंबर",
        "register.department": "विभाग",
        "register.purpose": "यात्रा का उद्देश्य",
        "register.photo": "आगंतुक फोटो",
        "register.submit": "पंजीकरण जमा करें",
        "nav.home": "होम",
        "nav.register": "आगंतुक पंजीकरण",
        "nav.admin": "व्यवस्थापक/कर्मचारी",
        "login.signIn": "साइन इन करें",
        "security.title": "सुरक्षा पोर्टल",
    }
};

export function t(key: string, locale: SupportedLocale = "en"): string {
    return translations[locale]?.[key] || translations.en[key] || key;
}

export function getLocaleFromStorage(): SupportedLocale {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("locale") as SupportedLocale) || "en";
}

export function setLocaleToStorage(locale: SupportedLocale): void {
    if (typeof window !== "undefined") {
        localStorage.setItem("locale", locale);
    }
}
