// In client/src/pages/BrowseEventsPage.jsx
import React, { useState, useEffect } from "react";
import api from "../api";

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input"; // For Search
import { Badge } from "@/components/ui/badge-item";
import { Search, Calendar, User, CheckCircle2, Loader2, Clock } from "lucide-react"; 
// ----------------------------------

function BrowseEventsPage() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]); 
  const [searchTerm, setSearchTerm] = useState(""); 

  const [loading, setLoading] = useState(true);
  const [registerStatus, setRegisterStatus] = useState({});

  // 1. FETCH EVENTS
  useEffect(() => {
    const fetchPublicEvents = async () => {
      try {
        const response = await api.get("/events/public-list");
        console.log("Events Fetched:", response.data); // DEBUG LOG
        setEvents(response.data);
        setFilteredEvents(response.data); 
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicEvents();
  }, []);

  // 2. SEARCH LOGIC (FIXED)
  useEffect(() => {
    if (!events) return;
    
    const results = events.filter((event) => {
      // Safe check: Ensure name/desc exist before lowering case
      const nameMatch = (event.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const descMatch = (event.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || descMatch;
    });
    
    setFilteredEvents(results);
  }, [searchTerm, events]);

  const handleRegisterMe = async (eventId) => {
    setRegisterStatus(prev => ({
      ...prev,
      [eventId]: { message: "Registering...", isError: false, loading: true },
    }));
    try {
      await api.post(`/events/${eventId}/register-me`);
      
      // Update local status
      setRegisterStatus(prev => ({
        ...prev,
        [eventId]: { message: "Registered! ✅", isError: false, loading: false },
      }));

      // Update the list UI to show "Registered" button immediately
      setEvents(prev => prev.map(ev => ev._id === eventId ? {...ev, isRegistered: true} : ev));

    } catch (err) {
      const errorMessage = err.response?.data?.message || "Registration failed.";
      setRegisterStatus(prev => ({
        ...prev,
        [eventId]: { message: errorMessage, isError: true, loading: false },
      }));
    }
  };

  if (loading)
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
    );

  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Browse Events</h1>
            <p className="text-muted-foreground mt-2">
              Discover workshops, hackathons, and seminars.
            </p>
          </div>

          {/* --- SEARCH BAR --- */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* --- EVENT GRID --- */}
        {/* --- EVENT GRID ---  */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {filteredEvents.length === 0 ? (
    <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl">
       <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
       <p className="text-lg text-muted-foreground">
         {searchTerm ? `No events found matching "${searchTerm}"` : "No active events available right now."}
       </p>
    </div>
  ) : (
    filteredEvents.map((event) => {
      // Line 127: Correctly declaring variables within the map function scope
      const status = registerStatus[event._id];
      
      // Calculate dynamic status for UI consistency
      let currentStatus = event.status; 
      if (!currentStatus) {
        const now = new Date();
        const eventDatePart = new Date(event.date).toISOString().split('T')[0];
        const startTime = new Date(`${eventDatePart}T${event.startTime}:00`);
        const endTime = new Date(`${eventDatePart}T${event.endTime}:00`);

        if (now > endTime) currentStatus = "Completed";
        else if (now >= startTime && now <= endTime) currentStatus = "Ongoing";
        else currentStatus = "Upcoming";
      }

      const isPast = currentStatus === "Completed";
      const isOngoing = currentStatus === "Ongoing";

      // The 'return' statement must wrap the entire Card JSX 
      return (
        <Card
          key={event._id}
          className="flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-slate-200"
        >
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-xl text-blue-700 line-clamp-1">
                {event.name}
              </CardTitle>
              {isPast ? (
                <Badge variant="destructive" className="bg-red-100 text-red-700">Expired</Badge>
              ) : isOngoing ? (
                <Badge className="bg-green-100 text-green-700 animate-pulse">Live Now</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-700">Upcoming</Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="flex-grow space-y-3 text-sm">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {new Date(event.date).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              {event.startTime} - {event.endTime}
            </div>
          </CardContent>

          <CardFooter className="pt-2 block space-y-2">
            {event.isRegistered && isOngoing ? (
              <Button
                onClick={() => window.location.href = `/attendance/claim/${event._id}`}
                className="w-full bg-orange-600 text-white"
              >
                Verify Attendance (GPS)
              </Button>
            ) : event.isRegistered ? (
              <Button disabled variant="secondary" className="w-full">
                Registered
              </Button>
            ) : isPast ? (
              <Button disabled variant="outline" className="w-full">
                Event Concluded
              </Button>
            ) : (
              <Button
                onClick={() => handleRegisterMe(event._id)}
                className="w-full bg-blue-600 text-white"
              >
                Register for Event
              </Button>
            )}
          </CardFooter>
        </Card>
      );
    })
  )}
</div>
      </div>
    </div>
  );
}

export default BrowseEventsPage;