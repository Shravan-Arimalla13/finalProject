// Create scheduled job to update statuses
// server/jobs/updateEventStatus.js
const cron = require('node-cron');

cron.schedule('*/5 * * * *', async () => {
    const events = await Event.find({ eventStatus: { $ne: 'Completed' } });
    const now = new Date();
    
    for (const event of events) {
        const eventDateStr = new Date(event.date).toISOString().split('T')[0];
        const startTime = new Date(`${eventDateStr}T${event.startTime}:00`);
        const endTime = new Date(`${eventDateStr}T${event.endTime}:00`);
        
        let newStatus = event.eventStatus;
        if (now > endTime) newStatus = 'Completed';
        else if (now >= startTime && now <= endTime) newStatus = 'Ongoing';
        
        if (newStatus !== event.eventStatus) {
            event.eventStatus = newStatus;
            await event.save();
        }
    }
});