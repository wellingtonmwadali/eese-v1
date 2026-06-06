export interface WeatherCondition {
  date: string;
  temp_min: number;
  temp_max: number;
  description: string;
  icon: string;
  humidity: number;
  wind_kph: number;
  precipitation_mm: number;
  precipitation_probability: number;
  uv_index: number;
}

export interface WeatherRisk {
  level: 'low' | 'medium' | 'high';
  label: string;
  color: 'green' | 'yellow' | 'red';
  reasons: string[];
}

export interface CurrentConditions {
  temperature: number;
  wind_speed: number;
  wind_direction: number;
  condition: string;
  icon: string;
  feels_like?: number;
  humidity?: number;
  uv_index?: number;
}

export interface DailyForecastResult {
  location: { lat: number; lon: number; timezone?: string; country?: string };
  current?: CurrentConditions;
  days: WeatherCondition[];
}

export interface WeatherForecastResult {
  location: { lat: number; lon: number; timezone?: string; country?: string };
  current?: CurrentConditions;
  days: WeatherCondition[];
  ai_summary: string | null;
  risk: WeatherRisk;
  suggestions: string[];
}
