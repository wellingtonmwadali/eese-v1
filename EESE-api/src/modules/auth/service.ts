import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import { Role, JwtPayload } from './model';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export async function verifyEmailPassword(
  email: string,
  password: string
): Promise<{ uid: string; email: string; role: Role }> {
  const firebaseUser = await admin.auth().getUserByEmail(email);

  const userDoc = await admin.firestore().collection('users').doc(firebaseUser.uid).get();
  if (!userDoc.exists) throw Object.assign(new Error('Invalid credentials'), { code: 'auth/user-not-found' });

  const data = userDoc.data() as { passwordHash: string; role: Role };
  const match = await bcrypt.compare(password, data.passwordHash);
  if (!match) throw Object.assign(new Error('Invalid credentials'), { code: 'auth/wrong-password' });

  return { uid: firebaseUser.uid, email: firebaseUser.email!, role: data.role };
}

export async function verifySsoToken(
  idToken: string
): Promise<{ uid: string; email: string; role: Role; displayName?: string }> {
  const decoded = await admin.auth().verifyIdToken(idToken);
  const userRef = admin.firestore().collection('users').doc(decoded.uid);
  const userDoc = await userRef.get();

  let role: Role = Role.Planner;
  if (!userDoc.exists) {
    await userRef.set({
      email: decoded.email,
      role: Role.Planner,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    role = (userDoc.data() as { role: Role }).role;
  }

  const displayName = (userDoc.exists ? (userDoc.data() as { displayName?: string }).displayName : undefined) ?? decoded.name ?? undefined;
  return { uid: decoded.uid, email: decoded.email!, role, displayName };
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
  role: Role
): Promise<{ uid: string }> {
  const firebaseUser = await admin.auth().createUser({ email, password, displayName });
  const passwordHash = await bcrypt.hash(password, 12);

  await admin.firestore().collection('users').doc(firebaseUser.uid).set({
    email,
    displayName,
    role,
    passwordHash,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { uid: firebaseUser.uid };
}
