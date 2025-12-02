// In server/controllers/event.controller.js
const Event = require('../models/event.model');
const User = require('../models/user.model');
const Certificate = require('../models/certificate.model');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
// --- IMPORT LOGGER ---
const { logActivity } = require('../utils/logger'); 

// --- Create a new event (Admin or Faculty) ---
// In server/controllers/event.controller.js

// --- Create a new event (Scoped to Dept) ---
exports.createEvent = async (req, res) => {
    try {
        const { name, date, description, certificateConfig, isPublic } = req.body; // <-- Accept isPublic
        
        const userDept = req.user.department; 

        const newEvent = new Event({
            name,
            date,
            description,
            createdBy: req.user.id,
            department: userDept,
            isPublic: isPublic || false, // <-- Save it
            certificatesIssued: false,
            certificateConfig: certificateConfig 
        });

        const savedEvent = await newEvent.save();
        
        // Log it (Optional)
        // await logActivity(req.user, "EVENT_CREATED", `Created ${isPublic ? 'Public' : 'Private'} event: ${name}`);

        res.status(201).json(savedEvent);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// --- Get events (Filtered by Role) ---
exports.getAllEvents = async (req, res) => {
    try {
        let query = {};

        // SECURITY CHECK:
        // If the user is 'Faculty', ONLY show events from their department.
        // If 'SuperAdmin', show everything (query remains empty).
        if (req.user.role === 'Faculty') {
            query = { department: req.user.department };
        }

        const events = await Event.find(query)
            .populate('createdBy', 'name')
            .sort({ date: -1 }); // Sort newest first

        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// --- Get a single event by ID (for public page) ---
exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// --- Get event participants (Admin or Faculty) ---
exports.getEventParticipants = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event.participants);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// --- Register a participant for an event (Public) ---
exports.registerForEvent = async (req, res) => {
    try {
        const { name, email } = req.body;
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        const normalizedEmail = email.toLowerCase(); 

        const isRegistered = event.participants.some(p => p.email === normalizedEmail);
        if (isRegistered) {
            return res.status(400).json({ message: 'Email already registered for this event' });
        }

        event.participants.push({ name, email: normalizedEmail });
        await event.save();

        res.status(201).json({ message: 'Successfully registered for the event' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// --- Get all public events (for student browsing) ---
exports.getPublicEvents = async (req, res) => {
    try {
        const studentDept = req.user.department;
        const studentEmail = req.user.email; // Current student

        const events = await Event.find({
            $or: [{ isPublic: true }, { department: studentDept }]
        })
        .select('name date description createdBy isPublic department participants') // Need participants to check
        .populate('createdBy', 'name')
        .sort({ date: 1 }); 

        // Transform to hide other people's emails
        const safeEvents = events.map(event => {
            const isRegistered = event.participants.some(p => p.email === studentEmail);
            return {
                _id: event._id,
                name: event.name,
                date: event.date,
                description: event.description,
                createdBy: event.createdBy,
                isRegistered: isRegistered, // <-- The flag we need
                isPublic: event.isPublic
            };
        });

        res.json(safeEvents);
    } catch (error) {
        res.status(500).send('Server Error');
    }
};
// --- Register the LOGGED-IN student for an event ---
exports.registerMeForEvent = async (req, res) => {
    try {
        const { name, email } = req.user;
        const eventId = req.params.id;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const isRegistered = event.participants.some(p => p.email === email);
        if (isRegistered) {
            return res.status(400).json({ message: 'You are already registered for this event' });
        }

        event.participants.push({ name, email });
        await event.save();

        res.status(201).json({ message: 'Successfully registered for the event!' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};