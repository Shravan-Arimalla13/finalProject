// server/controllers/event.controller.js - IST FIXED VERSION
const Event = require('../models/event.model');
const User = require('../models/user.model');
const { logActivity } = require('../utils/logger');
const { getEventStatusIST, getCurrentIST } = require('../utils/timezone');

// --- 1. CREATE EVENT ---
exports.createEvent = async (req, res) => {
    try {
        const { name, date, description, certificateConfig, isPublic, startTime, endTime, location } = req.body;
        const userDept = req.user.department;

        const existingEvent = await Event.findOne({ name: name, department: userDept });
        if (existingEvent) {
            return res.status(400).json({ message: 'An event with this name already exists in your department.' });
        }

        const newEvent = new Event({
            name,
            date,
            description,
            startTime: startTime || "09:00",
            endTime: endTime || "17:00",
            location: location,
            createdBy: req.user.id,
            department: userDept,
            isPublic: isPublic || false,
            certificatesIssued: false,
            certificateConfig: certificateConfig
        });

        const savedEvent = await newEvent.save();
        await logActivity(req.user, "EVENT_CREATED", `Created new event: "${name}"`);

        res.status(201).json(savedEvent);
    } catch (error) {
        console.error('Create Event Error:', error);
        res.status(500).send('Server Error');
    }
};

// --- 2. GET ALL EVENTS (WITH IST STATUS CALCULATION) ---
exports.getAllEvents = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Faculty') {
            query = { department: req.user.department };
        }

        const events = await Event.find(query)
            .populate('createdBy', 'name')
            .sort({ date: -1 });

        // Calculate dynamic status using IST
        const eventsWithStatus = events.map(event => {
            const status = getEventStatusIST(event.date, event.startTime, event.endTime);
            const now = getCurrentIST();
            const startTime = require('../utils/timezone').parseEventTimeIST(event.date, event.startTime);
            
            return {
                ...event.toObject(),
                status: status,
                isFutureEvent: now < startTime,
                isActive: status === 'Ongoing',
                startTime: event.startTime,
                endTime: event.endTime
            };
        });

        res.json(eventsWithStatus);
    } catch (error) {
        console.error('Get All Events Error:', error);
        res.status(500).send('Server Error');
    }
};

// --- 3. GET PUBLIC EVENTS (FOR STUDENTS) ---
exports.getPublicEvents = async (req, res) => {
    try {
        const events = await Event.find({ isPublic: true })
            .populate('createdBy', 'name')
            .sort({ date: -1 });

        const eventsWithStatus = events.map(event => {
            const status = getEventStatusIST(event.date, event.startTime, event.endTime);
            const now = getCurrentIST();
            const startTime = require('../utils/timezone').parseEventTimeIST(event.date, event.startTime);
            
            return {
                ...event.toObject(),
                status: status,
                isFutureEvent: now < startTime,
                isActive: status === 'Ongoing'
            };
        });

        res.json(eventsWithStatus);
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

// --- 4. OTHER HANDLERS (UNCHANGED) ---
exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        return res.status(500).send('Server Error');
    }
};

exports.registerMeForEvent = async (req, res) => {
    try {
        const { name, email } = req.user;
        const eventId = req.params.id;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        
        // Use IST for date comparison
        const eventDate = new Date(event.date);
        const today = getCurrentIST();
        eventDate.setHours(0,0,0,0);
        today.setHours(0,0,0,0);
        
        if (eventDate.getTime() < today.getTime()) {
            return res.status(400).json({ message: 'Registration for this event has closed.' });
        }

        const isRegistered = event.participants.some(p => p.email === email);
        if (isRegistered) {
            return res.status(400).json({ message: 'You are already registered for this event.' });
        }

        event.participants.push({ name, email });
        await event.save();

        res.status(201).json({ message: 'Successfully registered for the event' });
    } catch (error) {
        console.error('Register Me Error:', error);
        res.status(500).send('Server Error');
    }
};

exports.getEventParticipants = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event.participants);
    } catch (error) {
        return res.status(500).send('Server Error');
    }
};

exports.registerForEvent = async (req, res) => {
    try {
        const { name, email } = req.body;
        const event = await Event.findById(req.params.id);
        const normalizedEmail = email.toLowerCase();

        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.participants.some(p => p.email === normalizedEmail)) {
            return res.status(400).json({ message: 'Email already registered for this event' });
        }

        event.participants.push({ name, email: normalizedEmail });
        await event.save();
        res.status(201).json({ message: 'Successfully registered for the event' });
    } catch (error) {
        return res.status(500).send('Server Error');
    }
};