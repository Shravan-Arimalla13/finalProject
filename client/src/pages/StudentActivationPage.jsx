// In client/src/pages/StudentActivationPage.jsx
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
// ---

function StudentActivationPage() {
    const [usn, setUsn] = useState('');
    const [email, setEmail] = useState('');
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await api.post('/auth/request-student-activation', { usn, email });
            // --- LOG THE BACKDOOR LINK ---
        console.log("DEBUG ACTIVATION LINK:", response.data.debugLink);
        // -----------------------------
            setMessage(response.data.message);
            setUsn('');
            setEmail('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send activation link.');
        } finally {
            setLoading(false);
        }
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
                    {/* Success Message */}
                    {message && (
                        <div className="mb-4 p-4 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm text-center">
                            {message}
                        </div>
                    )}
                    
                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm text-center">
                            {error}
                        </div>
                    )}

                    {!message && (
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