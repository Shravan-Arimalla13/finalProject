// client/src/pages/StudentActivationPage.jsx - WITH BYPASS UI
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert-box";
import { Copy, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
// ---

function StudentActivationPage() {
    const [usn, setUsn] = useState('');
    const [email, setEmail] = useState('');
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // --- NEW: For bypass mode ---
    const [activationLink, setActivationLink] = useState('');
    const [bypassMode, setBypassMode] = useState(false);
    const [copied, setCopied] = useState(false);
    // ---------------------------

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');
        setActivationLink('');
        setBypassMode(false);

        try {
            const response = await api.post('/auth/request-student-activation', { usn, email });
            
            // --- CHECK FOR BYPASS MODE ---
            if (response.data.bypassMode || response.data.emailFailed) {
                setBypassMode(true);
                setActivationLink(response.data.activationLink || response.data.debugLink);
                setMessage(response.data.message);
            } else {
                setMessage(response.data.message);
            }
            // ----------------------------
            
            setUsn('');
            setEmail('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send activation link.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(activationLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Activate Account</CardTitle>
                    <CardDescription className="text-center">
                        Students: Enter your details to receive an activation link.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* --- BYPASS MODE ALERT --- */}
                    {bypassMode && activationLink && (
                        <Alert className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-900 dark:text-amber-400">
                                ⚠️ Email Sending Disabled
                            </AlertTitle>
                            <AlertDescription className="mt-2 space-y-3">
                                <p className="text-sm text-amber-800 dark:text-amber-300">
                                    Use the activation link below to complete your registration:
                                </p>
                                
                                {/* Link Display Box */}
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <p className="text-xs font-mono break-all text-slate-700 dark:text-slate-300">
                                        {activationLink}
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
                                        onClick={() => window.open(activationLink, '_blank')}
                                        size="sm"
                                        className="flex-1"
                                    >
                                        <ExternalLink className="h-3 w-3 mr-2" />
                                        Open Link
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {/* --- SUCCESS MESSAGE (Normal Mode) --- */}
                    {message && !bypassMode && (
                        <Alert className="mb-4 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-900 dark:text-green-400">Success!</AlertTitle>
                            <AlertDescription className="text-green-700 dark:text-green-300">
                                {message}
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {/* --- ERROR MESSAGE --- */}
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* --- FORM (Hide after bypass link shown) --- */}
                    {!bypassMode && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="usn">University Seat Number (USN)</Label>
                                <Input
                                    id="usn"
                                    placeholder="e.g. 1KS24MC005"
                                    value={usn}
                                    onChange={(e) => setUsn(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Official Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@college.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Sending Link...' : 'Send Activation Link'}
                            </Button>
                        </form>
                    )}
                    
                    {/* --- RESET BUTTON (Show in bypass mode) --- */}
                    {bypassMode && (
                        <Button
                            onClick={() => {
                                setBypassMode(false);
                                setActivationLink('');
                                setMessage('');
                            }}
                            variant="outline"
                            className="w-full mt-4"
                        >
                            Request Another Activation Link
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

export default StudentActivationPage;