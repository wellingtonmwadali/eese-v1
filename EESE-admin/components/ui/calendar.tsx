'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className = '', classNames = {}, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={['p-3', className].join(' ')}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'space-y-3 relative',
        month_caption: 'flex justify-center pt-1 items-center',
        caption_label: 'text-sm font-semibold text-gray-900',
        nav: 'absolute top-0 left-0 right-0 flex justify-between items-center pointer-events-none',
        button_previous: 'pointer-events-auto h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600',
        button_next: 'pointer-events-auto h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-gray-400 rounded-md w-9 font-normal text-[0.8rem] text-center',
        week: 'flex w-full mt-2',
        day: 'h-9 w-9 text-center text-sm p-0 relative',
        day_button: [
          'h-9 w-9 flex items-center justify-center rounded-md text-sm transition-colors',
          'hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400',
        ].join(' '),
        selected: '[&>button]:bg-indigo-600 [&>button]:text-white [&>button]:hover:bg-indigo-700 [&>button]:hover:text-white',
        today: '[&>button]:border [&>button]:border-indigo-400 [&>button]:font-semibold',
        outside: 'opacity-40',
        disabled: 'opacity-30 cursor-not-allowed [&>button]:cursor-not-allowed',
        range_middle: '[&>button]:bg-indigo-100 [&>button]:rounded-none',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}
