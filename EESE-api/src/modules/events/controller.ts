import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Role } from '../auth/model';
import { getWeatherForecast } from '../weather/service';
import {
  createEvent,
  listEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventOwner,
} from './service';
import { CreateEventInput } from './model';

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Partial<CreateEventInput>;
  const { title, location, lat, lon, startTime, endTime } = body;

  if (!title || !location || lat == null || lon == null || !startTime || !endTime) {
    res.status(400).json({ message: 'title, location, lat, lon, startTime, and endTime are required' });
    return;
  }

  try {
    const event = await createEvent(body as CreateEventInput, req.user!.uid);
    res.status(201).json(event);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ message: 'Failed to create event' });
  }
}

export async function list(req: AuthRequest, res: Response): Promise<void> {
  try {
    const isAdmin = req.user!.role === Role.Admin;
    const events = await listEvents(req.user!.uid, isAdmin);
    res.json(events);
  } catch (err) {
    console.error('List events error:', err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const event = await getEventById(id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    res.json(event);
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ message: 'Failed to fetch event' });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const owner = await getEventOwner(id);
    if (owner === null) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    if (owner !== req.user!.uid && req.user!.role !== Role.Admin) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const allowed = ['title', 'description', 'location', 'lat', 'lon', 'startTime', 'endTime', 'attendees'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await updateEvent(id, updates);
    res.json({ id, ...updates });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ message: 'Failed to update event' });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const owner = await getEventOwner(id);
    if (owner === null) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    if (owner !== req.user!.uid && req.user!.role !== Role.Admin) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await deleteEvent(id);
    res.status(204).send();
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ message: 'Failed to delete event' });
  }
}

export async function refreshWeather(req: AuthRequest, res: Response): Promise<void> {
  try {
    const event = await getEventById(req.params.id as string);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    const weather = await getWeatherForecast(event.coordinates.lat, event.coordinates.lon, 7);
    res.json(weather);
  } catch (err) {
    console.error('Weather refresh error:', err);
    res.status(500).json({ message: 'Failed to fetch weather' });
  }
}
