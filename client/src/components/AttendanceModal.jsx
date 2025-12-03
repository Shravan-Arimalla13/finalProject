import React, { useState, useEffect } from 'react';
import api from '../api.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MapPin } from "lucide-react";

function AttendanceModal({ event, onClose }) {
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (event) {
            setLoading(true);
            api.get(`/poap/event/${event._id}/attendance`)
                .then(res => setAttendees(res.data.attendees))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [event]);

    if (!event) return null;

    return (
        <Dialog open={!!event} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-pink-500" />
                        Verified Attendance: {event.name}
                    </DialogTitle>
                </DialogHeader>
                
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : (
                    <ScrollArea className="h-[300px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Check-In Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendees.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No check-ins yet.</TableCell></TableRow>
                                ) : (
                                    attendees.map((a, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{a.studentName}</TableCell>
                                            <TableCell>{a.studentEmail}</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                {new Date(a.checkInTime).toLocaleTimeString()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    );
}
export default AttendanceModal;