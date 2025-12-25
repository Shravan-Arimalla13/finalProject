import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import ParticipantsModal from '../components/ParticipantsModal';
import AttendanceModal from '../components/AttendanceModal'; 
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/TableSkeleton'; 
import { Input } from "@/components/ui/input";

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // Fixed: Import Badge to prevent ReferenceError
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  MoreHorizontal, Search, PenTool, RefreshCcw, Loader2, QrCode, 
  Copy, MapPin, Clock, CheckCircle2, Award, Users, UserCheck 
} from "lucide-react"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    const [qrData, setQrData] = useState({ img: null, url: '', expiresAt: null, eventId: null });

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
        if (user && user.role === 'Faculty' && user.department) {
            const formalDept = `DEPARTMENT OF ${user.department.toUpperCase()}`; 
            setFormData(prev => ({ ...prev, headerDepartment: formalDept }));
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
            location: { ...prev.location, [field]: value }
        }));
    };

    const setLocationToCurrent = () => {
        setIsGpsLoading(true);
        if (!navigator.geolocation) {
            alert("Geolocation not supported.");
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
                        address: `GPS Venue (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})` 
                    }
                }));
                setIsGpsLoading(false);
            },
            () => {
                alert("Location Capture Failed.");
                setIsGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    const handleCreateEvent = async () => {
        if (isCreating) return; 
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
        } catch (err) {
            alert(err.response?.data?.message || "Failed to create event");
        } finally {
            setIsCreating(false); 
        }
    };

    const handleGenerateQR = async (event) => {
        try {
            const res = await api.post(`/poap/event/${event._id}/qr`); //
            setQrData({ 
                img: res.data.qrCode, 
                url: res.data.checkInUrl,
                expiresAt: res.data.expiresAt, //
                eventId: event._id
            });
            setIsQROpen(true); 
        } catch (e) {
            alert("Failed to generate QR code.");
        }
    };

    const handleIssuanceChoice = (event, type) => {
        if (!window.confirm("Confirm issuance?")) return;
        setIssueLoading(event._id);
        api.post(`/certificates/issue/event/${event._id}?issueType=${type}`) 
           .then(response => {
                setIssueMessage({ id: event._id, text: response.data.message });
                fetchEvents();
           })
           .catch(() => setIssueError({ id: event._id, text: "Issuance Failed." }))
           .finally(() => setIssueLoading(null));
    };

    const filteredEvents = events.filter(event => event.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="min-h-screen bg-muted/40 p-4 md:p-8">
            <div className="max-w-7xl mx-auto text-foreground">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Event Management</h1>
                    
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

                                <Card className="p-4 bg-muted/20 border-l-4 border-l-indigo-500">
                                    <CardContent className="p-0 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label><Clock className="h-4 w-4 inline mr-1" /> Start Time</Label>
                                                <Input type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>End Time</Label>
                                                <Input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="space-y-2 border-t pt-3">
                                            <Label><MapPin className="h-4 w-4 inline mr-1" /> Physical Check-In Venue</Label>
                                            <div className="flex gap-2 items-center">
                                                <Input 
                                                    placeholder="Venue Address" 
                                                    value={formData.location.address}
                                                    onChange={(e) => handleLocationChange('address', e.target.value)}
                                                />
                                                <Button onClick={setLocationToCurrent} disabled={isGpsLoading} variant="secondary">
                                                    {isGpsLoading ? <Loader2 className="animate-spin" /> : <MapPin className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><PenTool className="h-4 w-4" /> Digital Signature</Label>
                                    <div className="relative rounded-md border-2 border-dashed border-input bg-white h-40">
                                        <SignatureCanvas ref={sigPadRef} penColor="black" canvasProps={{ className: 'w-full h-full' }} />
                                    </div>
                                    <Input type="file" accept="image/png" onChange={(e) => handleImageUpload(e, setSignatureImage)} />
                                </div>
                            </div>

                            <Button onClick={handleCreateEvent} className="w-full" disabled={isCreating}>
                                {isCreating ? "Creating..." : "Confirm & Create Event"}
                            </Button>
                        </DialogContent>
                    </Dialog>
                </div>

                <Dialog open={isQROpen} onOpenChange={setIsQROpen}>
                    <DialogContent className="sm:max-w-md text-center text-foreground">
                        <DialogHeader>
                            <DialogTitle>Event Check-In QR</DialogTitle>
                            <DialogDescription>Scan to verify attendance. Dynamic expiry active.</DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                            {qrData.img ? (
                                <>
                                    <img src={qrData.img} alt="QR Code" className="w-64 h-64 border rounded-lg p-2 bg-white" />
                                    {/* Timer Component */}
                                    <QRTimer expiresAt={qrData.expiresAt} /> 
                                </>
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
                            <Button variant="ghost" size="sm" onClick={() => handleGenerateQR({_id: qrData.eventId})}>
                                <RefreshCcw className="h-3 w-3 mr-2" /> Regenerate if Expired
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Existing Events</CardTitle>
                        <div className="relative pt-4">
                            <Input placeholder="Search..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingData ? (
                                        <TableSkeleton columns={4} rows={5} />
                                    ) : filteredEvents.map((event) => (
                                        <TableRow key={event._id}>
                                            <TableCell className="font-medium">{event.name}</TableCell>
                                            <TableCell>
                                                <div className='flex flex-col'>
                                                    <span>{new Date(event.date).toLocaleDateString()}</span>
                                                    <span className='text-xs text-muted-foreground'>{event.startTime} - {event.endTime}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {!event.isComplete ? ( 
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                        <Clock className='h-3 w-3 mr-1'/> Upcoming
                                                    </Badge>
                                                ) : event.certificatesIssued ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700">Issued</Badge>
                                                ) : (
                                                    <Button size="sm" onClick={() => handleIssuanceChoice(event, 'attended')}>Issue Certificates</Button>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setAttendanceEvent(event)}>Attendance Report</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleGenerateQR(event)}>Show QR</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <ParticipantsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
                <AttendanceModal event={attendanceEvent} onClose={() => setAttendanceEvent(null)} />
            </div>
        </div>
    );
}

// --- STANDALONE TIMER COMPONENT ---
// Fixed: Using React.useState/useEffect for standalone scope
const QRTimer = ({ expiresAt }) => {
    const [timeLeft, setTimeLeft] = React.useState("");

    React.useEffect(() => {
        if (!expiresAt) return;
        const timer = setInterval(() => {
            const diff = new Date(expiresAt) - new Date();
            if (diff <= 0) {
                setTimeLeft("EXPIRED");
                clearInterval(timer);
            } else {
                const mins = Math.floor((diff / 1000 / 60) % 60);
                const secs = Math.floor((diff / 1000) % 60);
                setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [expiresAt]);

    return (
        <div className={`mt-2 font-mono font-bold text-lg p-3 rounded-lg border ${
            timeLeft === "EXPIRED" ? "text-red-600 bg-red-50 border-red-200" : "text-blue-600 bg-blue-50 border-blue-100"
        }`}>
            <div className="text-[10px] uppercase opacity-60">QR Validity Window</div>
            {timeLeft === "EXPIRED" ? "⚠️ EXPIRED" : `⏳ ${timeLeft}`}
        </div>
    );
};

export default EventManagementPage;