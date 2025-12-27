// client/src/pages/BrowseEventsPage.jsx - PROFESSIONAL ANIMATED VERSION
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-item";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    Search, Calendar, Clock, MapPin, Users, CheckCircle2, 
    Loader2, AlertTriangle, TrendingUp, Sparkles, Filter,
    X, ChevronDown, Award, Zap, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

// ============================================
// FILTER BUTTON COMPONENT
// ============================================
const FilterButton = ({ active, onClick, children, count, icon: Icon }) => (
    <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`
            px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 border-2
            ${active
                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/30"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700"
            }
        `}
    >
        {Icon && <Icon className="w-4 h-4" />}
        {children}
        {count !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                active ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700"
            }`}>
                {count}
            </span>
        )}
    </motion.button>
);

// ============================================
// STATUS BADGE COMPONENT
// ============================================
const StatusBadge = ({ status }) => {
    const config = {
        Ongoing: {
            bg: "bg-green-500/10 border-green-500/30",
            text: "text-green-600 dark:text-green-400",
            icon: <Zap className="w-3 h-3" />,
            label: "Live Now",
            pulse: true
        },
        Upcoming: {
            bg: "bg-blue-500/10 border-blue-500/30",
            text: "text-blue-600 dark:text-blue-400",
            icon: <Calendar className="w-3 h-3" />,
            label: "Upcoming",
            pulse: false
        },
        Completed: {
            bg: "bg-slate-500/10 border-slate-500/30",
            text: "text-slate-600 dark:text-slate-400",
            icon: <CheckCircle2 className="w-3 h-3" />,
            label: "Completed",
            pulse: false
        }
    };
    
    const style = config[status] || config.Upcoming;
    
    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${style.bg} ${style.text} text-xs font-bold uppercase tracking-wider relative`}>
            {style.pulse && (
                <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></span>
            )}
            <span className="relative flex items-center gap-1.5">
                {style.icon}
                {style.label}
            </span>
        </div>
    );
};

