import admin from 'firebase-admin';
import { getWeatherForecast } from '../weather/service';
import { CreateEventInput, Event, EventWithWeather } from './model';

const EVENTS_COL = 'events';

export async function createEvent(
  input: CreateEventInput,
  createdBy: string
): Promise<EventWithWeather> {
  const { title, description = '', location, lat, lon, startTime, endTime, attendees = [] } = input;

  const eventDate = new Date(startTime);
  const daysUntilEvent = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const forecastDays = Math.min(Math.max(daysUntilEvent + 1, 1), 7);

  const weather = await getWeatherForecast(lat, lon, forecastDays);

  const ref = await admin.firestore().collection(EVENTS_COL).add({
    title,
    description,
    location,
    coordinates: { lat, lon },
    startTime: admin.firestore.Timestamp.fromDate(new Date(startTime)),
    endTime: admin.firestore.Timestamp.fromDate(new Date(endTime)),
    attendees,
    createdBy,
    weatherRisk: weather.risk.level,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
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

export async function listEvents(uid: string, isAdmin: boolean): Promise<Event[]> {
  const col = admin.firestore().collection(EVENTS_COL);
  const snapshot = await col.get();
  const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Event));

  // Sort by startTime ascending
  return events.sort((a, b) => {
    const ta = a.startTime as unknown as { _seconds?: number; toMillis?: () => number };
    const tb = b.startTime as unknown as { _seconds?: number; toMillis?: () => number };
    const ma = ta?.toMillis?.() ?? (ta?._seconds ?? 0) * 1000;
    const mb = tb?.toMillis?.() ?? (tb?._seconds ?? 0) * 1000;
    return ma - mb;
  });
}

export async function getEventById(id: string): Promise<EventWithWeather | null> {
  const doc = await admin.firestore().collection(EVENTS_COL).doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  const { lat, lon } = data.coordinates;
  const weather = await getWeatherForecast(lat, lon, 7);

  return { id: doc.id, ...data, weather } as EventWithWeather;
}

export async function updateEvent(
  id: string,
  updates: Partial<Event>
): Promise<void> {
  await admin
    .firestore()
    .collection(EVENTS_COL)
    .doc(id)
    .update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
}

export async function deleteEvent(id: string): Promise<void> {
  await admin.firestore().collection(EVENTS_COL).doc(id).delete();
}

export async function getEventOwner(id: string): Promise<string | null> {
  const doc = await admin.firestore().collection(EVENTS_COL).doc(id).get();
  return doc.exists ? (doc.data()!.createdBy as string) : null;
}
