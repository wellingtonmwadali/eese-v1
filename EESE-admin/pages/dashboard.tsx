import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, DateSelectArg, DatesSetArg, EventInput, EventContentArg } from '@fullcalendar/core';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import { Role } from '../types/auth';
import type { WeatherCondition, DailyForecastResult, CurrentConditions, WeatherForecastResult } from '../types/weather';
import CreateEventDialog from '../components/CreateEventDialog';

interface ApiEvent {
  id: string;
  title: string;
  startTime: { _seconds: number } | string;
  endTime: { _seconds: number } | string;
  location: string;
  coordinates?: { lat: number; lon: number };
  weatherRisk?: 'low' | 'medium' | 'high';
  description?: string;
}

const riskColor: Record<string, string> = {
  low: '#4f46e5',    // indigo
  medium: '#d97706', // amber
  high: '#dc2626',   // red
};

function toDate(ts: { _seconds: number } | string): string {
  if (typeof ts === 'string') return ts;
  return new Date(ts._seconds * 1000).toISOString();
}

function toDatetimeLocal(ts: { _seconds: number } | string): string {
  const d = typeof ts === 'string' ? new Date(ts) : new Date(ts._seconds * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DashboardPage: NextPage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [eventCurrentWeather, setEventCurrentWeather] = useState<CurrentConditions | null>(null);
  const [eventForecast, setEventForecast] = useState<WeatherForecastResult | null>(null);
  const [eventWeatherLoading, setEventWeatherLoading] = useState(false);
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStart, setDialogStart] = useState('');
  const [dialogEnd, setDialogEnd] = useState('');
  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ApiEvent | null>(null);

  // --- Weather: daily strip (uses /v1/daily — no AI, quota-friendly) ---
  const [weekWeather, setWeekWeather] = useState<WeatherCondition[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  // --- Weather: live current conditions (uses /v1/current) ---
  const [currentConditions, setCurrentConditions] = useState<CurrentConditions | null>(null);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoLabel, setGeoLabel] = useState<string>('');
  const visibleStartRef = useRef<string>('');

  // Get browser geolocation once on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoLabel(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
      },
      () => {
        setGeoCoords({ lat: -1.2921, lon: 36.8219 });
        setGeoLabel('Nairobi (default)');
      },
      { timeout: 5000 }
    );
  }, []);

  // Fetch daily strip via /v1/daily and current conditions via /v1/current
  const fetchWeatherData = useCallback(
    async (coords: { lat: number; lon: number }) => {
      setWeatherLoading(true);
      try {
        // Parallel calls: daily forecast + current conditions
        const [dailyRes, currentRes] = await Promise.allSettled([
          api.get<DailyForecastResult>('/api/weather/daily', {
            params: { lat: coords.lat, lon: coords.lon, days: 7 },
          }),
          api.get<CurrentConditions>('/api/weather/current', {
            params: { lat: coords.lat, lon: coords.lon },
          }),
        ]);

        if (dailyRes.status === 'fulfilled') {
          setWeekWeather(dailyRes.value.data.days);
          const country = dailyRes.value.data.location.country;
          if (country) setGeoLabel((prev) => prev.includes('(default)') ? `Nairobi, ${country}` : prev);
        }
        if (currentRes.status === 'fulfilled') {
          setCurrentConditions(currentRes.value.data);
        }
      } catch {
        // silently fail — weather is supplementary
      } finally {
        setWeatherLoading(false);
      }
    },
    []
  );

  // Fetch fetchWeatherData whenever geolocation becomes available
  useEffect(() => {
    if (geoCoords) fetchWeatherData(geoCoords);
  }, [geoCoords, fetchWeatherData]);

  // Refresh daily strip when calendar navigates to a different week/month
  const handleDatesSet = useCallback(
    (info: DatesSetArg) => {
      const newStart = info.startStr.slice(0, 10);
      if (newStart !== visibleStartRef.current && geoCoords) {
        visibleStartRef.current = newStart;
        fetchWeatherData(geoCoords);
      }
    },
    [geoCoords, fetchWeatherData]
  );

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  // Fetch events
  useEffect(() => {
    if (!user) return;
    api.get<ApiEvent[]>('/api/events')
      .then(({ data }: { data: ApiEvent[] }) => {
        setEvents(
          data.map((e: ApiEvent) => ({
            id: e.id,
            title: e.title,
            start: toDate(e.startTime),
            end: toDate(e.endTime),
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            extendedProps: e,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleEventClick = (info: EventClickArg) => {
    const event = info.event.extendedProps as ApiEvent;
    setSelectedEvent(event);
    setEventCurrentWeather(null);
    setEventForecast(null);

    const coords = event.coordinates;
    if (!coords) return;

    setEventWeatherLoading(true);
    // Fetch current conditions and full forecast (for suggestions) in parallel
    Promise.allSettled([
      api.get<CurrentConditions>('/api/weather/current', {
        params: { lat: coords.lat, lon: coords.lon },
      }),
      api.get<WeatherForecastResult>('/api/weather', {
        params: { lat: coords.lat, lon: coords.lon, days: 1 },
      }),
    ]).then(([currentRes, forecastRes]) => {
      if (currentRes.status === 'fulfilled') setEventCurrentWeather(currentRes.value.data);
      if (forecastRes.status === 'fulfilled') setEventForecast(forecastRes.value.data);
    }).finally(() => setEventWeatherLoading(false));
  };

  const handleDateSelect = (info: DateSelectArg) => {
    if (user?.role === Role.Attendee) return;
    const start = info.startStr.includes('T')
      ? info.startStr.slice(0, 16)
      : `${info.startStr}T09:00`;
    const end = info.allDay
      ? `${info.startStr}T10:00`
      : info.endStr.slice(0, 16);
    setDialogStart(start);
    setDialogEnd(end);
    setDialogOpen(true);
  };

  const handleEventCreated = (eventId: string) => {
    // Refetch events to show the new one immediately
    if (!user) return;
    api.get<ApiEvent[]>('/api/events')
      .then(({ data }: { data: ApiEvent[] }) => {
        setEvents(
          data.map((e: ApiEvent) => ({
            id: e.id,
            title: e.title,
            start: toDate(e.startTime),
            end: toDate(e.endTime),
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            extendedProps: e,
          }))
        );
      })
      .catch(console.error);
    void eventId;
  };

  const renderEventContent = useCallback((arg: EventContentArg) => {
    const title = arg.event.title;
    const risk = (arg.event.extendedProps as ApiEvent).weatherRisk ?? 'low';
    const color = riskColor[risk];
    const typeLabel = risk === 'high' ? 'High risk' : risk === 'medium' ? 'Moderate risk' : 'Low risk';
    const words = title.trim().split(/\s+/);
    const initials = (
      words.length >= 2
        ? (words[0][0] ?? '') + (words[1][0] ?? '')
        : (words[0]?.slice(0, 2) ?? '')
    ).toUpperCase();

    return {
      html: `
        <div style="background:#f9fafb;border-left:4px solid ${color};padding:4px 8px;border-radius:8px;cursor:pointer;overflow:hidden;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="background-color:${color};width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="color:white;font-size:8px;font-weight:bold;">${initials}</span>
            </div>
            <div style="text-align:left;min-width:0;flex:1;">
              <div style="color:#1f2937;font-weight:500;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${title}</div>
              <div style="color:#6b7280;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${typeLabel}</div>
            </div>
          </div>
        </div>
      `,
    };
  }, []);

  const canCreateEvents = user?.role === Role.Planner || user?.role === Role.Admin;

  if (authLoading || !user) return null;

  return (
    <>
      <Head><title>Calendar — EESE</title></Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Top nav */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-indigo-600">EESE</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Event Scheduling Engine</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Live current conditions widget*/}
            {currentConditions && (
              <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600">
                {currentConditions.icon && (
                  <img src={currentConditions.icon} alt={currentConditions.condition} className="w-6 h-6" />
                )}
                <div className="leading-tight">
                  <p className="font-semibold text-gray-800">{currentConditions.temperature}°C</p>
                  <p className="text-gray-400">{currentConditions.condition}</p>
                </div>
                {currentConditions.feels_like !== undefined && (
                  <div className="border-l border-gray-200 pl-2 leading-tight">
                    <p className="text-gray-400">Feels {currentConditions.feels_like}°C</p>
                    {currentConditions.humidity !== undefined && (
                      <p className="text-gray-400">💧 {currentConditions.humidity}%</p>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{user.displayName || user.email}</p>
              <p className="text-xs text-indigo-500 capitalize">{user.role}</p>
            </div>
            {canCreateEvents && (
              <CreateEventDialog
                onCreated={handleEventCreated}
              />
            )}
            <button
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-gray-800 transition cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* 7-day weather strip */}
        <div className="bg-white border-b border-gray-100 px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                7-Day Forecast
              </span>
              {geoLabel && (
                <span className="text-xs text-gray-400">📍 {geoLabel}</span>
              )}
            </div>
            {weatherLoading && (
              <span className="text-xs text-indigo-400 animate-pulse">Fetching weather…</span>
            )}
          </div>

          {weekWeather.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {weekWeather.map((day) => {
                const dateObj = new Date(day.date + 'T12:00:00');
                const isToday = day.date === new Date().toISOString().slice(0, 10);
                const riskBg =
                  day.precipitation_probability >= 70 || day.precipitation_mm > 10
                    ? 'bg-red-50 border-red-200'
                    : day.precipitation_probability >= 40 || day.precipitation_mm > 2
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-200';
                return (
                  <div
                    key={day.date}
                    className={`flex-shrink-0 w-24 rounded-xl border px-2 py-2 text-center text-xs ${riskBg} ${isToday ? 'ring-2 ring-indigo-400' : ''}`}
                  >
                    <p className={`font-semibold ${isToday ? 'text-indigo-600' : 'text-gray-600'}`}>
                      {isToday ? 'Today' : dateObj.toLocaleDateString('en', { weekday: 'short' })}
                    </p>
                    <p className="text-gray-400 text-[10px]">
                      {dateObj.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </p>
                    {day.icon ? (
                      <img src={day.icon} alt={day.description} className="w-8 h-8 mx-auto my-1" />
                    ) : (
                      <div className="h-8 flex items-center justify-center text-base my-1">🌤</div>
                    )}
                    <p className="font-semibold text-gray-800">
                      {Math.round(day.temp_min)}°–{Math.round(day.temp_max)}°C
                    </p>
                    <p className="text-gray-500 truncate text-[10px]" title={day.description}>
                      {day.description}
                    </p>
                    {(day.precipitation_probability > 0 || day.precipitation_mm > 0) && (
                      <p className="text-blue-500 text-[10px] mt-0.5">
                        🌧 {day.precipitation_probability}%
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : !weatherLoading ? (
            <p className="text-xs text-gray-400 py-2">
              Allow location access to see the weather forecast for your area.
            </p>
          ) : null}
        </div>

        {/* Risk legend */}
        <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-6">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Weather Risk:</span>
          {[['low', '#4f46e5', 'Low'], ['medium', '#d97706', 'Moderate'], ['high', '#dc2626', 'High']].map(
            ([key, color, label]) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
                {label}
              </span>
            )
          )}
          {canCreateEvents && (
            <span className="text-xs text-gray-400 ml-4">Click a date to create an event</span>
          )}
        </div>

        {/* Calendar */}
        <main className="flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Loading events…
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                }}
                events={events}
                selectable={canCreateEvents}
                select={handleDateSelect}
                eventClick={handleEventClick}
                datesSet={handleDatesSet}
                eventContent={renderEventContent}
                height="auto"
                eventDisplay="block"
                dayMaxEvents={3}
                nowIndicator
                buttonText={{
                  today: 'Today',
                  month: 'Month',
                  week: 'Week',
                  day: 'Day',
                  list: 'List',
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => { setSelectedEvent(null); setEventCurrentWeather(null); setEventForecast(null); }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Risk badge */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{selectedEvent.title}</h2>
              {selectedEvent.weatherRisk && (
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full capitalize"
                  style={{
                    backgroundColor: riskColor[selectedEvent.weatherRisk] + '20',
                    color: riskColor[selectedEvent.weatherRisk],
                  }}
                >
                  {selectedEvent.weatherRisk} risk
                </span>
              )}
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-700">📍 Location: </span>
                {selectedEvent.location}
              </p>
              <p>
                <span className="font-medium text-gray-700">🕐 Start: </span>
                {new Date(toDate(selectedEvent.startTime as { _seconds: number } | string)).toLocaleString()}
              </p>
              <p>
                <span className="font-medium text-gray-700">🕑 End: </span>
                {new Date(toDate(selectedEvent.endTime as { _seconds: number } | string)).toLocaleString()}
              </p>
              {selectedEvent.description && (
                <p>
                  <span className="font-medium text-gray-700">📝 </span>
                  {selectedEvent.description}
                </p>
              )}
            </div>

            {/* Live conditions at event location */}
            <div className="mt-4">
              {eventWeatherLoading && (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                  <div className="w-3 h-3 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
                  Loading current conditions…
                </div>
              )}
              {!eventWeatherLoading && !eventCurrentWeather && selectedEvent.coordinates && (
                <p className="text-xs text-gray-400 italic">Could not load weather for this location.</p>
              )}
              {!eventWeatherLoading && eventCurrentWeather && (
                <div className="rounded-xl border bg-blue-50 border-blue-200 p-3 text-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Live Conditions at Event Location
                  </p>
                  <div className="flex items-center gap-3">
                    {eventCurrentWeather.icon && (
                      <img src={eventCurrentWeather.icon} alt={eventCurrentWeather.condition} className="w-10 h-10 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-base">{eventCurrentWeather.temperature}°C</p>
                      <p className="text-gray-600 text-xs">{eventCurrentWeather.condition}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500 flex-shrink-0 space-y-0.5">
                      {eventCurrentWeather.feels_like !== undefined && (
                        <p>Feels {eventCurrentWeather.feels_like}°C</p>
                      )}
                      {eventCurrentWeather.humidity !== undefined && (
                        <p>💧 {eventCurrentWeather.humidity}%</p>
                      )}
                      {eventCurrentWeather.wind_speed > 0 && (
                        <p>💨 {eventCurrentWeather.wind_speed} km/h</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!eventWeatherLoading && eventForecast && eventForecast.ai_summary && (
                <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50 p-3">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1.5">AI Weather Summary</p>
                  <p className="text-xs text-purple-900 leading-relaxed">{eventForecast.ai_summary}</p>
                </div>
              )}
              {!eventWeatherLoading && eventForecast && eventForecast.suggestions.length > 0 && (
                <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">Planner Suggestions</p>
                  <ul className="space-y-1">
                    {eventForecast.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-indigo-800">
                        <span className="mt-0.5 flex-shrink-0">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              {canCreateEvents && (
                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    setEventCurrentWeather(null);
                    setEventForecast(null);
                    setEditingEvent(selectedEvent);
                    setEditOpen(true);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition cursor-pointer"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => { setSelectedEvent(null); setEventCurrentWeather(null); setEventForecast(null); }}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controlled dialog — opens when clicking a calendar date */}
      {canCreateEvents && (
        <CreateEventDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={handleEventCreated}
          initialStart={dialogStart}
          initialEnd={dialogEnd}
          userCoords={geoCoords ?? undefined}
          showTrigger={false}
        />
      )}

      {/* Edit dialog — opens when clicking "Edit" on an event */}
      {canCreateEvents && editingEvent && (
        <CreateEventDialog
          open={editOpen}
          onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingEvent(null); }}
          eventId={editingEvent.id}
          initialValues={{
            title: editingEvent.title,
            description: editingEvent.description ?? '',
            location: editingEvent.location,
            lat: editingEvent.coordinates?.lat ?? null,
            lon: editingEvent.coordinates?.lon ?? null,
            startTime: toDatetimeLocal(editingEvent.startTime),
            endTime: toDatetimeLocal(editingEvent.endTime),
          }}
          onCreated={handleEventCreated}
          showTrigger={false}
        />
      )}
    </>
  );
};

export default DashboardPage;
