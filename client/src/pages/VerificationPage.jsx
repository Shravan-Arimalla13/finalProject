// In client/src/pages/VerificationPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert-box";
import { Badge } from "@/components/ui/badge-item";
import { CheckCircle2, XCircle, Loader2, AlertCircle, Search, ShieldCheck } from "lucide-react";
// ---

const DigitalCertificateView = ({ cert }) => {
    return (
        <div className="relative w-full max-w-4xl mx-auto bg-white text-slate-900 p-2 shadow-2xl rounded-lg overflow-hidden">
            {/* --- FANCY BORDER CONTAINER --- */}
            <div className="border-8 border-double border-blue-900 p-8 h-full relative">
                {/* Corner Ornaments (CSS shapes) */}
                <div className="absolute top-2 left-2 w-16 h-16 border-t-4 border-l-4 border-yellow-500"></div>
                <div className="absolute top-2 right-2 w-16 h-16 border-t-4 border-r-4 border-yellow-500"></div>
                <div className="absolute bottom-2 left-2 w-16 h-16 border-b-4 border-l-4 border-yellow-500"></div>
                <div className="absolute bottom-2 right-2 w-16 h-16 border-b-4 border-r-4 border-yellow-500"></div>

                {/* --- HEADER --- */}
                <div className="text-center space-y-4 mt-4">
                    {/* Logo */}
                    {cert.design?.logo && (
                        <img 
                            src={cert.design.logo} 
                            alt="College Logo" 
                            className="h-20 mx-auto object-contain"
                        />
                    )}
                    
                    {/* College Name */}
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-blue-900 uppercase tracking-wider">
                        {cert.design?.collegeName || 'K. S. Institute of Technology'}
                    </h1>
                    
                    {/* Department */}
                    <p className="text-sm md:text-base font-semibold text-slate-600">
                        {cert.design?.dept || 'DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS'}
                    </p>

                    <div className="w-1/2 h-1 bg-yellow-500 mx-auto my-4 rounded-full"></div>

                    {/* Certificate Title */}
                    <h2 className="text-2xl md:text-3xl font-serif text-slate-700 tracking-widest">
                        {cert.design?.title || 'CERTIFICATE OF ACHIEVEMENT'}
                    </h2>
                </div>

                {/* --- BODY --- */}
                <div className="text-center my-12 space-y-6">
                    <p className="text-lg text-slate-500 italic">This is proudly presented to</p>
                    
                    <h3 className="text-4xl md:text-5xl font-serif font-bold text-blue-800 border-b-2 border-slate-300 inline-block px-8 pb-2">
                        {cert.studentName}
                    </h3>
                    
                    <p className="text-lg text-slate-600 mt-4">
                        For successfully participating in the event
                    </p>
                    
                    <h4 className="text-2xl md:text-3xl font-bold text-slate-800">
                        {cert.eventName}
                    </h4>
                    
                    <p className="text-md text-slate-500">
                        Conducted on {new Date(cert.eventDate).toLocaleDateString()}
                    </p>
                </div>

                {/* --- FOOTER --- */}
                <div className="flex flex-col md:flex-row justify-between items-end mt-16 px-8 gap-8">
                    {/* Blockchain Proof */}
                    <div className="text-center md:text-left">
                        <div className="mb-2">
                            {cert.isRevoked ? (
                                <Badge variant="destructive" className="text-lg px-4 py-1">REVOKED</Badge>
                            ) : (
                                <Badge className="bg-green-100 text-green-800 border-green-600 hover:bg-green-100 px-3 py-1">
                                    <ShieldCheck className="h-4 w-4 mr-2" /> Blockchain Verified
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono">ID: {cert.certificateId}</p>
                    </div>

                    {/* Signature */}
                    <div className="text-center">
                        {cert.design?.signature && (
                            <img 
                                src={cert.design.signature} 
                                alt="Signature" 
                                className="h-12 mx-auto object-contain -mb-2" 
                            />
                        )}
                        <div className="w-48 h-px bg-slate-900 mb-1"></div>
                        <p className="text-sm font-bold text-slate-700">Authorized Signature</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Verification Page ---
function VerificationPage() {
    const { certId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [inputCertId, setInputCertId] = useState(certId || '');
    const [certificate, setCertificate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isLoadingRevoke, setIsLoadingRevoke] = useState(false);

    const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Faculty';

    useEffect(() => {
        if (certId) verifyId(certId);
    }, [certId]);

    const verifyId = async (idToVerify) => {
        setLoading(true);
        setCertificate(null);
        setError(null);
        try {
            const response = await api.get(`/certificates/verify/${idToVerify}`);
            setCertificate(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        navigate(`/verify/${inputCertId}`);
    };

    const handleRevoke = async () => {
        if (!window.confirm('Irreversible Action: Revoke this certificate?')) return;
        setIsLoadingRevoke(true);
        try {
            await api.post('/certificates/revoke', { certificateId: certificate.certificateId });
            verifyId(certificate.certificateId); // Refresh
        } catch (err) {
            alert('Failed to revoke.');
        } finally {
            setIsLoadingRevoke(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 flex flex-col items-center">
            
            {/* Search Bar */}
            <Card className="w-full max-w-xl shadow-md mb-8">
                <CardContent className="p-4">
                    <form onSubmit={handleSearch} className="flex space-x-2">
                        <Input
                            value={inputCertId}
                            onChange={(e) => setInputCertId(e.target.value)}
                            placeholder="Enter Certificate ID (e.g. CERT-123...)"
                            className="flex-1"
                        />
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Error State */}
            {error && (
                <Alert variant="destructive" className="max-w-xl mb-8">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Verification Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Certificate Display */}
            {certificate && (
                <div className="space-y-6 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                    
                    {/* Admin Controls */}
                    {isAdmin && !certificate.isRevoked && (
                        <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Admin Control</AlertTitle>
                            <AlertDescription className="flex justify-between items-center mt-2">
                                <span>You have permission to revoke this credential.</span>
                                <Button variant="destructive" size="sm" onClick={handleRevoke} disabled={isLoadingRevoke}>
                                    {isLoadingRevoke ? 'Revoking...' : 'Revoke Certificate'}
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* The Visual Certificate */}
                    <DigitalCertificateView cert={certificate} />

                    {/* Technical Details (Accordion) */}
                    <div className="max-w-2xl mx-auto">
                        <details className="group bg-card border rounded-lg p-4 cursor-pointer">
                            <summary className="font-medium text-sm text-muted-foreground flex items-center justify-between">
                                <span>View Technical Blockchain Proof</span>
                                <span className="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="mt-4 space-y-3 text-xs font-mono text-muted-foreground pt-4 border-t">
                                <div>
                                    <span className="font-bold block mb-1">Blockchain Hash:</span>
                                    <div className="bg-muted p-2 rounded break-all">{certificate.certificateHash}</div>
                                </div>
                                <div>
                                    <span className="font-bold block mb-1">Transaction Hash:</span>
                                    <div className="bg-muted p-2 rounded break-all">{certificate.transactionHash}</div>
                                </div>
                                <div className="text-center pt-2">
                                    <a 
                                        href={`https://sepolia.etherscan.io/tx/${certificate.transactionHash}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-blue-500 hover:underline"
                                    >
                                        View on Etherscan ↗
                                    </a>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VerificationPage;