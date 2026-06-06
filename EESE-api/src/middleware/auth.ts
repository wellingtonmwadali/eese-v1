import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, Role } from '../modules/auth/model';

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: Insufficient role' });
      return;
    }
    next();
  };
}
