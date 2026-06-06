export enum Role {
  Admin = 'admin',
  Planner = 'planner',
  Attendee = 'attendee',
}

export interface JwtPayload {
  uid: string;
  email: string;
  role: Role;
  displayName?: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  role: Role;
}
