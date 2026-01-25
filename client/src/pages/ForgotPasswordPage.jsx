// client/src/pages/ForgotPasswordPage.jsx - WITH BYPASS UI
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert-box";
import { Copy, CheckCircle, AlertCircle, ExternalLink, Mail } from "lucide-react";

function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    
    // --- BYPASS MODE STATES ---
    const [resetLink, setResetLink] = useState('');
    const [bypassMode, setBypassMode] = useState(false);
    const [copied, setCopied] = useState(false);
    // -------------------------

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setResetLink('');
        setBypassMode(false);
        
        try {
            const res = await api.post('/auth/forgot-password', { email });
            
            // --- CHECK FOR BYPASS MODE ---
            if (res.data.bypassMode || res.data.emailFailed) {
                setBypassMode(true);
                setResetLink(res.data.resetLink);
                setMessage(res.data.message);
            } else {
                setMessage(res.data.message);
            }
            // ----------------------------
            
        } catch (err) {
            setMessage('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(resetLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full w-fit mb-2">
                        <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">Forgot Password</CardTitle>
                    <CardDescription>Enter your email to reset your password.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* --- BYPASS MODE ALERT --- */}
                    {bypassMode && resetLink && (
                        <Alert className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-900 dark:text-amber-400">
                                ⚠️ Email Sending Disabled
                            </AlertTitle>
                            <AlertDescription className="mt-2 space-y-3">
                                <p className="text-sm text-amber-800 dark:text-amber-300">
                                    Use this link to reset your password:
                                </p>
                                
                                {/* Link Display Box */}
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <p className="text-xs font-mono break-all text-slate-700 dark:text-slate-300">
                                        {resetLink}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <Button
                                        onClick={copyToClipboard}
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                    >
                                        {copied ? (
                                            <>
                                                <CheckCircle className="h-3 w-3 mr-2" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3 w-3 mr-2" />
                                                Copy Link
                                            </>
                                        )}
                                    </Button>
                                    
                                    <Button
                                        onClick={() => window.open(resetLink, '_blank')}
                                        size="sm"
                                        className="flex-1"
                                    >
                                        <ExternalLink className="h-3 w-3 mr-2" />
                                        Open Link
                                    </Button>
                                </div>

                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                                    ⏰ This link expires in 15 minutes.
                                </p>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* --- SUCCESS MESSAGE (Normal Mode) --- */}
                    {message && !bypassMode && (
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-900 dark:text-green-400">Email Sent!</AlertTitle>
                            <AlertDescription className="text-green-700 dark:text-green-300">
                                {message}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* --- FORM (Hide after bypass link shown) --- */}
                    {!bypassMode && !message && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    placeholder="your.email@college.com"
                                    required 
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                        </form>
                    )}

                    {/* --- RESET BUTTON (Show in bypass mode) --- */}
                    {bypassMode && (
                        <Button
                            onClick={() => {
                                setBypassMode(false);
                                setResetLink('');
                                setMessage('');
                                setEmail('');
                            }}
                            variant="outline"
                            className="w-full mt-4"
                        >
                            Request Another Reset Link
                        </Button>
                    )}
                </CardContent>
                <CardFooter className="justify-center">
                    <Link to="/login" className="text-sm text-blue-600 hover:underline">
                        Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}

export default ForgotPasswordPage;