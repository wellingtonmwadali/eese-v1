export enum Role {
  Admin = 'admin',
  Planner = 'planner',
  Attendee = 'attendee',
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  role: Role;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  role: Role.Planner | Role.Attendee;
}

export interface AuthResponse {
  token: string;
  role: Role;
  displayName?: string;
}
