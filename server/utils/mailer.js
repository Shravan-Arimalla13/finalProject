// In server/utils/mailer.js
const nodemailer = require('nodemailer');

// Professional configuration for Render/Cloud hosting
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Or 'smtp-relay.brevo.com' if you switched
    port: 587,
    secure: false, // Must be false for port 587 (TLS)
    auth: {
        user: process.env.EMAIL_HOST_USER,
        pass: process.env.EMAIL_HOST_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
        ciphers: "SSLv3"
    },
    family: 4, // Force IPv4 to prevent Gmail timeouts on cloud servers
    connectionTimeout: 10000, 
    greetingTimeout: 5000,   
    socketTimeout: 10000      
});

// --- IMPORTANT: UPDATE THIS TO YOUR REAL VERCEL DOMAIN ---
// Ensure there is NO trailing slash at the end
const BASE_URL = "https://final-project-wheat-mu-84.vercel.app/";

// --- Faculty Invite ---
exports.sendFacultyInvite = async (email, token) => {
    const inviteLink = `${BASE_URL}/claim-invite/${token}`;

    const mailOptions = {
        from: `"Project Credentialing" <${process.env.EMAIL_HOST_USER}>`,
        to: email,
        subject: 'Invitation to Project Credentialing',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h1>Welcome!</h1>
                <p>You have been invited to join the platform as a Faculty (Department Admin).</p>
                <p>Please click the link below to set up your account.</p>
                <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
                    Click Here to Activate Your Account
                </a>
                <p>If you did not request this, please ignore this email.</p>
            </div>
        `,
    };
    try { 
        await transporter.sendMail(mailOptions); 
        console.log(`Invite email sent to: ${email}`);
    } catch (e) { 
        console.error("Email Error:", e.message); 
    }
};

// --- Student Activation ---
exports.sendStudentActivation = async (email, token) => {
    const activationLink = `${BASE_URL}/activate-account/${token}`;

    const mailOptions = {
        from: `"Project Credentialing" <${process.env.EMAIL_HOST_USER}>`,
        to: email,
        subject: 'Activate Your Student Account',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h1>Welcome, Student!</h1>
                <p>Your account is ready to be activated. Please click the link below to set your password.</p>
                <p>This link is valid for 24 hours.</p>
                <a href="${activationLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
                    Set Password & Activate
                </a>
                <p>If you did not request this, please ignore this email.</p>
            </div>
        `,
    };
    try { 
        await transporter.sendMail(mailOptions); 
        console.log(`Activation email sent to: ${email}`);
    } catch (e) { 
        console.error("Email Error:", e.message); 
        throw e; // Rethrow so the controller knows to show the debug link
    }
};

// --- Certificate Issued ---
exports.sendCertificateIssued = async (email, studentName, eventName, certificateId) => {
    const verifyLink = `${BASE_URL}/verify/${certificateId}`;

    const mailOptions = {
        from: `"CredentialChain System" <${process.env.EMAIL_HOST_USER}>`,
        to: email,
        subject: `Certificate Earned: ${eventName}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #2563eb;">Congratulations, ${studentName}!</h2>
                <p>You have successfully earned a new verifiable credential for <strong>${eventName}</strong>.</p>
                
                <div style="background-color: #f1f5f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #64748b;">Certificate ID:</p>
                    <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 16px;">${certificateId}</p>
                </div>

                <p>This certificate has been secured on the blockchain as a permanent NFT.</p>

                <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    View & Verify Certificate
                </a>
            </div>
        `,
    };
    try { 
        await transporter.sendMail(mailOptions); 
        console.log(`Certificate email sent to: ${email}`);
    } catch (e) { 
        console.error("Email Error:", e.message); 
    }
};

// --- Password Reset ---
exports.sendPasswordReset = async (email, token) => {
    const resetLink = `${BASE_URL}/reset-password/${token}`;

    const mailOptions = {
        from: `"CredentialChain Security" <${process.env.EMAIL_HOST_USER}>`,
        to: email,
        subject: 'Reset Your Password',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h3>Password Reset Request</h3>
                <p>You requested a password reset for your CredentialChain account.</p>
                <p>Click the link below to set a new password. This link expires in 15 minutes.</p>
                <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px;">
                    Reset Password
                </a>
                <p>If you did not request this, please ignore this email.</p>
            </div>
        `,
    };
    try { 
        await transporter.sendMail(mailOptions); 
        console.log(`Reset email sent to: ${email}`);
    } catch (e) { 
        console.error("Email Error:", e.message); 
    }
};