import React from 'react';
import type { WeatherForecastResult } from '../types/weather';

interface Props {
  weather: WeatherForecastResult;
}

const riskConfig = {
  low:    { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  badge: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  high:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
};

export default function WeatherSummary({ weather }: Props) {
  const cfg = riskConfig[weather.risk.level];

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          Weather Forecast
          {weather.location.country && (
            <span className="ml-2 text-xs font-normal text-gray-400">({weather.location.country})</span>
          )}
        </h3>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {weather.risk.label}
        </span>
      </div>

      {/* Current conditions */}
      {weather.current && (
        <div className="flex items-center gap-3 text-sm text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
          {weather.current.icon && (
            <img src={weather.current.icon} alt={weather.current.condition} className="w-8 h-8" />
          )}
          <div>
            <span className="font-medium text-gray-800">{weather.current.temperature}°C</span>
            <span className="mx-2 text-gray-400">·</span>
            <span>{weather.current.condition}</span>
            <span className="mx-2 text-gray-400">·</span>
            <span>💨 {weather.current.wind_speed} km/h</span>
          </div>
        </div>
      )}

      {/* AI Summary */}
      {weather.ai_summary && (
        <div className="text-sm text-gray-700 leading-relaxed bg-white border-l-4 border-indigo-400 pl-3 pr-2 py-2 rounded-r-lg">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">AI Weather Insight</p>
          {weather.ai_summary}
        </div>
      )}

      {/* Risk reasons */}
      {weather.risk.reasons.length > 0 && (
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${cfg.text}`}>Risks Identified</p>
          <ul className="space-y-1">
            {weather.risk.reasons.map((reason, i) => (
              <li key={i} className={`text-sm flex items-start gap-2 ${cfg.text}`}>
                <span className="mt-0.5">⚠️</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {weather.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-indigo-700">Planner Suggestions</p>
          <ul className="space-y-1">
            {weather.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="mt-0.5">💡</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Daily breakdown */}
      {weather.days.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">Daily Breakdown</p>
          <div className="grid grid-cols-3 gap-2">
            {weather.days.slice(0, 3).map((day) => (
              <div key={day.date} className="bg-white rounded-lg p-2 text-center border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400">
                  {new Date(day.date + 'T12:00:00').toLocaleDateString('en', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                {day.icon && (
                  <img src={day.icon} alt={day.description} className="w-8 h-8 mx-auto my-1" />
                )}
                <p className="text-sm font-semibold text-gray-800">
                  {day.temp_min}° – {day.temp_max}°C
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate" title={day.description}>
                  {day.description}
                </p>
                {(day.precipitation_mm > 0 || day.precipitation_probability > 0) && (
                  <p className="text-xs text-blue-500 mt-0.5">
                    🌧 {day.precipitation_mm}mm · {day.precipitation_probability}%
                  </p>
                )}
                {day.wind_kph > 20 && (
                  <p className="text-xs text-gray-400 mt-0.5">💨 {day.wind_kph} km/h</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