// ============================================
// EVENT CARD COMPONENT
// ============================================
const EventCard = ({ event, onRegister, registerStatus }) => {
    const isPast = event.calculatedStatus === "Completed";
    const isOngoing = event.calculatedStatus === "Ongoing";
    const [isExpanded, setIsExpanded] = useState(false);
    
    const occupancyPercentage = (event.participants.length / event.capacity) * 100;
    const isAlmostFull = occupancyPercentage > 80;
    
    const getEventTypeColor = (type) => {
        const colors = {
            Workshop: "text-purple-600 bg-purple-100 dark:bg-purple-950/30",
            Hackathon: "text-orange-600 bg-orange-100 dark:bg-orange-950/30",
            Seminar: "text-blue-600 bg-blue-100 dark:bg-blue-950/30",
            Bootcamp: "text-pink-600 bg-pink-100 dark:bg-pink-950/30"
        };
        return colors[type] || colors.Workshop;
    };
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="group relative"
        >
            <div className={`
                bg-white dark:bg-slate-900 rounded-2xl border-2 overflow-hidden transition-all duration-300
                ${isPast 
                    ? "border-slate-200 dark:border-slate-800 opacity-75" 
                    : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-2xl hover:shadow-indigo-500/10"
                }
            `}>
                
                {/* Header with gradient */}
                <div className={`relative p-6 ${
                    isOngoing 
                        ? "bg-gradient-to-r from-green-500 to-emerald-600" 
                        : isPast
                        ? "bg-gradient-to-r from-slate-400 to-slate-500"
                        : "bg-gradient-to-r from-indigo-500 to-purple-600"
                }`}>
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                            backgroundSize: "24px 24px"
                        }}></div>
                    </div>
                    
                    <div className="relative flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-3">
                                <StatusBadge status={event.calculatedStatus} />
                                {isAlmostFull && !isPast && (
                                    <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-100 text-xs font-bold rounded-full flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Almost Full
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:line-clamp-none transition-all">
                                {event.name}
                            </h3>
                            <p className="text-white/90 text-sm line-clamp-2">
                                {event.description}
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-4">
                    
                    {/* Event Type Badge */}
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getEventTypeColor(event.eventType)}`}>
                            {event.eventType}
                        </span>
                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {event.department}
                        </span>
                    </div>
                    
                    {/* Event Info Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            <span className="font-medium">
                                {new Date(event.date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <Clock className="w-4 h-4 text-purple-500" />
                            <span className="font-medium">{event.startTime} - {event.endTime}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 col-span-2">
                            <MapPin className="w-4 h-4 text-pink-500 flex-shrink-0" />
                            <span className="font-medium line-clamp-1">{event.location.address}</span>
                        </div>
                    </div>
                    
                    {/* Capacity Bar */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                <Users className="w-3 h-3" />
                                <span className="font-semibold">
                                    {event.participants.length} / {event.capacity} registered
                                </span>
                            </div>
                            <span className={`font-bold ${isAlmostFull ? 'text-red-600' : 'text-indigo-600'}`}>
                                {occupancyPercentage.toFixed(0)}%
                            </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${occupancyPercentage}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full rounded-full ${
                                    isAlmostFull 
                                        ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                                        : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                }`}
                            />
                        </div>
                    </div>
                    
                    {/* Expandable Details */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3"
                            >
                                <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-lg p-4 space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-indigo-500" />
                                        <span className="font-semibold text-slate-900 dark:text-white">What to Expect</span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 pl-6">
                                        {event.description}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                        >
                            {isExpanded ? "Show Less" : "More Details"}
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {event.isRegistered && isOngoing ? (
                            <button
                                onClick={() => window.location.href = `/poap-checkin?eventId=${event._id}`}
                                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                <MapPin className="w-4 h-4" />
                                Check In Now
                            </button>
                        ) : event.isRegistered ? (
                            <button
                                disabled
                                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-2 border-green-300 dark:border-green-800 cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Registered
                            </button>
                        ) : isPast ? (
                            <button
                                disabled
                                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                            >
                                Event Ended
                            </button>
                        ) : (
                            <button
                                onClick={() => onRegister(event._id)}
                                disabled={registerStatus[event._id]?.loading}
                                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {registerStatus[event._id]?.loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Registering...
                                    </>
                                ) : (
                                    <>
                                        <Award className="w-4 h-4" />
                                        Register Now
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function BrowseEventsPage() {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState("All");
    const [registerStatus, setRegisterStatus] = useState({});
    
    useEffect(() => {
        fetchEvents();
    }, []);
    
    useEffect(() => {
        filterEvents();
    }, [events, searchTerm, activeFilter]);
    
    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/events/public-list');
            setEvents(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load events");
        } finally {
            setLoading(false);
        }
    };
    
    const filterEvents = () => {
        let filtered = events;
        
        // Status filter
        if (activeFilter !== "All") {
            filtered = filtered.filter(e => e.calculatedStatus === activeFilter);
        }
        
        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(e =>
                e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.department.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        setFilteredEvents(filtered);
    };
    
    const handleRegister = async (eventId) => {
        setRegisterStatus(prev => ({ ...prev, [eventId]: { loading: true } }));
        
        try {
            await api.post(`/events/${eventId}/register-me`);
            setEvents(prev => prev.map(e => 
                e._id === eventId ? { ...e, isRegistered: true } : e
            ));
            toast.success("Registration successful!");
        } catch (err) {
            toast.error(err.response?.data?.message || "Registration failed");
        } finally {
            setRegisterStatus(prev => ({ ...prev, [eventId]: { loading: false } }));
        }
    };
    
    const stats = {
        All: events.length,
        Ongoing: events.filter(e => e.calculatedStatus === "Ongoing").length,
        Upcoming: events.filter(e => e.calculatedStatus === "Upcoming").length,
        Completed: events.filter(e => e.calculatedStatus === "Completed").length
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-indigo-950/10 dark:to-purple-950/10">
            
            {/* Header */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                                    <Calendar className="w-6 h-6 text-white" />
                                </div>
                                Discover Events
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400 mt-1">
                                Join workshops, hackathons, and seminars to boost your skills
                            </p>
                        </div>
                        
                        {/* Stats */}
                        <div className="flex gap-3">
                            <div className="bg-indigo-50 dark:bg-indigo-950/30 px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800">
                                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                    {events.filter(e => e.isRegistered).length}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Registered</div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-950/30 px-4 py-2 rounded-xl border border-purple-200 dark:border-purple-800">
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {stats.Upcoming}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Available</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-6 py-8">
                
                {/* Search & Filters */}
                <div className="mb-8 space-y-4">
                    
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search events, topics, or departments..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-lg"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        )}
                    </div>
                    
                    {/* Filter Buttons */}
                    <div className="flex items-center gap-3 overflow-x-auto pb-2">
                        <FilterButton
                            active={activeFilter === "All"}
                            onClick={() => setActiveFilter("All")}
                            count={stats.All}
                        >
                            All Events
                        </FilterButton>
                        
                        <FilterButton
                            active={activeFilter === "Ongoing"}
                            onClick={() => setActiveFilter("Ongoing")}
                            count={stats.Ongoing}
                            icon={Zap}
                        >
                            Live Now
                        </FilterButton>
                        
                        <FilterButton
                            active={activeFilter === "Upcoming"}
                            onClick={() => setActiveFilter("Upcoming")}
                            count={stats.Upcoming}
                            icon={TrendingUp}
                        >
                            Upcoming
                        </FilterButton>
                        
                        <FilterButton
                            active={activeFilter === "Completed"}
                            onClick={() => setActiveFilter("Completed")}
                            count={stats.Completed}
                            icon={CheckCircle2}
                        >
                            Past Events
                        </FilterButton>
                    </div>
                </div>
                
                {/* Results Count */}
                <div className="mb-6 flex items-center justify-between">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Showing <span className="font-bold text-slate-900 dark:text-white">{filteredEvents.length}</span> events
                        {searchTerm && ` matching "${searchTerm}"`}
                    </p>
                </div>
                
                {/* Loading State */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden animate-pulse">
                                <div className="h-32 bg-slate-200 dark:bg-slate-800"></div>
                                <div className="p-6 space-y-4">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                                    <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Events Grid */}
                {!loading && (
                    <AnimatePresence mode="popLayout">
                        {filteredEvents.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-20"
                            >
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
                                    <Calendar className="w-10 h-10 text-slate-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    No Events Found
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400">
                                    {searchTerm 
                                        ? `No events match your search "${searchTerm}"`
                                        : activeFilter === "All" 
                                            ? "No events available at the moment"
                                            : `No ${activeFilter.toLowerCase()} events`
                                    }
                                </p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredEvents.map((event, index) => (
                                    <EventCard 
                                        key={event._id} 
                                        event={event} 
                                        onRegister={handleRegister}
                                        registerStatus={registerStatus}
                                    />
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}