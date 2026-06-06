import React, { useState, useEffect, FormEvent, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, CalendarPlus, Loader2 } from 'lucide-react';
import { api } from '../lib/apiClient';
import LocationSearch from './LocationSearch';
import WeatherSummary from './WeatherSummary';
import DateTimePicker from './DateTimePicker';
import type { WeatherForecastResult, CurrentConditions } from '../types/weather';

interface EventFormData {
  title: string;
  description: string;
  location: string;
  lat: number | null;
  lon: number | null;
  startTime: string;
  endTime: string;
}

const EMPTY_FORM: EventFormData = {
  title: '', description: '', location: '', lat: null, lon: null, startTime: '', endTime: '',
};

interface Props {
  /** Controlled open state — pass undefined to let the dialog manage itself */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with the event id after successful creation or update */
  onCreated?: (eventId: string) => void;
  /** Initial date values (e.g. when clicking a calendar date) */
  initialStart?: string;
  initialEnd?: string;
  /** Render the trigger button inline (default: true) */
  showTrigger?: boolean;
  /** If set, the dialog submits a PUT to update this event instead of creating a new one */
  eventId?: string;
  /** Pre-fill all form fields — used in edit mode */
  initialValues?: Partial<EventFormData>;
  /** User's geolocation — used to show current conditions before a location is picked */
  userCoords?: { lat: number; lon: number };
}

