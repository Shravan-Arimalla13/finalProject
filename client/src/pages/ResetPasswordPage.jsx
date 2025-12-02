// client/src/pages/ResetPasswordPage.jsx
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

// UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import { Loader2, KeyRound } from "lucide-react";

function ResetPasswordPage() {
    const { token } = useParams();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) return setErr("Passwords do not match");
        setLoading(true); setErr('');
        try {
            await api.post('/auth/reset-password', { token, newPassword: password });
            setMsg("Password reset successfully!");
        } catch (error) {
            setErr(error.response?.data?.message || "Failed to reset.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-2">
                        <KeyRound className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">Reset Password</CardTitle>
                    <CardDescription>Enter a new secure password for your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {msg ? (
                        <div className="text-center space-y-4">
                            <Alert className="bg-green-50 text-green-700 border-green-200"><AlertDescription>{msg}</AlertDescription></Alert>
                            <Link to="/login"><Button className="w-full">Go to Login</Button></Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
                            <div className="space-y-2">
                                <Label>New Password</Label>
                                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Confirm Password</Label>
                                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
export default ResetPasswordPage;