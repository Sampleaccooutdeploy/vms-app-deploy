import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const getEmailTemplate = (title: string, bodyContent: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <!--[if !mso]><!-->
    <style type="text/css">
        @media only screen and (max-width: 620px) {
            .email-container { width: 100% !important; }
            .email-header { padding: 24px 16px !important; }
            .email-title-bar { padding: 12px 16px !important; }
            .email-body { padding: 24px 16px !important; }
            .email-footer { padding: 20px 16px !important; }
            .email-logo { width: 130px !important; }
            .detail-cell { padding: 12px !important; }
        }
    </style>
    <!--<![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 24px 12px;">
                <!-- Main Container -->
                <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    
                    <!-- Header with Prominent Logo -->
                    <tr>
                        <td class="email-header" style="background-color: #1a365d; padding: 32px 24px; text-align: center;">
                            <img src="https://i.ibb.co/JjQqdsvt/SCSVMV.png" alt="SCSVMV Logo" width="160" class="email-logo" style="display: block; margin: 0 auto; max-width: 160px; height: auto;">
                            <p style="margin: 14px 0 0; color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">
                                Visitor Management System
                            </p>
                        </td>
                    </tr>

                    <!-- Title Bar -->
                    <tr>
                        <td class="email-title-bar" style="background-color: #2d3748; padding: 14px 24px;">
                            <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 500;">
                                ${title}
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td class="email-body" style="padding: 28px 24px;">
                            ${bodyContent}

                            <p style="margin: 28px 0 0; color: #374151; font-size: 14px;">
                                Regards,<br>
                                <strong>SCSVMV Administration</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td class="email-footer" style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #64748b; font-size: 12px; text-align: center; line-height: 1.6;">
                                Sri Chandrasekharendra Saraswathi Viswa Mahavidyalaya<br>
                                (Deemed to be University u/s 3 of UGC Act, 1956)
                            </p>
                            <p style="margin: 10px 0 0; color: #94a3b8; font-size: 11px; text-align: center;">
                                This is an automated message. Please do not reply to this email.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const escapeHtml = (unsafe: string) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

export async function sendApprovalEmail(to: string, visitorName: string, uid: string, department: string) {
    try {
        const safeVisitorName = escapeHtml(visitorName);
        const safeDepartment = escapeHtml(department);
        const safeUid = escapeHtml(uid);

        const htmlContent = `
            <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">
                Hello <strong>${safeVisitorName}</strong>,
            </p>
            <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
                We are pleased to inform you that your visit has been approved. Please use the digital pass below for entry.
            </p>

            <!-- Details Box -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; margin: 20px 0;">
                <tr>
                    <td class="detail-cell" style="padding: 16px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Visiting Department</span>
                                    <p style="margin: 6px 0 0; color: #1e293b; font-size: 15px; font-weight: 600; word-break: break-word;">${safeDepartment}</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0 8px;">
                                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Visitor UID</span>
                                    <p style="margin: 6px 0 0; font-size: 16px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px; color: #2563eb; word-break: break-all;">${safeUid}</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Barcode Section -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                <tr>
                    <td style="text-align: center; padding: 20px 12px; background-color: #ffffff; border: 2px dashed #cbd5e1; border-radius: 8px;">
                        <p style="margin: 0 0 12px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Scan at Security Gate</p>
                        <!-- Use raw UID for barcode API url -->
                        <img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(uid)}&scale=3&includetext" alt="Visitor Barcode" style="max-width: 100%; width: auto; height: auto; display: block; margin: 0 auto;" />
                    </td>
                </tr>
            </table>

            <p style="margin: 24px 0 0; color: #374151; font-size: 14px; line-height: 1.6;">
                Please present this email or the barcode above to the security personnel at the main gate for express check-in.
            </p>
        `;

        const info = await transporter.sendMail({
            from: `"SCSVMV Visitor System" <${process.env.SMTP_USER}>`,
            to: to,
            subject: "Visitor Pass Approved - SCSVMV",
            // Use raw variables for plain text
            text: `Hello ${visitorName},\n\nYour visit to the ${department} department has been approved.\n\nYour Visitor UID is: ${uid}\n\nBest regards,\nSCSVMV Administration`,
            html: getEmailTemplate("Visitor Pass Approved", htmlContent),
        });

        console.log("Email sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error };
    }
}

/**
 * Send password reset credentials email
 * Note: Sending cleartext passwords is for legacy support as per admin requirements.
 */
export async function sendPasswordResetEmail(to: string, email: string, password: string) {
    try {
        const safeEmail = escapeHtml(email);
        // Password is NOT escaped in raw format to ensure user sees valid char, 
        // BUT HTML injection is possible if password contains tags. 
        // For now we escape it for display to prevent XSS. 
        // Ideally password shouldn't contain HTML, but if it does, the user needs to see the ESCAPED version to copy-paste?
        // Actually, if password is "<a>", showing "&lt;a&gt;" allows user to type "<a>".
        const safePassword = escapeHtml(password);

        const htmlContent = `
            <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">
                Dear User,
            </p>
            <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
                Your password has been reset by the system administrator. Please use the credentials below to access your account.
            </p>

            <!-- Credentials Box -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; margin: 20px 0;">
                <tr>
                    <td class="detail-cell" style="padding: 16px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email Address</span>
                                    <p style="margin: 6px 0 0; color: #1e293b; font-size: 15px; font-weight: 600; word-break: break-all;">${safeEmail}</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0 8px;">
                                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Password</span>
                                    <p style="margin: 6px 0 0; color: #1e293b; font-size: 15px; font-weight: 600; font-family: 'Courier New', monospace; background: #fff; padding: 8px 12px; border: 1px dashed #cbd5e1; border-radius: 4px; word-break: break-all; overflow-wrap: break-word;">${safePassword}</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Security Notice -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fefce8; border-left: 4px solid #ca8a04; margin: 20px 0;">
                <tr>
                    <td style="padding: 14px 16px;">
                        <p style="margin: 0; color: #854d0e; font-size: 14px; font-weight: 600;">
                            Security Notice
                        </p>
                        <p style="margin: 8px 0 0; color: #713f12; font-size: 13px; line-height: 1.5;">
                            This is your password. Do not share it with anyone.
                        </p>
                    </td>
                </tr>
            </table>

            <p style="margin: 24px 0 0; color: #374151; font-size: 14px; line-height: 1.6;">
                If you did not request this password reset, please contact the IT Administrator immediately.
            </p>
        `;

        const info = await transporter.sendMail({
            from: `"SCSVMV Admin" <${process.env.SMTP_USER}>`,
            to: to,
            subject: "Password Reset - SCSVMV Portal",
            text: `Hello,\n\nYour password has been reset.\nEmail: ${email}\nPassword: ${password}\n\nDo not share this.\n\nSCSVMV Administration`,
            html: getEmailTemplate("Password Reset Notification", htmlContent),
        });

        console.log("Password reset email sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending password reset email:", error);
        return { success: false, error };
    }
}

/**
 * Send notification email to department admin when a new visitor request arrives
 */
export async function sendNewRequestNotificationEmail(
    to: string,
    visitorName: string,
    visitorEmail: string,
    organization: string,
    department: string,
    purpose: string
) {
    try {
        const safeName = escapeHtml(visitorName);
        const safeEmail = escapeHtml(visitorEmail);
        const safeOrg = escapeHtml(organization);
        const safeDept = escapeHtml(department);
        const safePurpose = escapeHtml(purpose);

        const htmlContent = `
            <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">
                Hello <strong>${safeDept}</strong> Department Admin,
            </p>
            <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
                A new visitor request has been submitted and is awaiting your review.
            </p>

            <!-- Visitor Details Box -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; margin: 20px 0;">
                <tr>
                    <td class="detail-cell" style="padding: 16px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Visitor Name</span>
                                    <p style="margin: 6px 0 0; color: #1e293b; font-size: 15px; font-weight: 600; word-break: break-word;">${safeName}</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span>
                                    <p style="margin: 6px 0 0; color: #1e293b; font-size: 15px; word-break: break-all;">${safeEmail}</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Organization</span>
                                    <p style="margin: 6px 0 0; color: #1e293b; font-size: 15px; word-break: break-word;">${safeOrg}</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0 8px;">
                                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Purpose of Visit</span>
                                    <p style="margin: 6px 0 0; color: #1e293b; font-size: 15px; word-break: break-word;">${safePurpose}</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Action Notice -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #eff6ff; border-left: 4px solid #2563eb; margin: 20px 0;">
                <tr>
                    <td style="padding: 14px 16px;">
                        <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                            Action Required
                        </p>
                        <p style="margin: 6px 0 0; color: #1e40af; font-size: 13px; line-height: 1.5;">
                            Please log in to your department dashboard to approve or reject this request.
                        </p>
                    </td>
                </tr>
            </table>
        `;

        const info = await transporter.sendMail({
            from: `"SCSVMV VMS" <${process.env.SMTP_USER}>`,
            to: to,
            subject: `New Visitor Request - ${safeName} (${safeDept})`,
            text: `Hello ${department} Admin,\n\nA new visitor request from ${visitorName} (${organization}) is pending your approval.\nPurpose: ${purpose}\n\nPlease log in to your dashboard to review.\n\nSCSVMV Administration`,
            html: getEmailTemplate("New Visitor Request Received", htmlContent),
        });

        console.log("New request notification email sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending new request notification email:", error);
        return { success: false, error };
    }
}
