// In client/src/pages/ClaimInvitePage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

// UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import { Loader2, ShieldCheck } from "lucide-react";

function ClaimInvitePage() {
    const { token } = useParams(); // Get token from URL
    const navigate = useNavigate();
    const { login } = useAuth(); // Get login function from our context

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setLoading(true);

        try {
            // Call our new backend API
            const response = await api.post('/auth/claim-invite', { token, password });

            // On success, use our existing login() function to save the new token
            login(response.data.user, response.data.token);
            
            // Redirect to the dashboard, now logged in
            navigate('/dashboard');

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to activate account.');
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-2">
                        <ShieldCheck className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">Faculty Account Activation</CardTitle>
                    <CardDescription>Set your password to claim your Department Admin account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {loading ? 'Activating...' : 'Activate Account'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default ClaimInvitePage;