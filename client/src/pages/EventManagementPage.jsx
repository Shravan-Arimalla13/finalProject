// In client/src/pages/EventManagementPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import api from '../api.js';

import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '../context/AuthContext.jsx';
import ParticipantsModal from '../components/ParticipantsModal';
import { TableSkeleton } from '../components/TableSkeleton';
// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MoreHorizontal, Search, PenTool, RefreshCcw } from "lucide-react"; 
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
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [issueLoading, setIssueLoading] = useState(null);
    const [issueMessage, setIssueMessage] = useState({ id: null, text: null });
    const [issueError, setIssueError] = useState({ id: null, text: null });

    // --- CREATE FORM STATE ---
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '', date: '', description: '',
        collegeName: 'K. S. Institute of Technology', 
        customSignatureText: 'Authorized Signature',
        headerDepartment: '', // Default empty, will be set by logic below
        certificateTitle: 'CERTIFICATE OF PARTICIPATION',
        eventType: 'Workshop',
        eventDuration: '',
        isPublic: false 
    });

    // Custom Input State
    const [customDeptInput, setCustomDeptInput] = useState('');
    const [customTitleInput, setCustomTitleInput] = useState('');

    // Image State
    const [logoImage, setLogoImage] = useState(null); 
    const [signatureImage, setSignatureImage] = useState(null); 
    const sigPadRef = useRef({});

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => { fetchEvents(); }, []);

    // --- SMART DEPARTMENT LOGIC ---
    useEffect(() => {
        if (user) {
            if (user.role === 'Faculty' && user.department) {
                // FACULTY: Auto-fill their department for convenience
                const formalDept = `DEPARTMENT OF ${user.department.toUpperCase()}`; 
                setFormData(prev => ({ ...prev, headerDepartment: formalDept }));
            } else if (user.role === 'SuperAdmin') {
                // SUPERADMIN: Default to "Manual" mode so they can type any department
                setFormData(prev => ({ ...prev, headerDepartment: 'OTHER' }));
            }
        }
    }, [user]);

    const fetchEvents = async () => {
        try {
            const response = await api.get('/events');
            setEvents(response.data);
            
            // Pre-load defaults from latest event
            if (response.data.length > 0) {
                const latest = response.data.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b));
                if (latest.certificateConfig) {
                    setLogoImage(latest.certificateConfig.collegeLogo || null);
                    setSignatureImage(latest.certificateConfig.signatureImage || null);
                }
            }
        } catch (err) { console.error("Failed to fetch events"); }
    };

    const handleImageUpload = (e, setFunction) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFunction(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const clearSig = () => {
        if (sigPadRef.current) {
            sigPadRef.current.clear();
        }
        setSignatureImage(null); 
    };

    const handleCreateEvent = async () => {
        if (!formData.name || !formData.date) {
            alert("Please fill in the Event Name and Date.");
            return;
        }

        // Determine final values (Dropdown vs Custom Input)
        const finalDept = formData.headerDepartment === 'OTHER' ? customDeptInput : formData.headerDepartment;
        const finalTitle = formData.certificateTitle === 'OTHER' ? customTitleInput : formData.certificateTitle;

        let finalSignature = signatureImage;
        if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
            finalSignature = sigPadRef.current.getCanvas().toDataURL('image/png');
        }

        try {
            await api.post('/events', {
                name: formData.name,
                date: formData.date,
                description: formData.description,
                isPublic: formData.isPublic, 
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
            
            // Reset Text Fields
            setFormData(prev => ({ 
                ...prev, name: '', date: '', description: '', eventType: '', eventDuration: '', isPublic: false
            }));
            // We keep the headerDepartment logic as-is (Auto or Manual) for the next event
            
        } catch (err) {
            alert(err.response?.data?.message || "Failed to create event");
        }
    };

    const handleIssueCertificates = async (event) => {
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
                                <DialogDescription>Customize the details and branding.</DialogDescription>
                            </DialogHeader>
                            
                            <div className="grid gap-6 py-4">
                                {/* 1. Event Details */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Event Name</Label>
                                        <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date</Label>
                                        <Input type="date" min={today} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                                </div>

                                <hr className="border-border my-2" />
                                <h3 className="font-semibold text-foreground">Certificate Details</h3>
                                
                                {/* 2. Department Selection (Smart Logic) */}
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
                                        {/* Show input if "Other" is selected (Default for SuperAdmin) */}
                                        {formData.headerDepartment === 'OTHER' && (
                                            <Input 
                                                placeholder="Type Department Name (e.g., DEPARTMENT OF CIVIL ENG)" 
                                                value={customDeptInput}
                                                onChange={(e) => setCustomDeptInput(e.target.value)}
                                                className="mt-2"
                                            />
                                        )}
                                    </div>
                                    
                                    {/* Public Checkbox */}
                                    <div className="flex items-end pb-2">
                                        <div className="flex items-center space-x-2 border p-2 rounded-md w-full bg-muted/20 h-10 border-input">
                                            <input 
                                                type="checkbox" 
                                                id="isPublic" 
                                                checked={formData.isPublic}
                                                onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 accent-primary"
                                            />
                                            <Label htmlFor="isPublic" className="cursor-pointer font-medium text-foreground mb-0">
                                                Make Event Public?
                                            </Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Certificate Title</Label>
                                        <select 
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={formData.certificateTitle}
                                            onChange={(e) => setFormData({...formData, certificateTitle: e.target.value})}
                                        >
                                            <option>CERTIFICATE OF PARTICIPATION</option>
                                            <option>CERTIFICATE OF ACHIEVEMENT</option>
                                            <option>CERTIFICATE OF APPRECIATION</option>
                                            <option value="OTHER">-- Type Manually --</option>
                                        </select>
                                        {formData.certificateTitle === 'OTHER' && (
                                            <Input 
                                                placeholder="Type custom Title..." 
                                                value={customTitleInput}
                                                onChange={(e) => setCustomTitleInput(e.target.value)}
                                                className="mt-2"
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Event Type</Label>
                                        <Input value={formData.eventType} onChange={(e) => setFormData({...formData, eventType: e.target.value})} placeholder="Workshop" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Duration (Optional)</Label>
                                    <Input value={formData.eventDuration} onChange={(e) => setFormData({...formData, eventDuration: e.target.value})} placeholder="3 Days" />
                                </div>

                                <hr className="border-border my-2" />
                                <h3 className="font-semibold text-foreground">Branding & Signature</h3>

                                {/* 3. Branding */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>College Name</Label>
                                        <Input value={formData.collegeName} onChange={(e) => setFormData({...formData, collegeName: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>College Logo</Label>
                                        <div className="flex gap-2">
                                            <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setLogoImage)} />
                                        </div>
                                        {logoImage && (
                                            <div className="mt-2 relative w-fit">
                                                <img src={logoImage} alt="Logo" className="h-12 object-contain bg-white rounded p-1 border" />
                                                <div className="text-[10px] text-muted-foreground mt-1">Loaded</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 4. Signature */}
                                <div className="space-y-2">
                                    <Label className="flex items-center justify-between">
                                        <span className="flex items-center gap-2"><PenTool className="h-4 w-4" /> Digital Signature</span>
                                        <span className="text-xs text-muted-foreground font-normal">Draw below OR upload PNG</span>
                                    </Label>
                                    
                                    <div className="relative rounded-md border-2 border-dashed border-input bg-white overflow-hidden h-40">
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            {signatureImage ? (
                                                <img src={signatureImage} alt="Signature" className="h-full object-contain opacity-50" />
                                            ) : (
                                                <span className="text-slate-200 text-sm font-semibold tracking-widest uppercase">Sign Here</span>
                                            )}
                                        </div>
                                        
                                        <SignatureCanvas 
                                            ref={sigPadRef}
                                            penColor="black"
                                            canvasProps={{ className: 'w-full h-full cursor-crosshair relative z-10' }} 
                                        />
                                        
                                        <Button 
                                            variant="secondary" size="sm" 
                                            className="absolute top-2 right-2 text-xs z-20 opacity-80 hover:opacity-100" 
                                            onClick={clearSig}
                                        >
                                            <RefreshCcw className="h-3 w-3 mr-1"/> Clear
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2">
                                        <Input type="file" accept="image/png" onChange={(e) => handleImageUpload(e, setSignatureImage)} className="text-xs" />
                                    </div>

                                    <div className="mt-2">
                                        <Label>Signer Title</Label>
                                        <Input value={formData.customSignatureText} onChange={(e) => setFormData({...formData, customSignatureText: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <Button onClick={handleCreateEvent} className="w-full">Confirm & Create Event</Button>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* --- EVENT LIST TABLE --- */}
                <Card className="shadow-lg">
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
                                        <TableHead>Date</TableHead>
                                        <TableHead>Participants</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEvents.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{searchTerm ? "No matching events." : "No events found."}</TableCell></TableRow>
                                    ) : (
                                        filteredEvents.map((event) => {
                                            const isLoading = issueLoading === event._id;
                                            const eventDate = new Date(event.date);
                                            const today = new Date();
                                            eventDate.setHours(0, 0, 0, 0);
                                            today.setHours(0, 0, 0, 0);
                                            const isFutureEvent = eventDate.getTime() > today.getTime();

                                            return (
                                                <TableRow key={event._id}>
                                                    <TableCell className="font-medium">{event.name}</TableCell>
                                                    <TableCell>{new Date(event.date).toLocaleDateString()}</TableCell>
                                                    <TableCell>{event.participants?.length || 0}</TableCell>
                                                    <TableCell>
                                                        {isFutureEvent ? (
                                                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                                                                Upcoming
                                                            </span>
                                                        ) : (
                                                            <Button
                                                                onClick={() => handleIssueCertificates(event)}
                                                                variant={event.certificatesIssued ? "outline" : "default"}
                                                                size="sm"
                                                                disabled={isLoading}
                                                                className={event.certificatesIssued 
                                                                    ? "text-green-600 border-green-600 hover:text-green-700 dark:hover:bg-green-900/20" 
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
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => handleViewParticipants(event)}>View Participants</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => copyToClipboard(event)}>Copy Link</DropdownMenuItem>
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
                <ParticipantsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            </div>
        </div>
    );
}

export default EventManagementPage;