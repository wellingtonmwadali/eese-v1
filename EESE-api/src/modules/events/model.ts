import { WeatherForecastResult } from '../weather/model';

export interface EventCoordinates {
  lat: number;
  lon: number;
}

export interface Event {
  id?: string;
  title: string;
  description: string;
  location: string;
  coordinates: EventCoordinates;
  startTime: string;
  endTime: string;
  attendees: string[];
  createdBy: string;
  weatherRisk?: 'low' | 'medium' | 'high';
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  location: string;
  lat: number;
  lon: number;
  startTime: string;
  endTime: string;
  attendees?: string[];
}

export interface EventWithWeather extends Event {
  weather: WeatherForecastResult;
}
