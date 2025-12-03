// In client/src/pages/POAPCheckIn.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
// Navigate up two levels from pages/POAPCheckIn.jsx to src/api.js
import api from '../api.js'; 

// --- SHADCN IMPORTS ---
// Navigate up two levels from pages/ to src/components/ui/
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
// Use the renamed files we created earlier
import { Alert, AlertDescription } from "../components/ui/alert-box.jsx"; 
import { Badge } from "../components/ui/badge-item.jsx"; 

import { 
    MapPin, Clock, Loader2, CheckCircle2, 
    AlertTriangle, Navigation, Award 
} from "lucide-react";
// ---

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
    
    const token = searchParams.get('token');
    const eventId = searchParams.get('eventId');
    
    useEffect(() => {
        if (eventId) {
            fetchEvent();
        } else {
            setError("Invalid Link: Missing Event ID");
        }
    }, [eventId]);
    
    // --- ADD THIS CHECK ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
                <Card className="max-w-md w-full text-center shadow-lg">
                    <CardHeader>
                        <CardTitle>Sign In Required</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            You must be logged in to claim your attendance badge.
                        </p>
                        <Button onClick={() => navigate('/login')} className="w-full">
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    // ----------------------
    const fetchEvent = async () => {
        try {
            const res = await api.get(`/events/${eventId}`);
            setEvent(res.data);
        } catch (err) {
            setError('Event not found');
        }
    };
    
    const getLocation = () => {
        setGpsLoading(true);
        setError(null);
        
        if (!navigator.geolocation) {
            setError('GPS not supported by your browser');
            setGpsLoading(false);
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setGpsCoords({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                setGpsLoading(false);
            },
            (error) => {
                setError('GPS access denied. Please enable location services.');
                setGpsLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };
    
    const handleClaimPOAP = async () => {
        if (!gpsCoords) {
            setError('Please enable GPS first');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await api.post('/poap/claim', {
                token,
                eventId,
                gps: gpsCoords
            });
            
            setSuccess(true);
            setTimeout(() => {
                navigate('/dashboard');
            }, 3000);
            
        } catch (err) {
            setError(err.response?.data?.message || 'Claim failed');
        } finally {
            setLoading(false);
        }
    };
    
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
                <Card className="max-w-md w-full text-center shadow-2xl border-t-4 border-green-500 animate-in zoom-in">
                    <CardContent className="pt-10 pb-10">
                        <div className="mx-auto bg-green-100 dark:bg-green-900/30 p-4 rounded-full w-fit mb-4">
                            <CheckCircle2 className="h-16 w-16 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">
                            POAP Claimed!
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Your attendance has been recorded on the blockchain
                        </p>
                        <Badge className="bg-green-600 text-white">
                            <Award className="h-3 w-3 mr-1" /> NFT Badge Minted
                        </Badge>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <Card className="max-w-lg w-full shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg p-6">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Award className="h-6 w-6" />
                        Claim Your POAP
                    </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-6 space-y-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                {error}
                            </span>
                        </div>
                    )}
                    
                    {event && (
                        <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                <Award className="h-5 w-5 text-blue-600" />
                                <span className="font-semibold text-lg">{event.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {new Date(event.date).toLocaleDateString()}
                            </div>
                            
                            {event.location && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    {event.location.address || 'On-site event'}
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                            <Navigation className="h-4 w-4 text-blue-500" />
                            Step 1: Verify Location
                        </h3>
                        
                        {!gpsCoords ? (
                            <Button 
                                onClick={getLocation} 
                                disabled={gpsLoading}
                                variant="outline"
                                className="w-full h-12 text-base"
                            >
                                {gpsLoading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Getting Location...</>
                                ) : (
                                    <><MapPin className="h-4 w-4 mr-2" /> Enable GPS Check-In</>
                                )}
                            </Button>
                        ) : (
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="text-sm font-semibold">Location Verified</span>
                                </div>
                                <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                                    ±{Math.round(gpsCoords.accuracy)}m
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3 text-foreground">Step 2: Claim POAP</h3>
                        <Button 
                            onClick={handleClaimPOAP}
                            disabled={!gpsCoords || loading}
                            className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                        >
                            {loading ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Minting...</>
                            ) : (
                                <><Award className="h-5 w-5 mr-2" /> Mint Attendance NFT</>
                            )}
                        </Button>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded text-xs text-slate-600 dark:text-slate-400 border border-blue-100 dark:border-blue-900">
                        <strong>What is a POAP?</strong> A Proof-of-Attendance Protocol NFT proves you were physically present at this event. It is minted to your wallet as a permanent blockchain record.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default POAPCheckIn;