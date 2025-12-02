// client/src/pages/StudentSetPasswordPage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

// UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import { Loader2, Lock } from "lucide-react";

function StudentSetPasswordPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { login } = useAuth();

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) { setError('Passwords do not match.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

        setLoading(true); setError('');
        try {
            const response = await api.post('/auth/activate-student-account', { token, password });
            login(response.data.user, response.data.token);
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
                    <div className="mx-auto bg-indigo-100 p-3 rounded-full w-fit mb-2">
                        <Lock className="h-6 w-6 text-indigo-600" />
                    </div>
                    <CardTitle className="text-2xl">Set Account Password</CardTitle>
                    <CardDescription>Finalize your account to access the Student Dashboard.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                        
                        <div className="space-y-2">
                            <Label>Create Password</Label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Confirm Password</Label>
                            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                        </div>
                        
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {loading ? 'Activating...' : 'Activate & Log In'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default StudentSetPasswordPage;