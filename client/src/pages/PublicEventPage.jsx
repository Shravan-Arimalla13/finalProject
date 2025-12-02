// In client/src/pages/PublicEventPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

function PublicEventPage() {
    // useParams gets the ":id" from the URL
    const { id } = useParams(); 
    
    const [event, setEvent] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch the event details when the page loads
        const fetchEvent = async () => {
            try {
                const response = await api.get(`/events/${id}`);
                setEvent(response.data);
            } catch (err) {
                setError('Event not found or an error occurred.');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        try {
            // Call the public registration API endpoint
            const response = await api.post(`/events/${id}/register`, { name, email });
            setMessage(response.data.message); // "Successfully registered..."
            setName('');
            setEmail('');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed.');
        }
    };

    if (loading) {
        return <p className="text-center p-8">Loading event...</p>;
    }

    if (error && !event) {
        return <p className="text-center p-8 text-red-500">{error}</p>;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white shadow-lg rounded-lg w-full max-w-lg">
                {/* Event Details */}
                <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
                <p className="text-lg text-gray-700 mb-4">
                    Date: {new Date(event.date).toLocaleDateString()}
                </p>
                <p className="text-gray-600 mb-6">{event.description}</p>
                
                <hr className="mb-6" />

                {/* Registration Form */}
                <h2 className="text-2xl font-bold text-center mb-6">Register for this Event</h2>

                {message ? (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-center">
                        {message}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                                {error}
                            </div>
                        )}
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                                required
                            />
                        </div>
                        <div className="flex items-center justify-center">
                            <button
                                type="submit"
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Register
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default PublicEventPage;