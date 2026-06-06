"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = createEvent;
exports.listEvents = listEvents;
exports.getEventById = getEventById;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
exports.getEventOwner = getEventOwner;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const service_1 = require("../weather/service");
const EVENTS_COL = 'events';
async function createEvent(input, createdBy) {
    const { title, description = '', location, lat, lon, startTime, endTime, attendees = [] } = input;
    const eventDate = new Date(startTime);
    const daysUntilEvent = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const forecastDays = Math.min(Math.max(daysUntilEvent + 1, 1), 7);
    const weather = await (0, service_1.getWeatherForecast)(lat, lon, forecastDays);
    const ref = await firebase_admin_1.default.firestore().collection(EVENTS_COL).add({
        title,
        description,
        location,
        coordinates: { lat, lon },
        startTime: firebase_admin_1.default.firestore.Timestamp.fromDate(new Date(startTime)),
        endTime: firebase_admin_1.default.firestore.Timestamp.fromDate(new Date(endTime)),
        attendees,
        createdBy,
        weatherRisk: weather.risk.level,
        createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: ref.id,
        title,
        description,
        location,
        coordinates: { lat, lon },
        startTime,
        endTime,
        attendees,
        createdBy,
        weatherRisk: weather.risk.level,
        weather,
    };
}
async function listEvents(uid, isAdmin) {
    const col = firebase_admin_1.default.firestore().collection(EVENTS_COL);
    // Avoid compound index requirement by sorting in memory after fetch
    const query = isAdmin
        ? col
        : col.where('createdBy', '==', uid);
    const snapshot = await query.get();
    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    // Sort by startTime ascending
    return events.sort((a, b) => {
        const ta = a.startTime;
        const tb = b.startTime;
        const ma = ta?.toMillis?.() ?? (ta?._seconds ?? 0) * 1000;
        const mb = tb?.toMillis?.() ?? (tb?._seconds ?? 0) * 1000;
        return ma - mb;
    });
}
async function getEventById(id) {
    const doc = await firebase_admin_1.default.firestore().collection(EVENTS_COL).doc(id).get();
    if (!doc.exists)
        return null;
    const data = doc.data();
    const { lat, lon } = data.coordinates;
    const weather = await (0, service_1.getWeatherForecast)(lat, lon, 7);
    return { id: doc.id, ...data, weather };
}
async function updateEvent(id, updates) {
    await firebase_admin_1.default
        .firestore()
        .collection(EVENTS_COL)
        .doc(id)
        .update({ ...updates, updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp() });
}
async function deleteEvent(id) {
    await firebase_admin_1.default.firestore().collection(EVENTS_COL).doc(id).delete();
}
async function getEventOwner(id) {
    const doc = await firebase_admin_1.default.firestore().collection(EVENTS_COL).doc(id).get();
    return doc.exists ? doc.data().createdBy : null;
}
//# sourceMappingURL=service.js.map