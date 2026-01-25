// server/utils/mailer.js - RESEND VERSION
const { Resend } = require('resend');

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Your verified sender email (must be verified in Resend dashboard)
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourdomain.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://final-project-wheat-mu-84.vercel.app/login';

// --- 1. SEND FACULTY INVITE ---
exports.sendFacultyInvite = async (toEmail, inviteToken) => {
    const activationLink = `${FRONTEND_URL}/claim-invite/${inviteToken}`;
    
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: '🎓 Faculty Account Invitation - Blockchain Credentialing Platform',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
                        .header h1 { color: white; margin: 0; font-size: 28px; }
                        .content { padding: 40px 30px; }
                        .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                        .button:hover { background: #5568d3; }
                        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
                        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; color: #856404; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎓 Faculty Invitation</h1>
                        </div>
                        <div class="content">
                            <h2>Welcome to the Blockchain Credentialing Platform!</h2>
                            <p>You have been invited to join as a <strong>Faculty Administrator</strong>.</p>
                            
                            <p>Click the button below to set your password and activate your account:</p>
                            
                            <div style="text-align: center;">
                                <a href="${activationLink}" class="button">Activate My Account</a>
                            </div>
                            
                            <div class="warning">
                                ⏰ <strong>Important:</strong> This invitation link expires in 24 hours.
                            </div>
                            
                            <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
                                If the button doesn't work, copy and paste this link into your browser:<br>
                                <code style="background: #f1f1f1; padding: 4px 8px; border-radius: 4px; word-break: break-all;">${activationLink}</code>
                            </p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message. Please do not reply.</p>
                            <p>&copy; ${new Date().getFullYear()} Blockchain Credentialing Platform</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        if (error) {
            console.error('❌ Resend Error:', error);
            throw new Error('Email sending failed');
        }

        console.log('✅ Faculty invite sent via Resend:', data.id);
        return data;

    } catch (error) {
        console.error('Resend API Error:', error);
        throw new Error('Email sending failed');
    }
};

// --- 2. SEND STUDENT ACTIVATION ---
exports.sendStudentActivation = async (toEmail, activationToken) => {
    const activationLink = `${FRONTEND_URL}/activate-account/${activationToken}`;
    
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: '🎓 Activate Your Student Account',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 20px; text-align: center; }
                        .header h1 { color: white; margin: 0; font-size: 28px; }
                        .content { padding: 40px 30px; }
                        .button { display: inline-block; background: #4facfe; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                        .button:hover { background: #3a92e0; }
                        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
                        .steps { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                        .steps ol { margin: 0; padding-left: 20px; }
                        .steps li { margin: 8px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🚀 Welcome, Student!</h1>
                        </div>
                        <div class="content">
                            <h2>Your Account is Ready to Activate</h2>
                            <p>Great news! Your student profile has been verified and you're ready to join the platform.</p>
                            
                            <div class="steps">
                                <h3>📝 Next Steps:</h3>
                                <ol>
                                    <li>Click the activation button below</li>
                                    <li>Create a secure password (min. 8 characters)</li>
                                    <li>Start earning blockchain-verified credentials!</li>
                                </ol>
                            </div>
                            
                            <div style="text-align: center;">
                                <a href="${activationLink}" class="button">Activate My Account</a>
                            </div>
                            
                            <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
                                If the button doesn't work, copy this link:<br>
                                <code style="background: #f1f1f1; padding: 4px 8px; border-radius: 4px; word-break: break-all;">${activationLink}</code>
                            </p>
                        </div>
                        <div class="footer">
                            <p>This link expires in 24 hours.</p>
                            <p>&copy; ${new Date().getFullYear()} Blockchain Credentialing Platform</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        if (error) {
            console.error('❌ Resend Error:', error);
            throw new Error('Email sending failed');
        }

        console.log('✅ Student activation sent via Resend:', data.id);
        return data;

    } catch (error) {
        console.error('Resend API Error:', error);
        throw new Error('Email sending failed');
    }
};

// --- 3. SEND PASSWORD RESET ---
exports.sendPasswordReset = async (toEmail, resetToken) => {
    const resetLink = `${FRONTEND_URL}/reset-password/${resetToken}`;
    
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: '🔐 Password Reset Request',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 40px 20px; text-align: center; }
                        .header h1 { color: white; margin: 0; font-size: 28px; }
                        .content { padding: 40px 30px; }
                        .button { display: inline-block; background: #fa709a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                        .button:hover { background: #e85d89; }
                        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
                        .warning { background: #f8d7da; border-left: 4px solid #dc3545; padding: 12px; margin: 20px 0; color: #721c24; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Password Reset</h1>
                        </div>
                        <div class="content">
                            <h2>Reset Your Password</h2>
                            <p>We received a request to reset your password. Click the button below to create a new password:</p>
                            
                            <div style="text-align: center;">
                                <a href="${resetLink}" class="button">Reset My Password</a>
                            </div>
                            
                            <div class="warning">
                                ⚠️ <strong>Security Notice:</strong> This link expires in 15 minutes. If you didn't request this reset, please ignore this email.
                            </div>
                            
                            <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
                                If the button doesn't work, copy this link:<br>
                                <code style="background: #f1f1f1; padding: 4px 8px; border-radius: 4px; word-break: break-all;">${resetLink}</code>
                            </p>
                        </div>
                        <div class="footer">
                            <p>If you didn't request this, your account is still secure.</p>
                            <p>&copy; ${new Date().getFullYear()} Blockchain Credentialing Platform</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        if (error) {
            console.error('❌ Resend Error:', error);
            throw new Error('Email sending failed');
        }

        console.log('✅ Password reset sent via Resend:', data.id);
        return data;

    } catch (error) {
        console.error('Resend API Error:', error);
        throw new Error('Email sending failed');
    }
};