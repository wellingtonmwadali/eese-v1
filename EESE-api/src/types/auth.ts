export enum Role {
  Admin = 'admin',
  Planner = 'planner',
  Attendee = 'attendee',
}

export interface JwtPayload {
  uid: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: JwtPayload;
}
