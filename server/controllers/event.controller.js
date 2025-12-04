// In server/controllers/event.controller.js
const Event = require('../models/event.model');
const User = require('../models/user.model');
const Certificate = require('../models/certificate.model');
const { logActivity } = require('../utils/logger'); // Assuming logger exists

// --- Helper: Format Time/Date ---
const parseEventTime = (date, time) => {
    const eventDateTime = new Date(date);
    if (time) {
        const [hour, minute] = time.split(':').map(Number);
        eventDateTime.setHours(hour, minute, 0, 0);
    }
    return eventDateTime;
};

// --- 1. CREATE EVENT (Includes Time & Location) ---
exports.createEvent = async (req, res) => {
    try {
        const { name, date, description, certificateConfig, isPublic, startTime, endTime, location } = req.body;
        
        const userDept = req.user.department; 

        // 1. Basic duplicate check
        const existingEvent = await Event.findOne({ name: name, department: userDept });
        if (existingEvent) {
            return res.status(400).json({ message: 'An event with this name already exists in your department.' });
        }

        const newEvent = new Event({
            name,
            date,
            description,
            startTime: startTime || "09:00", // Save Start Time
            endTime: endTime || "17:00",     // Save End Time
            location: location,              // Save Location Data
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

// --- 2. GET ALL EVENTS (Filtered & Checked for Completion) ---
exports.getAllEvents = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Faculty') {
            query = { department: req.user.department };
        }

        const events = await Event.find(query)
            .populate('createdBy', 'name')
            .sort({ date: -1 });

        const now = new Date();

        const eventsWithStatus = events.map(event => {
            const eventDate = new Date(event.date);
            
            // SECURITY LOCK: Calculate event end time for comparison
            const [endHour, endMinute] = (event.endTime || "17:00").split(':').map(Number);
            const eventEndTime = parseEventTime(eventDate, event.endTime);
            
            // Check if event has COMPLETED
            const isComplete = eventEndTime < now; 
            
            return {
                ...event.toObject(),
                isComplete: isComplete, // Flag for frontend to unlock the 'Issue' button
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


// --- 3. GET ALL PUBLIC EVENTS (Student Browse) ---
exports.getPublicEvents = async (req, res) => {
    try {
        const studentDept = req.user.department ? req.user.department.toUpperCase() : "";
        const studentEmail = req.user.email;

        // LOGIC: Show event IF (isPublic == true) OR (department == student's department)
        const events = await Event.find({
            $or: [
                { isPublic: true },
                { department: { $regex: new RegExp(`^${studentDept}$`, 'i') } } // Case-insensitive dept match
            ]
        })
        .populate('createdBy', 'name')
        .sort({ date: 1 });

        // Transform to hide private details and add 'isRegistered' flag
        const safeEvents = events.map(event => {
            const isRegistered = event.participants.some(p => p.email === studentEmail);
            
            // Check if event is in the past for UI lock
            const eventDate = new Date(event.date);
            const today = new Date();
            eventDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);
            const isPast = eventDate.getTime() < today.getTime(); 

            return {
                _id: event._id,
                name: event.name,
                date: event.date,
                description: event.description,
                createdBy: event.createdBy,
                isRegistered: isRegistered, 
                isPublic: event.isPublic,
                isPast: isPast
            };
        });

        res.json(safeEvents);
    } catch (error) {
        console.error('Get Public Events Error:', error);
        res.status(500).send('Server Error');
    }
};


// --- 4. REGISTER FOR EVENT (Student) ---
exports.registerMeForEvent = async (req, res) => {
    try {
        const { name, email } = req.user;
        const eventId = req.params.id;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        
        // Check if registration period is over (Event has not started yet, but date is in the past)
        const eventDate = new Date(event.date);
        const today = new Date();
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

// --- RESTORED FUNCTIONS ---
exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) { return res.status(500).send('Server Error'); }
};

exports.getEventParticipants = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event.participants);
    } catch (error) { return res.status(500).send('Server Error'); }
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
    } catch (error) { return res.status(500).send('Server Error'); }
};