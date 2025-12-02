// In client/src/components/ParticipantsModal.jsx
import React, { useState, useEffect } from 'react';
import api from '../api.js'; // Explicit .js extension

// --- SHADCN IMPORTS ---
// Using relative paths to avoid alias resolution issues
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog.jsx"; 
import { Button } from "./ui/button.jsx"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table.jsx"; 
import { ScrollArea } from "./ui/scroll-area.jsx"; 
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar.jsx";

// --- FIX: Use explicit relative paths for renamed components ---
import { Badge } from "./ui/badge-item.jsx"; 
import { Alert, AlertDescription } from "./ui/alert-box.jsx";
// ------------------------------

import { Loader2, Mail, User, AlertCircle, CheckCircle2, Award } from "lucide-react";

function ParticipantsModal({ event, onClose }) {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Issue State for individual buttons
    const [issueStatus, setIssueStatus] = useState({});

    useEffect(() => {
        if (event) {
            setLoading(true);
            setError(null);
            setIssueStatus({});
            
            const fetchParticipants = async () => {
                try {
                    const response = await api.get(`/events/${event._id}/participants`);
                    setParticipants(response.data);
                } catch (err) {
                    console.error("Fetch error:", err);
                    // Handle 401 explicitly if needed, but AuthContext usually handles redirects
                    setError('Failed to fetch participants. Please try logging in again.');
                } finally {
                    setLoading(false);
                }
            };
            fetchParticipants();
        }
    }, [event]);

    const handleIssueSingle = async (participant) => {
        const { name, email } = participant;
        const { name: eventName, date: eventDate } = event;

        setIssueStatus(prev => ({ ...prev, [email]: { message: 'Issuing...', isError: false, loading: true } }));

        try {
            const response = await api.post('/certificates/issue/single', { 
                eventName: eventName,
                eventDate: eventDate,
                studentName: name,
                studentEmail: email
            });
            setIssueStatus(prev => ({ ...prev, [email]: { message: 'Issued', isError: false, loading: false } }));

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed';
            setIssueStatus(prev => ({ ...prev, [email]: { message: errorMessage, isError: true, loading: false } }));
        }
    };

    // Determine if modal is open based on 'event' prop
    const isOpen = !!event;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col bg-background text-foreground">
                <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <User className="h-6 w-6 text-primary" /> 
                        Event Participants
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        Manage attendees for <span className="font-semibold text-foreground">{event?.name}</span>
                    </DialogDescription>
                </DialogHeader>

                {/* --- STATS BAR --- */}
                <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="bg-muted/50 p-3 rounded-lg border text-center">
                        <div className="text-2xl font-bold text-primary">{participants.length}</div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Students</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg border text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {/* Count how many have certificates (if we had that data here, for now placeholder) */}
                            {Object.values(issueStatus).filter(s => !s.isError && !s.loading).length}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Issued This Session</div>
                    </div>
                </div>

                {error ? (
                    <Alert variant="destructive" className="my-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-muted-foreground">Loading roster...</p>
                    </div>
                ) : (
                    <div className="flex-grow overflow-hidden border rounded-lg bg-card">
                        {/* Use ScrollArea for long lists */}
                        <ScrollArea className="h-[400px] w-full">
                            {participants.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <Mail className="h-12 w-12 opacity-20 mb-2" />
                                    <p>No participants have registered yet.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[300px]">Student</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {participants.map((p, index) => {
                                            const status = issueStatus[p.email];
                                            const isSuccess = status && !status.isError && !status.loading;

                                            return (
                                                <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9 border">
                                                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`} />
                                                                <AvatarFallback>{p.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium leading-none">{p.name}</span>
                                                                <span className="text-xs text-muted-foreground mt-1">{p.email}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {isSuccess ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex w-fit items-center gap-1">
                                                                <CheckCircle2 className="h-3 w-3" /> Issued
                                                            </Badge>
                                                        ) : status?.isError ? (
                                                            <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                                <AlertCircle className="h-3 w-3" /> Error
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="opacity-50">
                                                                Pending
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {status?.message && !status?.loading && !status?.isError ? (
                                                            // If done, show nothing or a view button
                                                            <Button variant="ghost" size="sm" disabled className="text-green-600">
                                                                Done
                                                            </Button>
                                                        ) : (
                                                            <Button 
                                                                size="sm" 
                                                                variant={status?.isError ? "destructive" : "default"}
                                                                className={status?.isError ? "" : "bg-blue-600 hover:bg-blue-700"}
                                                                disabled={status?.loading}
                                                                onClick={() => handleIssueSingle(p)}
                                                            >
                                                                {status?.loading ? (
                                                                    <>
                                                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                                        Issuing...
                                                                    </>
                                                                ) : status?.isError ? (
                                                                    "Retry"
                                                                ) : (
                                                                    <>
                                                                        <Award className="mr-2 h-3 w-3" />
                                                                        Issue Cert
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}
                                                        {status?.isError && (
                                                            <div className="text-[10px] text-red-500 mt-1 max-w-[120px] ml-auto truncate" title={status.message}>
                                                                {status.message}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </ScrollArea>
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>Close Window</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ParticipantsModal;