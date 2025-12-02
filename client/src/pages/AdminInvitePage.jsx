// In client/src/pages/AdminInvitePage.jsx
import React, { useState } from 'react';
import api from '../api';

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import { Mail } from "lucide-react";
// ---

function AdminInvitePage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [department, setDepartment] = useState('');
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await api.post('/admin/invite-faculty', { name, email, department });
            setMessage(response.data.message);
            setName('');
            setEmail('');
            setDepartment('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send invite.');
        } finally {
            setLoading(false);
        }
    };

    return (
        // --- FIXED BACKGROUND ---
        <div className="min-h-screen bg-muted/40 p-4 md:p-8">
            <div className="max-w-xl mx-auto">
                <div className="mb-6">
                    {/* --- FIXED TEXT COLOR --- */}
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
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {message && (
                                <Alert className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900">
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            
                            <div className="space-y-2">
                                <Label htmlFor="name">Faculty Name</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Faculty Email</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science" required />
                            </div>
                            
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Sending...' : 'Send Invite'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default AdminInvitePage;