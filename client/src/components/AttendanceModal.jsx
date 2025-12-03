// In client/src/components/AttendanceModal.jsx
import React, { useState, useEffect } from 'react';
import api from '../api.js'; // Explicit extension

// --- SHADCN IMPORTS (Relative paths) ---
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription 
} from "./ui/dialog.jsx";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "./ui/table.jsx";
import { ScrollArea } from "./ui/scroll-area.jsx";
import { Loader2, MapPin, UserCheck, Calendar, Search } from "lucide-react";
import { Input } from "./ui/input.jsx"; // For search/filter
import { Badge } from "./ui/badge-item.jsx"; // Use your renamed badge file
// ---

function AttendanceModal({ event, onClose }) {
    const [attendees, setAttendees] = useState([]);
    const [filteredAttendees, setFilteredAttendees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ total: 0, onTime: 0, late: 0 });

    const isOpen = !!event;

    useEffect(() => {
        if (event) {
            setLoading(true);
            // Fetch attendance data
            api.get(`/poap/event/${event._id}/attendance`)
                .then(res => {
                    setAttendees(res.data.attendees);
                    setFilteredAttendees(res.data.attendees);
                    if (res.data.stats) setStats(res.data.stats);
                })
                .catch(err => console.error("Failed to load attendance:", err))
                .finally(() => setLoading(false));
        }
    }, [event]);

    // Search Filter Logic
    useEffect(() => {
        if (!attendees) return;
        const results = attendees.filter(a => 
            a.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredAttendees(results);
    }, [searchTerm, attendees]);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col bg-background text-foreground">
                <DialogHeader className="pb-4 border-b space-y-1">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <MapPin className="h-5 w-5 text-pink-500" />
                            Verified Attendance
                        </DialogTitle>
                        {event && (
                            <Badge variant="outline" className="font-normal text-muted-foreground">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(event.date).toLocaleDateString()}
                            </Badge>
                        )}
                    </div>
                    <DialogDescription>
                        List of students who physically attended and claimed a POAP for <strong>{event?.name}</strong>.
                    </DialogDescription>
                </DialogHeader>
                
                {/* --- STATS BAR --- */}
                <div className="grid grid-cols-3 gap-4 py-2">
                    <div className="bg-muted/30 p-3 rounded-lg border text-center">
                        <div className="text-2xl font-bold text-foreground">{stats.totalAttendees || attendees.length}</div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Checked In</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-900 text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.onTime || 0}</div>
                        <div className="text-[10px] font-bold text-green-700 dark:text-green-300 uppercase tracking-wider">On Time</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900 text-center">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.late || 0}</div>
                        <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Late</div>
                    </div>
                </div>

                {/* --- SEARCH --- */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or email..."
                        className="pl-9 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* --- TABLE --- */}
                {loading ? (
                    <div className="flex justify-center items-center h-[300px]">
                        <Loader2 className="animate-spin h-8 w-8 text-primary" />
                    </div>
                ) : (
                    <div className="flex-grow overflow-hidden border rounded-md">
                        <ScrollArea className="h-[350px] w-full">
                            <Table>
                                <TableHeader className="bg-muted sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="text-right">Check-In Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAttendees.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                                                {searchTerm ? "No matching students found." : "No check-ins recorded yet."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredAttendees.map((a, i) => (
                                            <TableRow key={i} className="hover:bg-muted/50">
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                        {a.studentName.charAt(0)}
                                                    </div>
                                                    {a.studentName}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {a.studentEmail}
                                                </TableCell>
                                                <TableCell className="text-right text-xs font-mono text-muted-foreground">
                                                    {new Date(a.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default AttendanceModal;