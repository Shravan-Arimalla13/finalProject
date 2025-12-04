// In client/src/pages/EventManagementPage.jsx
import React, { useState, useEffect, useRef } from 'react';
// --- FIX: Use ALIAS for ALL internal paths ---
import api from '@/api';
import ParticipantsModal from '@/components/ParticipantsModal';
import AttendanceModal from '@/components/AttendanceModal'; 
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '@/context/AuthContext';
import { TableSkeleton } from '@/components/TableSkeleton'; 
// ---------------------------------------------
import { Input } from "@/components/ui/input";

// --- SHADCN IMPORTS (Standard Alias) ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MoreHorizontal, Search, PenTool, RefreshCcw, Loader2, QrCode, Copy, MapPin, Clock, CheckCircle2, Award, Users, UserCheck } from "lucide-react"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// ---

function EventManagementPage() {
    const { user } = useAuth();

    // --- MAIN STATE ---
    const [events, setEvents] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [attendanceEvent, setAttendanceEvent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Issue State
    const [issueLoading, setIssueLoading] = useState(null);
    const [issueMessage, setIssueMessage] = useState({ id: null, text: null });
    const [issueError, setIssueError] = useState({ id: null, text: null });

    // QR Modal State
    const [isQROpen, setIsQROpen] = useState(false);
    const [qrData, setQrData] = useState({ img: null, url: '' });

    // --- CREATE FORM STATE ---
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false); 
    const [isGpsLoading, setIsGpsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '', date: '', description: '',
        collegeName: 'K. S. Institute of Technology', 
        customSignatureText: 'Authorized Signature',
        headerDepartment: '',
        certificateTitle: 'CERTIFICATE OF PARTICIPATION',
        eventType: 'Workshop',
        eventDuration: '',
        isPublic: false,
        startTime: '09:00', 
        endTime: '17:00',   
        location: { latitude: null, longitude: null, address: '' }
    });

    const [customDeptInput, setCustomDeptInput] = useState('');
    const [customTitleInput, setCustomTitleInput] = useState('');
    const [logoImage, setLogoImage] = useState(null); 
    const [signatureImage, setSignatureImage] = useState(null); 
    const sigPadRef = useRef({});

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => { fetchEvents(); }, []);

    useEffect(() => {
        if (user) {
            if (user.role === 'Faculty' && user.department) {
                const formalDept = `DEPARTMENT OF ${user.department.toUpperCase()}`; 
                setFormData(prev => ({ ...prev, headerDepartment: formalDept }));
            } else if (user.role === 'SuperAdmin') {
                setFormData(prev => ({ ...prev, headerDepartment: 'OTHER' }));
            }
        }
    }, [user]);

    const fetchEvents = async () => {
        setIsLoadingData(true);
        try {
            const response = await api.get('/events');
            setEvents(response.data);
            
            if (response.data.length > 0) {
                const latest = response.data.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b));
                if (latest.certificateConfig) {
                    setLogoImage(latest.certificateConfig.collegeLogo || null);
                    setSignatureImage(latest.certificateConfig.signatureImage || null);
                }
            }
        } catch (err) { 
            console.error("Failed to fetch events"); 
        } finally {
            setIsLoadingData(false); 
        }
    };

    const handleImageUpload = (e, setFunction) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFunction(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleLocationChange = (field, value) => {
        setFormData(prev => ({ 
            ...prev, 
            location: {
                ...prev.location,
                [field]: value
            }
        }));
    };

    const setLocationToCurrent = () => {
        setIsGpsLoading(true);
        if (!navigator.geolocation) {
            alert("Geolocation not supported. Cannot set Check-In location.");
            setIsGpsLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({ 
                    ...prev, 
                    location: {
                        ...prev.location,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        address: 'Current GPS Venue' // Updated label
                    }
                }));
                setIsGpsLoading(false);
                alert("GPS Location successfully captured and set as Venue.");
            },
            () => {
                alert("GPS Capture Failed. Please allow location access.");
                setIsGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    const clearSig = () => {
        if (sigPadRef.current) sigPadRef.current.clear();
        setSignatureImage(null); 
    };

    const handleCreateEvent = async () => {
        if (isCreating) return; 

        if (!formData.name || !formData.date || !formData.startTime || !formData.endTime) {
            alert("Please fill in Event Name, Date, Start Time, and End Time.");
            return;
        }

        setIsCreating(true); 

        const finalDept = formData.headerDepartment === 'OTHER' ? customDeptInput : formData.headerDepartment;
        const finalTitle = formData.certificateTitle === 'OTHER' ? customTitleInput : formData.certificateTitle;

        let finalSignature = signatureImage;
        if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
            finalSignature = sigPadRef.current.getCanvas().toDataURL('image/png');
        }

        try {
            await api.post('/events', {
                ...formData, 
                location: formData.location, 
                certificateConfig: {
                    collegeName: formData.collegeName,
                    customSignatureText: formData.customSignatureText,
                    collegeLogo: logoImage, 
                    signatureImage: finalSignature,
                    headerDepartment: finalDept,
                    certificateTitle: finalTitle,
                    eventType: formData.eventType,
                    eventDuration: formData.eventDuration
                }
            });
            
            setIsDialogOpen(false); 
            fetchEvents(); 
            
            setFormData(prev => ({ 
                ...prev, name: '', date: '', description: '', eventType: '', eventDuration: '', isPublic: false
            }));
            
        } catch (err) {
            alert(err.response?.data?.message || "Failed to create event");
        } finally {
            setIsCreating(false); 
        }
    };

    const handleIssueCertificates = async (event) => {
        // Issuance Lock Fix is handled by checking isFutureEvent in the table logic
        
        const participantCount = event.participants?.length || 0;
        if (!window.confirm(`Are you sure you want to issue certificates to all ${participantCount} participants?`)) return;
        setIssueLoading(event._id);
        setIssueMessage({ id: null, text: null });
        setIssueError({ id: null, text: null });
        try {
            const response = await api.post(`/certificates/issue/event/${event._id}`);
            setIssueMessage({ id: event._id, text: response.data.message });
            fetchEvents();
        } catch (err) {
            setIssueError({ id: event._id, text: err.response?.data?.message || 'Failed.' });
        } finally {
            setIssueLoading(null);
        }
    };

    const handleViewParticipants = (event) => setSelectedEvent(event);
    const handleViewAttendance = (event) => setAttendanceEvent(event);
    
    const handleGenerateQR = async (event) => {
        try {
            const res = await api.get(`/poap/event/${event._id}/qr`);
            setQrData({ img: res.data.qrCode, url: res.data.checkInUrl });
            setIsQROpen(true); 
        } catch (e) {
            alert("Failed to generate QR code. Are you logged in?");
        }
    };

    const copyToClipboard = (event) => {
        const publicUrl = `${window.location.origin}/event/${event._id}`;
        navigator.clipboard.writeText(publicUrl);
        alert('Copied!');
    };

    const filteredEvents = events.filter(event => event.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="min-h-screen bg-muted/40 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-foreground">Event Management</h1>
                    
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg"> + Create New Event</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create Event & Design Certificate</DialogTitle>
                                <DialogDescription>Configure attendance, time lock, and branding.</DialogDescription>
                            </DialogHeader>
                            
                            <div className="grid gap-6 py-4">
                                
                                {/* 1. EVENT NAME AND DESCRIPTION */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Event Name</Label>
                                        <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Event Date</Label>
                                        <Input type="date" min={today} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                                </div>

                                <hr className="border-border my-2" />
                                <h3 className="font-semibold text-foreground">Time & Location Services</h3>
                                
                                {/* 2. TIME AND LOCATION SETUP (NEW) */}
                                <Card className="p-4 bg-muted/20 border-l-4 border-l-indigo-500">
                                    <CardContent className="p-0 space-y-4">
                                        {/* TIME CONSTRAINTS */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label><Clock className="h-4 w-4 inline mr-1" /> Start Time</Label>
                                                <Input type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>End Time (Issuance Lock)</Label>
                                                <Input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
                                            </div>
                                        </div>

                                        {/* LOCATION SETUP */}
                                        <div className="space-y-2 border-t pt-3">
                                            <Label><MapPin className="h-4 w-4 inline mr-1" /> Physical Check-In Venue</Label>
                                            
                                            <div className="flex gap-2 items-center">
                                                <Input 
                                                    placeholder="Venue Address (e.g., Seminar Hall A)" 
                                                    value={formData.location.address}
                                                    onChange={(e) => handleLocationChange('address', e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button type="button" onClick={setLocationToCurrent} disabled={isGpsLoading} variant="secondary" className="shrink-0">
                                                    {isGpsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1"/> : <MapPin className='h-4 w-4 mr-1'/>}
                                                    Capture GPS
                                                </Button>
                                            </div>

                                            {/* GPS STATUS FEEDBACK */}
                                            {formData.location.latitude && (
                                                <p className="text-xs text-green-600 flex items-center gap-1">
                                                    <CheckCircle2 className='h-3 w-3'/> GPS Venue Set: Lat/Lng {formData.location.latitude.toFixed(4)}
                                                </p>
                                            )}
                                            {!formData.location.latitude && (
                                                <p className="text-xs text-amber-600">
                                                    (Optional) Capture GPS coordinates for fraud-proof attendance.
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                                
                                <hr className="border-border my-2" />
                                <h3 className="font-semibold text-foreground">Certificate Details</h3>

                                {/* 3. CERTIFICATE AND BRANDING (Existing) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Department Header</Label>
                                        <select 
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={formData.headerDepartment}
                                            onChange={(e) => setFormData({...formData, headerDepartment: e.target.value})}
                                        >
                                            <option value="DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS (MCA)">Dept. of MCA</option>
                                            <option value="DEPARTMENT OF COMPUTER SCIENCE (CS)">Dept. of CS</option>
                                            <option value="DEPARTMENT OF ELECTRONICS & COMMUNICATION (ECE)">Dept. of ECE</option>
                                            <option value="OTHER">-- Type Manually --</option>
                                        </select>
                                        {formData.headerDepartment === 'OTHER' && (
                                            <Input placeholder="Type Department Name" value={customDeptInput} onChange={(e) => setCustomDeptInput(e.target.value)} className="mt-2" />
                                        )}
                                    </div>
                                    
                                    <div className="flex items-end pb-2">
                                        <div className="flex items-center space-x-2 border p-2 rounded-md w-full bg-muted/20 h-10 border-input">
                                            <input type="checkbox" id="isPublic" checked={formData.isPublic} onChange={(e) => setFormData({...formData, isPublic: e.target.checked})} className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 accent-primary" />
                                            <Label htmlFor="isPublic" className="cursor-pointer font-medium text-foreground mb-0">Make Event Public?</Label>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. SIGNATURE AND LOGO (Existing) */}
                                <div className="space-y-2">
                                    <Label className="flex items-center justify-between">
                                        <span className="flex items-center gap-2"><PenTool className="h-4 w-4" /> Digital Signature</span>
                                    </Label>
                                    <div className="relative rounded-md border-2 border-dashed border-input bg-white overflow-hidden h-40">
                                        <SignatureCanvas ref={sigPadRef} penColor="black" canvasProps={{ className: 'w-full h-full cursor-crosshair relative z-10' }} />
                                    </div>
                                    <Input type="file" accept="image/png" onChange={(e) => handleImageUpload(e, setSignatureImage)} className="text-xs" />
                                </div>

                            </div>

                            <Button onClick={handleCreateEvent} className="w-full" disabled={isCreating}>
                                {isCreating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>) : ("Confirm & Create Event")}
                            </Button>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* --- EVENT LIST TABLE --- */}
                <Card className="shadow-lg">
                    {/* ... (Table Header and Content) ... */}
                    <CardHeader>
                        <CardTitle>Existing Events</CardTitle>
                        <div className="relative pt-4">
                            <Input placeholder="Search events..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            <Search className="absolute left-3 top-6 h-5 w-5 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Participants</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingData ? (
                                        <TableSkeleton columns={5} rows={5} />
                                    ) : filteredEvents.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{searchTerm ? "No matching events." : "No events found."}</TableCell></TableRow>
                                    ) : (
                                        filteredEvents.map((event) => {
                                            const isLoading = issueLoading === event._id;
                                            
                                            return (
                                                <TableRow key={event._id}>
                                                    <TableCell className="font-medium">{event.name}</TableCell>
                                                    <TableCell>
                                                         <div className='flex flex-col'>
                                                            <span>{new Date(event.date).toLocaleDateString()}</span>
                                                            <span className='text-xs text-muted-foreground'>{event.startTime} - {event.endTime}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{event.participants?.length || 0}</TableCell>
                                                    <TableCell>
                                                        {!event.isComplete ? ( 
                                                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                                                                <Clock className='h-3 w-3 mr-1'/> Upcoming
                                                            </span>
                                                        ) : (
                                                            <Button
                                                                onClick={() => handleIssueCertificates(event)}
                                                                variant={event.certificatesIssued ? "outline" : "default"}
                                                                size="sm"
                                                                disabled={isLoading}
                                                                className={event.certificatesIssued 
                                                                    ? "text-green-600 border-green-600 hover:text-green-700" 
                                                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                                                }
                                                            >
                                                                {isLoading ? 'Issuing...' : (event.certificatesIssued ? 'Issue to New' : 'Issue All')}
                                                            </Button>
                                                        )}
                                                        {issueMessage.id === event._id && <div className="text-xs text-green-600 mt-1">✅ {issueMessage.text}</div>}
                                                        {issueError.id === event._id && <div className="text-xs text-red-600 mt-1">⚠️ {issueError.text}</div>}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleViewParticipants(event)}>View Participants List</DropdownMenuItem>
                                                                
                                                                <DropdownMenuItem onClick={() => handleViewAttendance(event)}>
                                                                    <MapPin className="mr-2 h-4 w-4" /> View Attendance Report
                                                                </DropdownMenuItem>
                                                                
                                                                <DropdownMenuItem onClick={() => handleGenerateQR(event)}>
                                                                    <QrCode className="mr-2 h-4 w-4" /> Show Check-In QR
                                                                </DropdownMenuItem>
                                                                
                                                                <DropdownMenuItem onClick={() => copyToClipboard(event)}>Copy Public Link</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* --- MODALS --- */}
                <ParticipantsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
                <AttendanceModal event={attendanceEvent} onClose={() => setAttendanceEvent(null)} />
                
                <Dialog open={isQROpen} onOpenChange={setIsQROpen}>
                    <DialogContent className="sm:max-w-md text-center">
                        <DialogHeader>
                            <DialogTitle>Event Check-In QR</DialogTitle>
                            <DialogDescription>Scan to verify attendance and mint POAP.</DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                            {qrData.img ? (
                                <img src={qrData.img} alt="QR Code" className="w-64 h-64 border rounded-lg p-2 bg-white shadow-sm" />
                            ) : (
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            )}
                            <div className="w-full">
                                <Label className="mb-2 block text-left">Check-In Link</Label>
                                <div className="flex items-center gap-2">
                                    <Input value={qrData.url} readOnly className="bg-muted text-xs font-mono" />
                                    <Button size="icon" variant="outline" onClick={() => {
                                        navigator.clipboard.writeText(qrData.url);
                                        alert("Copied!");
                                    }}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}

export default EventManagementPage;