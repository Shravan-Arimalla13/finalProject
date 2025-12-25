// client/src/pages/POAPCheckIn.jsx - ENHANCED MOBILE-RESPONSIVE VERSION
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Alert, AlertDescription } from "../components/ui/alert-box.jsx";
import { Badge } from "../components/ui/badge-item.jsx";
import { Progress } from "../components/ui/progress.jsx";
import { 
    MapPin, Clock, Loader2, CheckCircle2, 
    AlertTriangle, Navigation, Award, Timer,
    Zap, Trophy
} from "lucide-react";

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
    
    // NEW: QR Countdown Timer State
    const [qrExpiryTime, setQrExpiryTime] = useState(null);
    const [remainingSeconds, setRemainingSeconds] = useState(null);
    
    const token = searchParams.get('token');
    const eventId = searchParams.get('eventId');

    useEffect(() => {
        if (!isAuthenticated()) return;
        if (eventId) fetchEvent();
    }, [eventId, isAuthenticated]);

    // NEW: Live Countdown Timer
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
            
            // NEW: If QR metadata exists, set expiry timer
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
        try {
            const response = await api.post('/poap/claim', {
                token, eventId, gps: gpsCoords
            });
            setSuccess(true);
            setAttendanceScore(response.data.attendanceScore);
            setTimeout(() => navigate('/dashboard'), 3500);
        } catch (err) {
            setError(err.response?.data?.message || 'Claim failed');
        } finally {
            setLoading(false);
        }
    };

    // Format countdown display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isAuthenticated()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
                <Card className="max-w-md w-full text-center shadow-2xl animate-in zoom-in">
                    <CardContent className="pt-10">
                        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-amber-500" />
                        <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
                        <p className="text-muted-foreground mb-6">Login to claim your attendance badge</p>
                        <Button onClick={() => navigate('/login', { state: { from: `/poap-checkin?eventId=${eventId}&token=${token}` } })} className="w-full">
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // SUCCESS SCREEN (Enhanced)
    if (success) {
        const isPerfect = attendanceScore === 100;
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 p-4">
                <Card className="max-w-md w-full text-center shadow-2xl border-t-4 border-green-500 animate-in zoom-in">
                    <CardContent className="pt-10 pb-10 space-y-6">
                        <div className="relative">
                            <div className="mx-auto bg-gradient-to-br from-green-400 to-emerald-500 p-6 rounded-full w-fit mb-4 animate-pulse">
                                {isPerfect ? <Trophy className="h-20 w-20 text-white" /> : <CheckCircle2 className="h-20 w-20 text-white" />}
                            </div>
                            <div className="absolute -top-2 -right-2 animate-bounce">
                                <Zap className="h-8 w-8 text-yellow-400 fill-yellow-400" />
                            </div>
                        </div>
                        
                        <div>
                            <h2 className="text-3xl font-bold text-green-800 dark:text-green-300 mb-2">
                                {isPerfect ? '🎉 Perfect Score!' : '✅ POAP Claimed!'}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                Attendance recorded on blockchain
                            </p>
                        </div>
                        
                        {/* Score Display */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-2 border-green-200 dark:border-green-900">
                            <div className="text-6xl font-black text-green-600 dark:text-green-400 mb-2">
                                {attendanceScore}%
                            </div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {isPerfect ? 'On-Time Attendance' : 'Attendance Score'}
                            </p>
                        </div>
                        
                        <Badge className="bg-green-600 text-white text-base px-6 py-2">
                            <Award className="h-4 w-4 mr-2" /> NFT Badge Minted
                        </Badge>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/20 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6 animate-in fade-in slide-in-from-top">
                    <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 px-6 py-3 rounded-full shadow-lg mb-4 border border-slate-200 dark:border-slate-800">
                        <Timer className="h-5 w-5 text-blue-600 animate-pulse" />
                        <span className="font-bold text-slate-700 dark:text-slate-200">Live Check-In</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Claim Your POAP</h1>
                </div>

                <Card className="shadow-2xl border-t-4 border-blue-500 animate-in fade-in slide-in-from-bottom">
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
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-900 animate-in fade-in">
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
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Hurry! QR expires soon
                                    </p>
                                )}
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive" className="animate-in fade-in">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        
                        {event && (
                            <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border animate-in fade-in">
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
                            </div>
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
                                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-200 dark:border-green-800 animate-in zoom-in">
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
                                        </div>
                                    )}
                                </div>
                                
                                {/* Step 2: Claim */}
                                <div className="border-t pt-6">
                                    <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-white">
                                        <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm">2</div>
                                        Claim POAP
                                    </h3>
                                    <Button 
                                        onClick={handleClaimPOAP}
                                        disabled={!gpsCoords || loading || (remainingSeconds !== null && remainingSeconds === 0)}
                                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {loading ? (
                                            <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Minting NFT...</>
                                        ) : (
                                            <><Award className="h-6 w-6 mr-2" /> Mint Attendance NFT</>
                                        )}
                                    </Button>
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
            </div>
        </div>
    );
};

export default POAPCheckIn;