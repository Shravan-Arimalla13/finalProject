// client/src/pages/POAPCheckIn.jsx - ENHANCED WITH SUCCESS/FAIL ANIMATIONS
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Alert, AlertDescription } from "../components/ui/alert-box.jsx";
import { Badge } from "../components/ui/badge-item.jsx";
import { Progress } from "../components/ui/progress.jsx";
import { 
    MapPin, Clock, Loader2, CheckCircle2, 
    AlertTriangle, Navigation, Award, Timer,
    Zap, Trophy, XCircle, PartyPopper
} from "lucide-react";

// Confetti animation component
const Confetti = () => (
    <div className="fixed inset-0 pointer-events-none z-50">
        {[...Array(50)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: '-10%',
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)]
                }}
                animate={{
                    y: ['0vh', '110vh'],
                    x: [0, (Math.random() - 0.5) * 200],
                    rotate: [0, Math.random() * 360],
                    opacity: [1, 0]
                }}
                transition={{
                    duration: 3 + Math.random() * 2,
                    delay: Math.random() * 0.5,
                    ease: "easeOut"
                }}
            />
        ))}
    </div>
);

const POAPCheckIn = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    
    const [loading, setLoading] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [event, setEvent] = useState(null);
    const [gpsCoords, setGpsCoords] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [attendanceScore, setAttendanceScore] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const [qrExpiryTime, setQrExpiryTime] = useState(null);
    const [remainingSeconds, setRemainingSeconds] = useState(null);
    
    const token = searchParams.get('token');
    const eventId = searchParams.get('eventId');

    useEffect(() => {
        if (!isAuthenticated()) return;
        if (eventId) fetchEvent();
    }, [eventId, isAuthenticated]);

    // Live Countdown Timer
    useEffect(() => {
        if (!qrExpiryTime) return;
        
        const interval = setInterval(() => {
            const now = new Date();
            const remaining = Math.max(0, Math.floor((new Date(qrExpiryTime) - now) / 1000));
            setRemainingSeconds(remaining);
            
            if (remaining === 0) {
                setError('⏰ QR code has expired! Ask faculty to generate a new one.');
                clearInterval(interval);
            }
        }, 1000);
        
        return () => clearInterval(interval);
    }, [qrExpiryTime]);

    const fetchEvent = async () => {
        try {
            const res = await api.get(`/events/${eventId}`);
            setEvent(res.data);
            
            if (res.data.qrExpiresAt) {
                setQrExpiryTime(res.data.qrExpiresAt);
            }
        } catch (err) {
            setError('Event not found');
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
            setError(`Location Error: ${err.message}. Enable location in settings.`);
            setGpsLoading(false);
        };

        navigator.geolocation.getCurrentPosition(successHandler, errorHandler, options);
    };

    const handleClaimPOAP = async () => {
        if (!gpsCoords) return setError('GPS required');
        setLoading(true);
        setError(null);
        
        try {
            const response = await api.post('/poap/claim', {
                token, eventId, gps: gpsCoords
            });
            setSuccess(true);
            setAttendanceScore(response.data.attendanceScore);
            
            // Show confetti for perfect score
            if (response.data.attendanceScore === 100) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 4000);
            }
            
            setTimeout(() => navigate('/dashboard'), 4000);
        } catch (err) {
            setError(err.response?.data?.message || 'Claim failed');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Not authenticated screen
    if (!isAuthenticated()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <Card className="max-w-md w-full text-center shadow-2xl">
                        <CardContent className="pt-10">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 0.5, repeat: 3 }}
                            >
                                <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-amber-500" />
                            </motion.div>
                            <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
                            <p className="text-muted-foreground mb-6">Login to claim your attendance badge</p>
                            <Button 
                                onClick={() => navigate('/login', { 
                                    state: { from: `/poap-checkin?eventId=${eventId}&token=${token}` } 
                                })} 
                                className="w-full"
                            >
                                Go to Login
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // Success Screen with Animations
    if (success) {
        const isPerfect = attendanceScore === 100;
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 p-4 relative overflow-hidden">
                {showConfetti && <Confetti />}
                
                <motion.div
                    initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
                    animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                    transition={{ type: "spring", duration: 0.8 }}
                >
                    <Card className="max-w-md w-full text-center shadow-2xl border-t-4 border-green-500">
                        <CardContent className="pt-10 pb-10 space-y-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                                className="relative"
                            >
                                <motion.div
                                    animate={{ 
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 360]
                                    }}
                                    transition={{ 
                                        duration: 0.6,
                                        delay: 0.5,
                                        repeat: isPerfect ? 2 : 0
                                    }}
                                    className="mx-auto bg-gradient-to-br from-green-400 to-emerald-500 p-6 rounded-full w-fit mb-4"
                                >
                                    {isPerfect ? (
                                        <Trophy className="h-20 w-20 text-white" />
                                    ) : (
                                        <CheckCircle2 className="h-20 w-20 text-white" />
                                    )}
                                </motion.div>
                                
                                {isPerfect && (
                                    <motion.div
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: 0.7, type: "spring" }}
                                        className="absolute -top-2 -right-2"
                                    >
                                        <Zap className="h-8 w-8 text-yellow-400 fill-yellow-400" />
                                    </motion.div>
                                )}
                            </motion.div>
                            
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                <h2 className="text-3xl font-bold text-green-800 dark:text-green-300 mb-2">
                                    {isPerfect ? (
                                        <>
                                            <PartyPopper className="inline h-8 w-8 mr-2" />
                                            Perfect Score!
                                        </>
                                    ) : (
                                        '✅ POAP Claimed!'
                                    )}
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Attendance recorded on blockchain
                                </p>
                            </motion.div>
                            
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.6, type: "spring" }}
                                className="bg-white dark:bg-slate-800 p-6 rounded-xl border-2 border-green-200 dark:border-green-900"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="text-6xl font-black text-green-600 dark:text-green-400 mb-2"
                                >
                                    {attendanceScore}%
                                </motion.div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    {isPerfect ? '🎉 On-Time Attendance' : 'Attendance Score'}
                                </p>
                            </motion.div>
                            
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1 }}
                            >
                                <Badge className="bg-green-600 text-white text-base px-6 py-2">
                                    <Award className="h-4 w-4 mr-2" /> NFT Badge Minted
                                </Badge>
                            </motion.div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // Failed/Error Screen with Animation
    if (error && error.includes('already claimed')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                >
                    <Card className="max-w-md w-full text-center shadow-2xl border-t-4 border-red-500">
                        <CardContent className="pt-10 pb-10">
                            <motion.div
                                animate={{ 
                                    rotate: [0, -10, 10, -10, 0],
                                    scale: [1, 1.1, 1]
                                }}
                                transition={{ duration: 0.5 }}
                            >
                                <XCircle className="h-20 w-20 mx-auto mb-4 text-red-500" />
                            </motion.div>
                            <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-2">
                                Already Claimed
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                You've already checked in for this event
                            </p>
                            <Button onClick={() => navigate('/dashboard')} variant="outline">
                                Return to Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // Main Check-In Screen (existing code with minor animation enhancements)
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/20 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Animated Header */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-6"
                >
                    <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 px-6 py-3 rounded-full shadow-lg mb-4 border border-slate-200 dark:border-slate-800">
                        <Timer className="h-5 w-5 text-blue-600 animate-pulse" />
                        <span className="font-bold text-slate-700 dark:text-slate-200">Live Check-In</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Claim Your POAP</h1>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <Card className="shadow-2xl border-t-4 border-blue-500">
                        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
                            <CardTitle className="flex items-center justify-between text-xl">
                                <span className="flex items-center gap-2">
                                    <Award className="h-6 w-6" />
                                    Event Attendance
                                </span>
                                {remainingSeconds !== null && (
                                    <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-lg px-4 py-1">
                                        <Timer className="h-4 w-4 mr-2" />
                                        {formatTime(remainingSeconds)}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        
                        <CardContent className="pt-6 space-y-6">
                            {/* QR Validity Progress */}
                            {remainingSeconds !== null && (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-900"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">QR Code Validity</span>
                                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                            {remainingSeconds > 0 ? `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s left` : 'EXPIRED'}
                                        </span>
                                    </div>
                                    <Progress 
                                        value={(remainingSeconds / 600) * 100} 
                                        className="h-3"
                                    />
                                    {remainingSeconds < 120 && remainingSeconds > 0 && (
                                        <motion.p
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                            className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1"
                                        >
                                            <AlertTriangle className="h-3 w-3" />
                                            Hurry! QR expires soon
                                        </motion.p>
                                    )}
                                </motion.div>
                            )}

                            {error && (
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                >
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                </motion.div>
                            )}
                            
                            {event && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border"
                                >
                                    <div className="flex items-center gap-3">
                                        <Award className="h-6 w-6 text-blue-600 flex-shrink-0" />
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{event.name}</h3>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <Badge variant="outline" className="text-xs">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {new Date(event.date).toLocaleDateString('en-IN')} IST
                                                </Badge>
                                                {event.location?.address && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        {event.location.address}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            
                            {!event && !error && (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                                </div>
                            )}
                            
                            {event && (
                                <div className="space-y-4">
                                    {/* Step 1: GPS */}
                                    <div className="border-t pt-6">
                                        <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-white">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">1</div>
                                            Verify Location
                                        </h3>
                                        
                                        {!gpsCoords ? (
                                            <Button 
                                                onClick={getLocation} 
                                                disabled={gpsLoading}
                                                variant="outline"
                                                className="w-full h-14 text-base font-semibold hover:scale-105 transition-transform"
                                            >
                                                {gpsLoading ? (
                                                    <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Getting Location...</>
                                                ) : (
                                                    <><Navigation className="h-5 w-5 mr-2" /> Enable GPS Check-In</>
                                                )}
                                            </Button>
                                        ) : (
                                            <motion.div
                                                initial={{ scale: 0.9 }}
                                                animate={{ scale: 1 }}
                                                className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-200 dark:border-green-800"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                                        <div>
                                                            <p className="font-bold text-green-700 dark:text-green-300">Location Verified</p>
                                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                                Accuracy: ±{Math.round(gpsCoords.accuracy)}m
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                    
                                    {/* Step 2: Claim */}
                                    <div className="border-t pt-6">
                                        <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-white">
                                            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm">2</div>
                                            Claim POAP
                                        </h3>
                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                            <Button 
                                                onClick={handleClaimPOAP}
                                                disabled={!gpsCoords || loading || (remainingSeconds !== null && remainingSeconds === 0)}
                                                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                                            >
                                                {loading ? (
                                                    <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Minting NFT...</>
                                                ) : (
                                                    <><Award className="h-6 w-6 mr-2" /> Mint Attendance NFT</>
                                                )}
                                            </Button>
                                        </motion.div>
                                    </div>
                                    
                                    {/* Info Box */}
                                    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-blue-200 dark:border-blue-900">
                                        <p className="font-bold text-blue-700 dark:text-blue-300 mb-2">📌 Scoring System (IST)</p>
                                        <ul className="space-y-1">
                                            <li>✅ <strong>First 10 minutes:</strong> 100% (Perfect Score)</li>
                                            <li>⏰ <strong>After 10 min:</strong> -5% per 5 minutes late (min 50%)</li>
                                            <li>🔒 <strong>QR expires:</strong> 10 minutes after generation</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default POAPCheckIn;