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
import { Badge } from "@/components/ui/badge";
// --- FIX: Add CheckCircle2 here ---
import { Search, Calendar, User, CheckCircle2, Loader2 } from "lucide-react"; 
// ----------------------------------


function BrowseEventsPage() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]); // For search results
  const [searchTerm, setSearchTerm] = useState(""); // Search text

  const [loading, setLoading] = useState(true);
  const [registerStatus, setRegisterStatus] = useState({});
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const fetchPublicEvents = async () => {
      try {
        const response = await api.get("/events/public-list");
        setEvents(response.data);
        setFilteredEvents(response.data); // Initialize filtered list
      } catch (err) {
        console.error("Failed to load events");
      } finally {
        setLoading(false);
      }
    };
    fetchPublicEvents();
  }, []);

  // --- SEARCH LOGIC ---
  useEffect(() => {
    const results = events.filter(
      (event) =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEvents(results);
  }, [searchTerm, events]);

  const handleRegisterMe = async (eventId) => {
    setRegisterStatus({
      ...registerStatus,
      [eventId]: { message: "Registering...", isError: false },
    });
    try {
      const response = await api.post(`/events/${eventId}/register-me`);
      setRegisterStatus({
        ...registerStatus,
        [eventId]: { message: "Registered! ✅", isError: false },
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Registration failed.";
      setRegisterStatus({
        ...registerStatus,
        [eventId]: { message: errorMessage, isError: true },
      });
    }
  };

  if (loading)
    return <p className="p-8 text-center">Loading amazing events...</p>;

  return (
    <div className="min-h-screen bg-muted/40 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-800">Browse Events</h1>
            <p className="text-slate-500 mt-2">
              Discover workshops, hackathons, and seminars.
            </p>
          </div>

          {/* --- SEARCH BAR --- */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search events..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* --- EVENT GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.length === 0 && (
            <p className="col-span-full text-center text-slate-500 py-10">
              No events found matching "{searchTerm}"
            </p>
          )}

          {filteredEvents.map((event) => {
            const status = registerStatus[event._id];
            // --- THIS IS THE FIX ---

            // --- THIS IS THE FIX ---
            const eventDate = new Date(event.date);
            const today = new Date();

            // Reset both dates to midnight to compare *only* the date, not the time
            eventDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const isPast = eventDate.getTime() < today.getTime();
            // ---------------------

            return (
              <Card
                key={event._id}
                className="flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl text-blue-700">
                      {event.name}
                    </CardTitle>
                    {isPast && <Badge variant="secondary">Past Event</Badge>}
                  </div>
                  <CardDescription className="line-clamp-2 mt-2">
                    {event.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 text-sm text-slate-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-slate-400" />
                    {event.createdBy?.name || "Faculty"}
                  </div>
                </CardContent>
                <CardFooter>
                  {event.isRegistered ? (
                    <Button
                      disabled
                      variant="secondary"
                      className="w-full bg-green-100 text-green-800"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Registered
                    </Button>
                  ) : (
                    !status &&
                    !isPast && (
                      <Button
                        onClick={() => handleRegisterMe(event._id)}
                        className="w-full"
                      >
                        Register Me
                      </Button>
                    )
                  )}
                  {isPast && !status && (
                    <Button disabled variant="outline" className="w-full">
                      Registration Closed
                    </Button>
                  )}
                  {status && (
                    <div
                      className={`w-full text-center font-semibold p-2 rounded ${
                        status.isError
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {status.message}
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BrowseEventsPage;
