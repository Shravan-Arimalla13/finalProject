import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert-box";

function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/forgot-password', { email });
            setMessage(res.data.message);
        } catch (err) {
            setMessage('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Forgot Password</CardTitle>
                    <CardDescription>Enter your email to reset your password.</CardDescription>
                </CardHeader>
                <CardContent>
                    {message ? (
                        <Alert className="bg-green-50 text-green-700 border-green-200">
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="justify-center">
                    <Link to="/login" className="text-sm text-blue-600 hover:underline">Back to Login</Link>
                </CardFooter>
            </Card>
        </div>
    );
}
export default ForgotPasswordPage;