"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.list = list;
exports.getOne = getOne;
exports.update = update;
exports.remove = remove;
exports.refreshWeather = refreshWeather;
const model_1 = require("../auth/model");
const service_1 = require("../weather/service");
const service_2 = require("./service");
async function create(req, res) {
    const body = req.body;
    const { title, location, lat, lon, startTime, endTime } = body;
    if (!title || !location || lat == null || lon == null || !startTime || !endTime) {
        res.status(400).json({ message: 'title, location, lat, lon, startTime, and endTime are required' });
        return;
    }
    try {
        const event = await (0, service_2.createEvent)(body, req.user.uid);
        res.status(201).json(event);
    }
    catch (err) {
        console.error('Create event error:', err);
        res.status(500).json({ message: 'Failed to create event' });
    }
}
async function list(req, res) {
    try {
        const isAdmin = req.user.role === model_1.Role.Admin;
        const events = await (0, service_2.listEvents)(req.user.uid, isAdmin);
        res.json(events);
    }
    catch (err) {
        console.error('List events error:', err);
        res.status(500).json({ message: 'Failed to fetch events' });
    }
}
async function getOne(req, res) {
    try {
        const id = req.params.id;
        const event = await (0, service_2.getEventById)(id);
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }
        res.json(event);
    }
    catch (err) {
        console.error('Get event error:', err);
        res.status(500).json({ message: 'Failed to fetch event' });
    }
}
async function update(req, res) {
    try {
        const id = req.params.id;
        const owner = await (0, service_2.getEventOwner)(id);
        if (owner === null) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }
        if (owner !== req.user.uid && req.user.role !== model_1.Role.Admin) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const allowed = ['title', 'description', 'location', 'lat', 'lon', 'startTime', 'endTime', 'attendees'];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined)
                updates[key] = req.body[key];
        }
        await (0, service_2.updateEvent)(id, updates);
        res.json({ id, ...updates });
    }
    catch (err) {
        console.error('Update event error:', err);
        res.status(500).json({ message: 'Failed to update event' });
    }
}
async function remove(req, res) {
    try {
        const id = req.params.id;
        const owner = await (0, service_2.getEventOwner)(id);
        if (owner === null) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }
        if (owner !== req.user.uid && req.user.role !== model_1.Role.Admin) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        await (0, service_2.deleteEvent)(id);
        res.status(204).send();
    }
    catch (err) {
        console.error('Delete event error:', err);
        res.status(500).json({ message: 'Failed to delete event' });
    }
}
async function refreshWeather(req, res) {
    try {
        const event = await (0, service_2.getEventById)(req.params.id);
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }
        const weather = await (0, service_1.getWeatherForecast)(event.coordinates.lat, event.coordinates.lon, 7);
        res.json(weather);
    }
    catch (err) {
        console.error('Weather refresh error:', err);
        res.status(500).json({ message: 'Failed to fetch weather' });
    }
}
//# sourceMappingURL=controller.js.map