// In client/src/pages/LoginPage.jsx
import React, { useState } from 'react';
// Added useLocation to the imports
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet, KeyRound } from 'lucide-react';

// --- COMPONENT: PASSWORD LOGIN FORM ---
const PasswordLoginForm = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const response = await api.post('/users/login', { email, password });
            onLoginSuccess(response.data.user, response.data.token);
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
                <p className="text-sm text-slate-500 text-center mb-4">
                    Use your Email and Password.
                </p>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm" role="alert">
                        {error}
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="name@college.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="password">Password</Label>
                        <Link to="/forgot-password" university-red-600 className="text-xs text-blue-600 hover:underline">Forgot password?</Link>
                    </div>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
            </CardContent>
            <CardFooter>
                <Button type="submit" className="w-full mt-4" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In with Password'}
                </Button>
            </CardFooter>
        </form>
    );
};

// --- COMPONENT: WALLET LOGIN FORM (SIWE) ---
const WalletLoginForm = ({ onLoginSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSiweLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!window.ethereum) throw new Error("MetaMask is not installed.");
            
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();

            const nonceRes = await api.get(`/auth/nonce?address=${address}`);
            const nonce = nonceRes.data.nonce;

            const siweMessage = new SiweMessage({
                domain: window.location.host,
                address: address,
                statement: 'Sign in to the Credentialing Platform.',
                uri: window.location.origin,
                version: '1',
                chainId: 11155111, // Changed to Sepolia Chain ID
                nonce: nonce,
            });

            const messageToSign = siweMessage.prepareMessage();
            const signature = await signer.signMessage(messageToSign);

            const verifyRes = await api.post('/auth/verify-signature', {
                message: messageToSign,
                signature: signature,
            });
            
            onLoginSuccess(verifyRes.data.user, verifyRes.data.token);

        } catch (err) {
            if (err.response?.status === 404) {
                setError("Wallet not linked. Login with Password first.");
            } else {
                setError(err.response?.data?.message || err.message || 'Login failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <CardContent className="space-y-4 pt-4">
            <p className="text-sm text-slate-500 text-center mb-4">
                Log in instantly with your connected wallet.
            </p>
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm" role="alert">
                    {error}
                </div>
            )}
            <div className="flex justify-center py-4">
                <div className="bg-slate-100 p-4 rounded-full">
                    <Wallet className="h-10 w-10 text-blue-600" />
                </div>
            </div>
            <Button onClick={handleSiweLogin} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign-In with Ethereum'}
            </Button>
        </CardContent>
    );
};

// --- MAIN PAGE ---
function LoginPage() {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // Hook to access navigation state

    // If already logged in, respect the redirect or go to dashboard
    if (isAuthenticated()) {
        const from = location.state?.from || "/dashboard";
        return <Navigate to={from} replace />;
    }

    const handleLoginSuccess = (user, token) => {
        login(user, token);
        // FIX: Check if the user was sent here from the POAP page
        const redirectTo = location.state?.from || '/dashboard';
        navigate(redirectTo, { replace: true });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md space-y-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Credentialing System</h1>
                    <p className="text-slate-500">Secure Blockchain Verification</p>
                </div>

                <Tabs defaultValue="password" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="password">
                            <KeyRound className="h-4 w-4 mr-2"/> Password
                        </TabsTrigger>
                        <TabsTrigger value="wallet">
                            <Wallet className="h-4 w-4 mr-2"/> Wallet
                        </TabsTrigger>
                    </TabsList>
                    
                    <Card className="shadow-lg mt-2">
                        <TabsContent value="password">
                            <PasswordLoginForm onLoginSuccess={handleLoginSuccess} />
                        </TabsContent>
                        
                        <TabsContent value="wallet">
                            <WalletLoginForm onLoginSuccess={handleLoginSuccess} />
                        </TabsContent>
                    </Card>
                </Tabs>

                <div className="text-center mt-6">
                    <p className="text-sm text-slate-600">New Student?</p>
                    <Link to="/activate" className="text-blue-600 font-semibold hover:underline">
                        Activate your Account here
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;