export default function CreateEventDialog({
  open,
  onOpenChange,
  onCreated,
  initialStart = '',
  initialEnd = '',
  showTrigger = true,
  eventId,
  initialValues,
  userCoords,
}: Props) {
  const [form, setForm] = useState<EventFormData>({
    ...EMPTY_FORM,
    startTime: initialStart,
    endTime: initialEnd,
    ...initialValues,
  });
  const [weather, setWeather] = useState<WeatherForecastResult | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openWeather, setOpenWeather] = useState<CurrentConditions | null>(null);
  const [openWeatherLoading, setOpenWeatherLoading] = useState(false);

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM, startTime: initialStart, endTime: initialEnd, ...initialValues });
    setWeather(null);
    setWeatherError(null);
    setError(null);
    setOpenWeather(null);
    setOpenWeatherLoading(false);
  }, [initialStart, initialEnd, initialValues]);

  // Re-seed form and load weather when dialog opens
  useEffect(() => {
    if (!open) return;
    resetForm();
    if (userCoords && !eventId) {
      // Create mode: show current conditions at user's location before they pick a venue
      setOpenWeatherLoading(true);
      api.get<CurrentConditions>('/api/weather/current', {
        params: { lat: userCoords.lat, lon: userCoords.lon },
      })
        .then(({ data }) => setOpenWeather(data))
        .catch(() => {})
        .finally(() => setOpenWeatherLoading(false));
    } else if (eventId && initialValues?.lat != null && initialValues?.lon != null) {
      // Edit mode: auto-fetch forecast for the existing location
      fetchWeather(initialValues.lat as number, initialValues.lon as number);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange?.(nextOpen);
  };

  const set = (field: keyof Pick<EventFormData, 'title' | 'description' | 'startTime' | 'endTime'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleLocationChange = (locationName: string, lat: number, lon: number) => {
    setForm((prev) => ({ ...prev, location: locationName, lat, lon }));
    setWeather(null);
    setOpenWeather(null); // replace user-location weather with venue forecast
    fetchWeather(lat, lon);
  };

  const fetchWeather = async (lat: number, lon: number) => {
    setWeatherError(null);
    setWeatherLoading(true);
    setWeather(null);
    try {
      const { data } = await api.get<WeatherForecastResult>('/api/weather', {
        params: { lat, lon, ai: true },
      });
      setWeather(data);
    } catch {
      setWeatherError('Could not fetch weather for this location.');
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.title || !form.location || form.lat == null || form.lon == null || !form.startTime || !form.endTime) {
      setError('Please fill in all required fields, including selecting a location.');
      return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      setError('End time must be after start time.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        location: form.location,
        lat: form.lat,
        lon: form.lon,
        startTime: form.startTime,
        endTime: form.endTime,
      };
      if (eventId) {
        await api.patch(`/api/events/${eventId}`, payload);
        onCreated?.(eventId);
      } else {
        const { data } = await api.post('/api/events', payload);
        onCreated?.(data.id);
      }
      handleOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || `Failed to ${eventId ? 'update' : 'create'} event. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <Dialog.Portal>
      {/* Overlay */}
      <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

      {/* Panel */}
      <Dialog.Content
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          w-full max-w-xl max-h-[90vh] overflow-y-auto
          bg-white rounded-2xl shadow-2xl
          data-[state=open]:animate-in data-[state=closed]:animate-out
          data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
          data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
          data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]
          data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]
          focus:outline-none"
        >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-indigo-600" />
            <Dialog.Title className="text-lg font-bold text-gray-900">{eventId ? 'Edit Event' : 'Create Event'}</Dialog.Title>
          </div>
          <Dialog.Close asChild>
            <button
              className="rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <Dialog.Description className="text-sm text-gray-500 mb-5">
            {eventId ? 'Update event details below. Weather reloads if you change the location.' : 'Weather forecast loads automatically when you pick a location.'}
          </Dialog.Description>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form id="create-event-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text" required value={form.title} onChange={set('title')}
                placeholder="Annual Outdoor Gala"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2} value={form.description} onChange={set('description')}
                placeholder="What's this event about?"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location <span className="text-red-400">*</span>
              </label>
              <LocationSearch
                value={form.location}
                onChange={handleLocationChange}
                placeholder="Type a venue, city, or address…"
              />
              {form.lat != null && form.lon != null && (
                <p className="text-xs text-gray-400 mt-1">
                  📍 {form.lat.toFixed(4)}, {form.lon.toFixed(4)}
                </p>
              )}
            </div>

            {/* Current conditions at user's location — shown before a venue is picked */}
            {!form.location && openWeatherLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                Fetching current conditions…
              </div>
            )}
            {!form.location && openWeather && (
              <div className="rounded-xl border bg-blue-50 border-blue-200 p-3 text-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Current Conditions at Your Location
                </p>
                <div className="flex items-center gap-3">
                  {openWeather.icon && (
                    <img src={openWeather.icon} alt={openWeather.condition} className="w-10 h-10 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-base">{openWeather.temperature}°C</p>
                    <p className="text-gray-600 text-xs">{openWeather.condition}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500 space-y-0.5">
                    {openWeather.feels_like !== undefined && <p>Feels {openWeather.feels_like}°C</p>}
                    {openWeather.humidity !== undefined && <p>💧 {openWeather.humidity}%</p>}
                    {openWeather.wind_speed > 0 && <p>💨 {openWeather.wind_speed} km/h</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Weather feedback */}
            {weatherLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                Fetching weather forecast…
              </div>
            )}
            {weatherError && <p className="text-xs text-red-500">{weatherError}</p>}
            {weather && <WeatherSummary weather={weather} />}

            {/* High risk warning */}
            {weather?.risk.level === 'high' && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                ⚠️ <strong>High weather risk detected.</strong> Review the forecast above before proceeding.
              </div>
            )}

            {/* Date / time */}
            <div className="grid grid-cols-2 gap-3">
              <DateTimePicker
                label="Start"
                required
                value={form.startTime}
                onChange={(val) => setForm((prev) => ({ ...prev, startTime: val }))}
              />
              <DateTimePicker
                label="End"
                required
                value={form.endTime}
                min={form.startTime || undefined}
                onChange={(val) => setForm((prev) => ({ ...prev, endTime: val }))}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <Dialog.Close asChild>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-white transition"
            >
              Cancel
            </button>
          </Dialog.Close>
          <button
            type="submit"
            form="create-event-form"
            disabled={submitting || form.lat == null}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? (eventId ? 'Saving…' : 'Creating…') : (eventId ? 'Save Changes' : 'Create Event')}
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );

  if (open !== undefined) {
    // Controlled mode (used by calendar date-click)
    return (
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        {content}
      </Dialog.Root>
    );
  }

  // Uncontrolled mode — renders its own trigger button
  return (
    <Dialog.Root onOpenChange={handleOpenChange}>
      {showTrigger && (
        <Dialog.Trigger asChild>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-1.5">
            <CalendarPlus className="w-4 h-4" />
            New Event
          </button>
        </Dialog.Trigger>
      )}
      {content}
    </Dialog.Root>
  );
}
