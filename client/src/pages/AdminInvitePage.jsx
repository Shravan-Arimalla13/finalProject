// client/src/pages/AdminInvitePage.jsx - WITH BYPASS UI
import React, { useState } from 'react';
import api from '../api';

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert-box";
import { Mail, Copy, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
// ---

function AdminInvitePage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [department, setDepartment] = useState('');
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // --- BYPASS MODE STATES ---
    const [inviteLink, setInviteLink] = useState('');
    const [bypassMode, setBypassMode] = useState(false);
    const [copied, setCopied] = useState(false);
    // -------------------------

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');
        setInviteLink('');
        setBypassMode(false);

        try {
            const response = await api.post('/admin/invite-faculty', { name, email, department });
            
            // --- CHECK FOR BYPASS MODE ---
            if (response.data.bypassMode || response.data.emailFailed) {
                setBypassMode(true);
                setInviteLink(response.data.inviteLink || response.data.debugLink);
                setMessage(response.data.message);
            } else {
                setMessage(response.data.message);
                // Reset form on success
                setName('');
                setEmail('');
                setDepartment('');
            }
            // ----------------------------
            
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send invite.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const resetForm = () => {
        setBypassMode(false);
        setInviteLink('');
        setMessage('');
        setName('');
        setEmail('');
        setDepartment('');
    };

    return (
        <div className="min-h-screen bg-muted/40 p-4 md:p-8">
            <div className="max-w-xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground">Invite Faculty</h1>
                    <p className="text-muted-foreground mt-2">
                        Send an invitation to a new Department Admin. They will receive an email to activate their account.
                    </p>
                </div>

                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-blue-600" />
                            Send Invite
                        </CardTitle>
                        <CardDescription>
                            Enter the faculty details below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* --- BYPASS MODE ALERT --- */}
                        {bypassMode && inviteLink && (
                            <Alert className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-900 dark:text-amber-400">
                                    ⚠️ Email Sending Disabled
                                </AlertTitle>
                                <AlertDescription className="mt-2 space-y-3">
                                    <p className="text-sm text-amber-800 dark:text-amber-300">
                                        <strong>Share this invite link with {name || 'the faculty member'}:</strong>
                                    </p>
                                    
                                    {/* Link Display Box */}
                                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                                        <p className="text-xs font-mono break-all text-slate-700 dark:text-slate-300">
                                            {inviteLink}
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
                                            onClick={() => window.open(inviteLink, '_blank')}
                                            size="sm"
                                            className="flex-1"
                                        >
                                            <ExternalLink className="h-3 w-3 mr-2" />
                                            Open Link
                                        </Button>
                                    </div>

                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                                        ⏰ This invite link expires in 24 hours.
                                    </p>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* --- SUCCESS MESSAGE (Normal Mode) --- */}
                        {message && !bypassMode && (
                            <Alert className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900 mb-4">
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        )}
                        
                        {/* --- ERROR MESSAGE --- */}
                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* --- FORM (Hide after bypass link shown) --- */}
                        {!bypassMode && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Faculty Name</Label>
                                    <Input 
                                        id="name" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)} 
                                        placeholder="Dr. John Smith"
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Faculty Email</Label>
                                    <Input 
                                        id="email" 
                                        type="email" 
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        placeholder="john.smith@college.com"
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Input 
                                        id="department" 
                                        value={department} 
                                        onChange={(e) => setDepartment(e.target.value)} 
                                        placeholder="e.g. Computer Science" 
                                        required 
                                    />
                                </div>
                                
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send Invite'}
                                </Button>
                            </form>
                        )}

                        {/* --- RESET BUTTON (Show in bypass mode) --- */}
                        {bypassMode && (
                            <Button
                                onClick={resetForm}
                                variant="outline"
                                className="w-full mt-4"
                            >
                                Invite Another Faculty Member
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default AdminInvitePage;