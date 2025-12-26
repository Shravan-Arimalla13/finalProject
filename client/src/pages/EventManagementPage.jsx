import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import ParticipantsModal from '../components/ParticipantsModal';
import AttendanceModal from '../components/AttendanceModal';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/TableSkeleton';
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';

// --- SHADCN IMPORTS ---
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { 
  MoreHorizontal, Search, PenTool, RefreshCcw, Loader2, QrCode, Copy, 
  MapPin, Clock, CheckCircle2, Award, Users, UserCheck, Filter, 
  Calendar, Eye, Trash2, AlertCircle, Sparkles, Plus, X 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

// --- FILTER COMPONENT ---
const EventFilter = ({ activeFilter, onFilterChange, stats }) => {
  const filters = [
    { id: 'all', label: 'All Events', count: stats.all, color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
    { id: 'ongoing', label: 'Live Now', count: stats.ongoing, color: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { id: 'upcoming', label: 'Upcoming', count: stats.upcoming, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { id: 'completed', label: 'Completed', count: stats.completed, color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(filter => (
        <Button
          key={filter.id}
          variant={activeFilter === filter.id ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.id)}
          className={activeFilter === filter.id ? '' : filter.color}
        >
          <Filter className="h-3 w-3 mr-1" />
          {filter.label}
          <Badge variant="secondary" className="ml-2">{filter.count}</Badge>
        </Button>
      ))}
    </div>
  );
};

// --- SIGNATURE PAD COMPONENT ---
const SignaturePad = ({ sigPadRef, onClear, onPreview, currentSignature }) => {
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      setShowPreview(true);
      onPreview(sigPadRef.current.getCanvas().toDataURL('image/png'));
    } else {
      toast.error("Signature pad is empty");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-semibold">
          <PenTool className="h-4 w-4 text-blue-600" />
          Digital Signature
        </Label>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={handlePreview}>
            <Eye className="h-3 w-3 mr-1" /> Preview
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <RefreshCcw className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>
      </div>
      
      <div className="relative rounded-lg border-2 border-dashed border-input bg-white overflow-hidden h-40 group">
        <SignatureCanvas 
          ref={sigPadRef}
          penColor="black"
          canvasProps={{ 
            className: 'w-full h-full cursor-crosshair relative z-10'
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
          <PenTool className="h-12 w-12 text-gray-400" />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3 w-3" />
        <span>Sign above or upload an image below</span>
      </div>

      <Input 
        type="file" 
        accept="image/png,image/jpeg" 
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => onPreview(reader.result);
            reader.readAsDataURL(file);
          }
        }}
        className="text-xs"
      />

      {/* Preview Modal */}
      {showPreview && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Signature Preview</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border">
              {currentSignature && (
                <img src={currentSignature} alt="Signature Preview" className="w-full h-32 object-contain" />
              )}
            </div>
            <Button className="w-full mt-4" onClick={() => setShowPreview(false)}>
              Looks Good
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
function EventManagementPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [attendanceEvent, setAttendanceEvent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [filterStats, setFilterStats] = useState({ all: 0, ongoing: 0, upcoming: 0, completed: 0 });
    
    const [issueLoading, setIssueLoading] = useState(null);
    const [issueMessage, setIssueMessage] = useState({ id: null, text: null });
    const [issueError, setIssueError] = useState({ id: null, text: null });

    const [isQROpen, setIsQROpen] = useState(false);
    const [qrData, setQrData] = useState({ img: null, url: '' });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isGpsLoading, setIsGpsLoading] = useState(false);
    const [currentTab, setCurrentTab] = useState("details");
    const [signaturePreview, setSignaturePreview] = useState(null);
    
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

    // Calculate event status
    const calculateEventStatus = (eventDate, startTime, endTime) => {
        const now = new Date();
        const eventDateStr = new Date(eventDate).toISOString().split('T')[0];
        const start = new Date(`${eventDateStr}T${startTime}:00`);
        const end = new Date(`${eventDateStr}T${endTime}:00`);
        
        if (now > end) return 'Completed';
        if (now >= start && now <= end) return 'Ongoing';
        return 'Upcoming';
    };

    const fetchEvents = async () => {
        setIsLoadingData(true);
        try {
            const response = await api.get('/events');
            const eventsWithStatus = response.data.map(event => ({
                ...event,
                calculatedStatus: calculateEventStatus(event.date, event.startTime, event.endTime)
            }));
            
            setEvents(eventsWithStatus);
            
            // Calculate stats
            const stats = {
                all: eventsWithStatus.length,
                ongoing: eventsWithStatus.filter(e => e.calculatedStatus === 'Ongoing').length,
                upcoming: eventsWithStatus.filter(e => e.calculatedStatus === 'Upcoming').length,
                completed: eventsWithStatus.filter(e => e.calculatedStatus === 'Completed').length
            };
            setFilterStats(stats);
            
            // Load latest signature
            if (eventsWithStatus.length > 0) {
                const latest = eventsWithStatus.reduce((a, b) => 
                    (new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
                );
                if (latest.certificateConfig) {
                    setLogoImage(latest.certificateConfig.collegeLogo || null);
                    setSignatureImage(latest.certificateConfig.signatureImage || null);
                }
            }
        } catch (err) { 
            console.error("Failed to fetch events");
            toast.error("Failed to load events");
        } finally {
            setIsLoadingData(false);
        }
    };

    // Filter events
    useEffect(() => {
        let filtered = events;

        // Apply status filter
        if (activeFilter !== 'all') {
            filtered = filtered.filter(e => 
                e.calculatedStatus.toLowerCase() === activeFilter.toLowerCase()
            );
        }

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(e =>
                e.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredEvents(filtered);
    }, [events, activeFilter, searchTerm]);

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
            toast.error("Geolocation not supported");
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
                toast.success("Location captured successfully");
            },
            () => {
                toast.error("Failed to capture location");
                setIsGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    const clearSig = () => {
        if (sigPadRef.current) sigPadRef.current.clear();
        setSignatureImage(null);
        setSignaturePreview(null);
    };

    const handleCreateEvent = async () => {
        if (isCreating) return;

        if (!formData.name || !formData.date || !formData.startTime || !formData.endTime) {
            toast.error("Please fill in all required fields");
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
            toast.success("Event created successfully");
            
            // Reset form
            setFormData(prev => ({ 
                ...prev, 
                name: '', 
                date: '', 
                description: '', 
                eventType: '', 
                eventDuration: '', 
                isPublic: false
            }));
            clearSig();
            
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create event");
        } finally {
            setIsCreating(false);
        }
    };

    const handleIssuanceChoice = (event, type) => {
        const confirmMessage = type === 'attended' 
            ? `Issue certificates ONLY to participants who checked in via POAP?`
            : `Issue certificates to ALL ${event.participants.length} registered students?`;

        if (!window.confirm(confirmMessage)) return;

        setIssueLoading(event._id);
        setIssueMessage({ id: null, text: null });
        setIssueError({ id: null, text: null });

        api.post(`/certificates/issue/event/${event._id}?issueType=${type}`)
           .then(response => {
                const responseMessage = response.data.errors?.length > 0 
                    ? `${response.data.message} (${response.data.errors.length} failed).`
                    : response.data.message;

                setIssueMessage({ id: event._id, text: responseMessage });
                fetchEvents();
                toast.success(responseMessage);
           })
           .catch(err => {
                const errorMsg = err.response?.data?.message || 'Issuance Failed.';
                setIssueError({ id: event._id, text: errorMsg });
                toast.error(errorMsg);
           })
           .finally(() => {
                setIssueLoading(null);
           });
    };

    const handleIssueCertificates = (event) => {
        if (!window.confirm(`Issue certificates to remaining participants?`)) return;

        setIssueLoading(event._id);
        setIssueMessage({ id: null, text: null });
        setIssueError({ id: null, text: null });
        
        api.post(`/certificates/issue/event/${event._id}`)
           .then(response => {
                setIssueMessage({ id: event._id, text: response.data.message });
                fetchEvents();
                toast.success(response.data.message);
           })
           .catch(err => {
                const errorMsg = err.response?.data?.message || 'Issuance Failed.';
                setIssueError({ id: event._id, text: errorMsg });
                toast.error(errorMsg);
           })
           .finally(() => {
                setIssueLoading(null);
           });
    };

    const handleViewParticipants = (event) => setSelectedEvent(event);
    const handleViewAttendance = (event) => setAttendanceEvent(event);
    
    const handleGenerateQR = async (event) => {
        try {
            setQrData({ img: null, url: '' });
            const res = await api.get(`/poap/event/${event._id}/qr`);
            setQrData({ img: res.data.qrCode, url: res.data.checkInUrl });
            setIsQROpen(true);
            toast.success('QR Code Generated');
        } catch (error) {
            toast.error(error.response?.data?.message || 'QR generation failed');
        }
    };

    const copyToClipboard = (event) => {
        const publicUrl = `${window.location.origin}/event/${event._id}`;
        navigator.clipboard.writeText(publicUrl);
        toast.success('Link copied to clipboard');
    };

    const getStatusBadge = (status) => {
        const styles = {
            'Ongoing': 'bg-green-100 text-green-700 border-green-300 animate-pulse',
            'Upcoming': 'bg-blue-100 text-blue-700 border-blue-300',
            'Completed': 'bg-gray-100 text-gray-700 border-gray-300'
        };
        
        const icons = {
            'Ongoing': <Sparkles className="h-3 w-3 mr-1" />,
            'Upcoming': <Clock className="h-3 w-3 mr-1" />,
            'Completed': <CheckCircle2 className="h-3 w-3 mr-1" />
        };

        return (
            <Badge variant="outline" className={styles[status]}>
                {icons[status]}
                {status}
            </Badge>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/20 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex justify-between items-center mb-6"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                            <Calendar className="h-8 w-8 text-blue-600" />
                            Event Management
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Create and manage events with blockchain certificates
                        </p>
                    </div>
                    
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="gap-2">
                                <Plus className="h-5 w-5" />
                                Create Event
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-2xl">Create New Event</DialogTitle>
                                <DialogDescription>
                                    Configure event details and certificate design
                                </DialogDescription>
                            </DialogHeader>
                            
                            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="details">Event Details</TabsTrigger>
                                    <TabsTrigger value="location">Time & Location</TabsTrigger>
                                    <TabsTrigger value="certificate">Certificate Design</TabsTrigger>
                                </TabsList>

                                <TabsContent value="details" className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Event Name *</Label>
                                            <Input 
                                                placeholder="e.g., Web Development Workshop"
                                                value={formData.name} 
                                                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Event Date *</Label>
                                            <Input 
                                                type="date" 
                                                min={today} 
                                                value={formData.date} 
                                                onChange={(e) => setFormData({...formData, date: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea 
                                            placeholder="Describe the event..."
                                            value={formData.description} 
                                            onChange={(e) => setFormData({...formData, description: e.target.value})} 
                                            rows={4}
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2 p-4 rounded-lg border bg-muted/20">
                                        <input 
                                            type="checkbox" 
                                            id="isPublic" 
                                            checked={formData.isPublic} 
                                            onChange={(e) => setFormData({...formData, isPublic: e.target.checked})} 
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <Label htmlFor="isPublic" className="cursor-pointer font-medium">
                                            Make this event publicly visible
                                        </Label>
                                    </div>
                                </TabsContent>

                                <TabsContent value="location" className="space-y-4 pt-4">
                                    <Card className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-200">
                                        <CardContent className="p-0 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-indigo-600" /> Start Time *
                                                    </Label>
                                                    <Input 
                                                        type="time" 
                                                        value={formData.startTime} 
                                                        onChange={(e) => setFormData({...formData, startTime: e.target.value})} 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>End Time *</Label>
                                                    <Input 
                                                        type="time" 
                                                        value={formData.endTime} 
                                                        onChange={(e) => setFormData({...formData, endTime: e.target.value})} 
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2 border-t pt-3">
                                                <Label className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-indigo-600" /> Physical Venue
                                                </Label>
                                                
                                                <div className="flex gap-2 items-center">
                                                    <Input 
                                                        placeholder="Venue Address (e.g., Seminar Hall A)" 
                                                        value={formData.location.address}
                                                        onChange={(e) => handleLocationChange('address', e.target.value)}
                                                        className="flex-1"
                                                    />
                                                    <Button 
                                                        type="button" 
                                                        onClick={setLocationToCurrent} 
                                                        disabled={isGpsLoading} 
                                                        variant="secondary"
                                                    >
                                                        {isGpsLoading ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <MapPin className="h-4 w-4" />
                                                        )}
                                                        Capture GPS
                                                    </Button>
                                                </div>

                                                {formData.location.latitude && (
                                                    <motion.p 
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="text-xs text-green-600 flex items-center gap-1"
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" /> 
                                                        GPS Set: {formData.location.latitude.toFixed(4)}, {formData.location.longitude.toFixed(4)}
                                                    </motion.p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="certificate" className="space-y-4 pt-4">
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
                                                <Input 
                                                    placeholder="Type Department Name" 
                                                    value={customDeptInput} 
                                                    onChange={(e) => setCustomDeptInput(e.target.value)} 
                                                    className="mt-2" 
                                                />
                                            )}
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label>Event Type</Label>
                                            <select 
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={formData.eventType}
                                                onChange={(e) => setFormData({...formData, eventType: e.target.value})}
                                            >
                                                <option value="Workshop">Workshop</option>
                                                <option value="Seminar">Seminar</option>
                                                <option value="Hackathon">Hackathon</option>
                                                <option value="Conference">Conference</option>
                                            </select>
                                        </div>
                                    </div>

                                    <SignaturePad 
                                        sigPadRef={sigPadRef}
                                        onClear={clearSig}
                                        onPreview={setSignaturePreview}
                                        currentSignature={signaturePreview}
                                    />
                                </TabsContent>
                            </Tabs>

                            <div className="flex gap-2 pt-4 border-t">
                                {currentTab !== "details" && (
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={() => {
                                            const tabs = ["details", "location", "certificate"];
                                            const currentIndex = tabs.indexOf(currentTab);
                                            if (currentIndex > 0) setCurrentTab(tabs[currentIndex - 1]);
                                        }}
                                    >
                                        Previous
                                    </Button>
                                )}
                                
                                {currentTab !== "certificate" ? (
                                    <Button 
                                        type="button" 
                                        className="ml-auto"
                                        onClick={() => {
                                            const tabs = ["details", "location", "certificate"];
                                            const currentIndex = tabs.indexOf(currentTab);
                                            if (currentIndex < tabs.length - 1) setCurrentTab(tabs[currentIndex + 1]);
                                        }}
                                    >
                                        Next
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={handleCreateEvent} 
                                        className="ml-auto gap-2" 
                                        disabled={isCreating}
                                    >
                                        {isCreating ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4" />
                                                Create Event
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </motion.div>

                {/* Filters and Search */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6 space-y-4"
                >
                    <EventFilter 
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                        stats={filterStats}
                    />
                    
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search events..." 
                            className="pl-10 h-12" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                </motion.div>

                {/* Event List */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="shadow-xl border-t-4 border-t-blue-500">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Events ({filteredEvents.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
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
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                        <Calendar className="h-12 w-12 opacity-20" />
                                                        <p className="text-lg font-medium">
                                                            {searchTerm ? "No matching events found" : "No events in this category"}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <AnimatePresence>
                                                {filteredEvents.map((event, index) => (
                                                    <motion.tr
                                                        key={event._id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className="hover:bg-muted/50 transition-colors"
                                                    >
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                                                    {event.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold">{event.name}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {event.department}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">
                                                                    {new Date(event.date).toLocaleDateString()}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {event.startTime} - {event.endTime}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="font-mono">
                                                                {event.participants?.length || 0}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-2">
                                                                {getStatusBadge(event.calculatedStatus)}
                                                                
                                                                {event.calculatedStatus === 'Completed' && (
                                                                    event.certificatesIssued ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                                                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                                Issued
                                                                            </Badge>
                                                                            <Button
                                                                                onClick={() => handleIssueCertificates(event)}
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="text-xs h-6"
                                                                                disabled={issueLoading === event._id}
                                                                            >
                                                                                Issue Remaining
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button 
                                                                                    size="sm" 
                                                                                    className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                                                                    disabled={issueLoading === event._id}
                                                                                >
                                                                                    {issueLoading === event._id ? (
                                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                                    ) : (
                                                                                        <Award className="h-3 w-3" />
                                                                                    )}
                                                                                    Issue
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                <DropdownMenuLabel className="text-xs">
                                                                                    Choose Target
                                                                                </DropdownMenuLabel>
                                                                                <DropdownMenuItem 
                                                                                    onClick={() => handleIssuanceChoice(event, 'attended')}
                                                                                    className="gap-2"
                                                                                >
                                                                                    <UserCheck className="h-4 w-4 text-green-600" />
                                                                                    Only Attended (POAP)
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem 
                                                                                    onClick={() => handleIssuanceChoice(event, 'all')}
                                                                                    className="gap-2"
                                                                                >
                                                                                    <Users className="h-4 w-4 text-blue-600" />
                                                                                    All Registered
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    )
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                    <DropdownMenuItem 
                                                                        onClick={() => handleViewParticipants(event)}
                                                                        className="gap-2"
                                                                    >
                                                                        <Users className="h-4 w-4" />
                                                                        View Participants
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem 
                                                                        onClick={() => handleViewAttendance(event)}
                                                                        className="gap-2"
                                                                    >
                                                                        <MapPin className="h-4 w-4" />
                                                                        View Attendance
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem 
                                                                        onClick={() => handleGenerateQR(event)}
                                                                        className="gap-2"
                                                                    >
                                                                        <QrCode className="h-4 w-4" />
                                                                        Show QR Code
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem 
                                                                        onClick={() => copyToClipboard(event)}
                                                                        className="gap-2"
                                                                    >
                                                                        <Copy className="h-4 w-4" />
                                                                        Copy Link
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Modals */}
                <ParticipantsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
                <AttendanceModal event={attendanceEvent} onClose={() => setAttendanceEvent(null)} />
                
                {/* QR Modal */}
                <Dialog open={isQROpen} onOpenChange={setIsQROpen}>
                    <DialogContent className="sm:max-w-md text-center">
                        <DialogHeader>
                            <DialogTitle className="flex items-center justify-center gap-2">
                                <QrCode className="h-5 w-5 text-blue-600" />
                                Event Check-In QR
                            </DialogTitle>
                            <DialogDescription>
                                Students scan this to verify attendance and mint POAP
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                            {qrData.img ? (
                                <motion.img 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    src={qrData.img} 
                                    alt="QR Code" 
                                    className="w-64 h-64 border-4 border-blue-200 rounded-xl p-2 bg-white shadow-lg"
                                />
                            ) : (
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            )}
                            <div className="w-full">
                                <Label className="mb-2 block text-left text-xs font-semibold">Check-In Link</Label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        value={qrData.url} 
                                        readOnly 
                                        className="bg-muted text-xs font-mono" 
                                    />
                                    <Button 
                                        size="icon" 
                                        variant="outline" 
                                        onClick={() => {
                                            navigator.clipboard.writeText(qrData.url);
                                            toast.success("Link copied!");
                                        }}
                                    >
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