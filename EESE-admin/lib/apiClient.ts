import axios from 'axios';
import Cookies from 'js-cookie';
import { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'eese_token';

export const api = axios.create({ baseURL: API_URL });

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = Cookies.get(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function loginWithEmail(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/login', payload);
  Cookies.set(TOKEN_KEY, data.token, { sameSite: 'strict' });
  return data;
}

export async function registerWithEmail(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/register', payload);
  Cookies.set(TOKEN_KEY, data.token, { sameSite: 'strict' });
  return data;
}

export async function loginWithSso(idToken: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/sso', { idToken });
  Cookies.set(TOKEN_KEY, data.token, { sameSite: 'strict' });
  return data;
}

export function logout(): void {
  Cookies.remove(TOKEN_KEY);
}

export function getStoredToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}
