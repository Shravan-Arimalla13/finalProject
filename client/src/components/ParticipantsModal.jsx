// In client/src/components/ParticipantsModal.jsx
import React, { useState, useEffect } from 'react';
import api from '../api';
import { Alert, AlertDescription } from "@/components/ui/alert-box";

function ParticipantsModal({ event, onClose }) {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- NEW STATE ---
    // This will track the status of each button, e.g:
    // { "student@email.com": "Issuing..." }
    const [issueStatus, setIssueStatus] = useState({});

    useEffect(() => {
        // Fetch participants when the 'event' prop changes
        if (event) {
            setLoading(true);
            setError(null);
            setIssueStatus({}); // Reset status when modal opens

            const fetchParticipants = async () => {
                try {
                    const response = await api.get(`/events/${event._id}/participants`);
                    setParticipants(response.data);
                } catch (err) {
                    setError('Failed to fetch participants.');
                } finally {
                    setLoading(false);
                }
            };
            fetchParticipants();
        }
    }, [event]); // Re-run this effect when the event prop changes

    // --- NEW FUNCTION ---
    const handleIssueSingle = async (participant) => {
        const { name, email } = participant;
        const { name: eventName, date: eventDate } = event; // Get event details

        // Set loading state for this specific student
        setIssueStatus(prev => ({ ...prev, [email]: { message: 'Issuing...', isError: false } }));

        try {
            const response = await api.post('/certificates/issue/single', {
                eventName: eventName,
                eventDate: eventDate,
                studentName: name,
                studentEmail: email
            });
            // On success, update status from server message
            setIssueStatus(prev => ({ ...prev, [email]: { message: response.data.message, isError: false } }));

        } catch (err) {
            // On failure, update status with error
            const errorMessage = err.response?.data?.message || 'Failed';
            setIssueStatus(prev => ({ ...prev, [email]: { message: errorMessage, isError: true } }));
        }
    };

    if (!event) {
        return null;
    }

    return (
        // Modal Backdrop
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-muted/40 bg-opacity-50"
            onClick={onClose}
        >
            {/* Modal Content */}
            <div 
                className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold mb-4">Participants for {event.name}</h2>
                
                {loading && <p>Loading...</p>}
                {error && <p className="text-red-500">{error}</p>}

                {!loading && !error && (
                    <div className="max-h-80 overflow-y-auto">
                        {participants.length === 0 ? (
                            <p>No participants have registered yet.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {participants.map((p, index) => {
                                    // Get the status for this specific participant
                                    const status = issueStatus[p.email];
                                    
                                    return (
                                        <li key={index} className="py-3 flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{p.name}</p>
                                                <p className="text-sm text-gray-600">{p.email}</p>
                                            </div>
                                            
                                            {/* --- UPDATED BUTTON/STATUS LOGIC --- */}
                                            <div>
                                                {!status && (
                                                    <button
                                                        onClick={() => handleIssueSingle(p)}
                                                        className="bg-blue-500 text-white py-1 px-2 rounded text-xs hover:bg-blue-600"
                                                    >
                                                        Issue
                                                    </button>
                                                )}
                                                {status && (
                                                    <p className={`text-xs font-semibold ${status.isError ? 'text-red-500' : 'text-green-600'}`}>
                                                        {status.message}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="mt-6 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                >
                    Close
                </button>
            </div>
        </div>
    );
}

export default ParticipantsModal;