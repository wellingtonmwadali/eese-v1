import React, { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';

interface Props {
  /** Value as "yyyy-MM-dd'T'HH:mm" (datetime-local string) */
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  /** Minimum selectable date (datetime-local string) */
  min?: string;
}

/** Parse "yyyy-MM-ddTHH:mm" to Date, or undefined if invalid */
function toDate(val: string): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

/** Format a Date to "yyyy-MM-dd" */
function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toDatetimeLocal(date: Date, time: string): string {
  return `${formatDate(date)}T${time}`;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
/** Format a Date to "MMM D, YYYY" for display */
function formatDisplay(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function extractTime(val: string): string {
  if (!val || !val.includes('T')) return '09:00';
  return val.slice(11, 16) || '09:00';
}

export default function DateTimePicker({ value, onChange, label, required, min }: Props) {
  const [open, setOpen] = useState(false);
  const selectedDate = toDate(value);
  const timeValue = extractTime(value);
  const minDate = min ? toDate(min) : undefined;

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    onChange(toDatetimeLocal(day, timeValue));
    // Don't close — let user adjust time in the row below
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    if (selectedDate) {
      onChange(toDatetimeLocal(selectedDate, newTime));
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={[
              'w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500',
              selectedDate ? 'border-gray-300 text-gray-900' : 'border-gray-300 text-gray-400',
            ].join(' ')}
          >
            <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="flex-1">
              {selectedDate
                ? formatDisplay(selectedDate)
                : 'Pick a date'}
            </span>
            {selectedDate && (
              <span className="text-gray-500 font-medium text-xs">{timeValue}</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto">
          <Calendar
            mode="single"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            selected={selectedDate as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSelect={handleDaySelect as any}
            disabled={minDate ? { before: minDate } : undefined}
          />
          {/* Time picker row */}
          <div className="border-t border-gray-100 px-3 py-3 flex items-center gap-3">
            <label className="text-xs text-gray-500 font-medium">Time</label>
            <input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              Done
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
