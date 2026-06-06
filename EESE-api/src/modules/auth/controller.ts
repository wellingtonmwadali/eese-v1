import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role, JwtPayload } from './model';
import { signToken, verifyEmailPassword, verifySsoToken, registerUser } from './service';

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  try {
    const user = await verifyEmailPassword(email, password);
    const token = signToken({ uid: user.uid, email: user.email, role: user.role });
    res.json({ token, role: user.role });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function sso(req: Request, res: Response): Promise<void> {
  const { idToken } = req.body as { idToken?: string };

  if (!idToken) {
    res.status(400).json({ message: 'idToken is required' });
    return;
  }

  try {
    const user = await verifySsoToken(idToken);
    const token = signToken({ uid: user.uid, email: user.email, role: user.role, displayName: user.displayName });
    res.json({ token, role: user.role, displayName: user.displayName });
  } catch (err) {
    console.error('SSO error:', err);
    res.status(401).json({ message: 'Invalid SSO token' });
  }
}

export function refresh(req: Request, res: Response): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const newToken = signToken({ uid: decoded.uid, email: decoded.email, role: decoded.role });
    res.json({ token: newToken });
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, displayName, role } = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
    role?: string;
  };

  if (!email || !password || !displayName) {
    res.status(400).json({ message: 'email, password, and displayName are required' });
    return;
  }

  const allowedRoles: Role[] = [Role.Planner, Role.Attendee];
  const assignedRole = (role as Role) || Role.Attendee;

  if (!allowedRoles.includes(assignedRole)) {
    res.status(400).json({ message: 'Invalid role. Only planner or attendee can self-register.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: 'Password must be at least 8 characters' });
    return;
  }

  try {
    const { uid } = await registerUser(email, password, displayName, assignedRole);
    const token = signToken({ uid, email, role: assignedRole });
    res.status(201).json({ token, role: assignedRole });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/email-already-exists') {
      res.status(409).json({ message: 'An account with this email already exists' });
      return;
    }
    console.error('Register error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}
