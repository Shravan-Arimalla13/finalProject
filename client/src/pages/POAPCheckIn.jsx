// client/src/pages/POAPCheckIn.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import { motion, AnimatePresence } from 'framer-motion'; // Ensure framer-motion is installed
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Alert, AlertDescription } from "../components/ui/alert-box.jsx";
import { Badge } from "../components/ui/badge-item.jsx";
import { 
    MapPin, Clock, Loader2, CheckCircle2, 
    AlertTriangle, Navigation, Award, 
    ShieldCheck, Globe, Zap 
} from "lucide-react";

const POAPCheckIn = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    
    const [loading, setLoading] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [event, setEvent] = useState(null);
    const [gpsCoords, setGpsCoords] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    
    const token = searchParams.get('token');
    const eventId = searchParams.get('eventId');

    useEffect(() => {
        if (!isAuthenticated()) return;
        if (eventId) fetchEvent();
    }, [eventId, isAuthenticated]);

    const fetchEvent = async () => {
        try {
            const res = await api.get(`/events/${eventId}`);
            setEvent(res.data);
        } catch (err) {
            setError('Event details could not be retrieved.');
        }
    };

    const getLocation = () => {
        setGpsLoading(true);
        setError(null);
        
        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        };

        const successHandler = (position) => {
            setGpsCoords({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            });
            setGpsLoading(false);
        };

        const errorHandler = (err) => {
            navigator.geolocation.getCurrentPosition(
                successHandler,
                (fallbackErr) => {
                    setError(`Location Error: ${fallbackErr.message}. Ensure GPS is active.`);
                    setGpsLoading(false);
                },
                { enableHighAccuracy: false, timeout: 10000 }
            );
        };

        navigator.geolocation.getCurrentPosition(successHandler, errorHandler, options);
    };

    const handleClaimPOAP = async () => {
        if (!gpsCoords) return setError('GPS verification required');
        setLoading(true);
        try {
            await api.post('/poap/claim', {
                token, eventId, gps: gpsCoords
            });
            setSuccess(true);
            setTimeout(() => navigate('/dashboard'), 3500);
        } catch (err) {
            setError(err.response?.data?.message || 'Check-in failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full text-center p-8 shadow-xl border-0">
                    <ShieldCheck className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
                    <p className="text-slate-500 mb-6">Please sign in to verify your attendance on the blockchain.</p>
                    <Button onClick={() => navigate('/login')} className="w-full bg-indigo-600 hover:bg-indigo-700">
                        Sign In to Continue
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <AnimatePresence mode="wait">
                {success ? (
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="max-w-md w-full"
                    >
                        <Card className="text-center p-12 border-0 shadow-2xl bg-white/10 backdrop-blur-lg">
                            <div className="relative mx-auto w-24 h-24 mb-6">
                                <motion.div 
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"
                                />
                                <CheckCircle2 className="relative w-24 h-24 text-green-400" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Check-in Complete!</h2>
                            <p className="text-indigo-200 mb-6">Your NFT Attendance Badge is being minted.</p>
                            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="max-w-md w-full"
                    >
                        <Card className="overflow-hidden border-0 shadow-2xl bg-slate-900/50 backdrop-blur-xl border-t border-white/10">
                            <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center mb-2">
                                    <Badge variant="outline" className="text-indigo-400 border-indigo-400/30 bg-indigo-400/10">
                                        <Globe className="w-3 h-3 mr-1" /> Web3 Attendance
                                    </Badge>
                                    <Award className="text-yellow-500 w-6 h-6" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-white">Claim POAP</CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-6 pt-4">
                                {error && (
                                    <motion.div initial={{ x: -10 }} animate={{ x: 0 }}>
                                        <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-200">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    </motion.div>
                                )}

                                {event ? (
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                                        <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                                        <div className="flex items-center text-slate-400 text-sm">
                                            <Clock className="w-4 h-4 mr-2 text-indigo-400" />
                                            {new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-20 flex items-center justify-center bg-white/5 rounded-xl animate-pulse">
                                        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="relative">
                                        <Button 
                                            onClick={getLocation} 
                                            disabled={gpsLoading || !!gpsCoords} 
                                            variant="outline" 
                                            className={`w-full h-14 text-base transition-all duration-300 ${
                                                gpsCoords 
                                                ? "bg-green-500/10 border-green-500/50 text-green-400" 
                                                : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                                            }`}
                                        >
                                            {gpsLoading ? (
                                                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                            ) : gpsCoords ? (
                                                <Navigation className="mr-2 h-5 w-5" />
                                            ) : (
                                                <MapPin className="mr-2 h-5 w-5" />
                                            )}
                                            {gpsCoords ? "Location Verified" : "Verify GPS Location"}
                                        </Button>
                                        {gpsCoords && (
                                            <motion.p 
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                className="text-[10px] text-center mt-1 text-green-500/70 font-mono"
                                            >
                                                Accuracy: ±{Math.round(gpsCoords.accuracy)}m
                                            </motion.p>
                                        )}
                                    </div>

                                    <Button 
                                        onClick={handleClaimPOAP} 
                                        disabled={!gpsCoords || loading} 
                                        className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:bg-slate-800 disabled:text-slate-500"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                                Minting Badge...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="mr-2 h-5 w-5 fill-current" />
                                                Claim Attendance NFT
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <p className="text-[11px] text-center text-slate-500 leading-relaxed">
                                    POAPs are Proof-of-Attendance Protocol tokens. <br/> 
                                    Verified attendance is recorded permanently on the blockchain.
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default POAPCheckIn;