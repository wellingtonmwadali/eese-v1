"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyEmailPassword = verifyEmailPassword;
exports.verifySsoToken = verifySsoToken;
exports.registerUser = registerUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const model_1 = require("./model");
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
async function verifyEmailPassword(email, password) {
    const firebaseUser = await firebase_admin_1.default.auth().getUserByEmail(email);
    const userDoc = await firebase_admin_1.default.firestore().collection('users').doc(firebaseUser.uid).get();
    if (!userDoc.exists)
        throw Object.assign(new Error('Invalid credentials'), { code: 'auth/user-not-found' });
    const data = userDoc.data();
    const match = await bcryptjs_1.default.compare(password, data.passwordHash);
    if (!match)
        throw Object.assign(new Error('Invalid credentials'), { code: 'auth/wrong-password' });
    return { uid: firebaseUser.uid, email: firebaseUser.email, role: data.role };
}
async function verifySsoToken(idToken) {
    const decoded = await firebase_admin_1.default.auth().verifyIdToken(idToken);
    const userRef = firebase_admin_1.default.firestore().collection('users').doc(decoded.uid);
    const userDoc = await userRef.get();
    let role = model_1.Role.Attendee;
    if (!userDoc.exists) {
        await userRef.set({
            email: decoded.email,
            role: model_1.Role.Attendee,
            createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
        });
    }
    else {
        role = userDoc.data().role;
    }
    const displayName = (userDoc.exists ? userDoc.data().displayName : undefined) ?? decoded.name ?? undefined;
    return { uid: decoded.uid, email: decoded.email, role, displayName };
}
async function registerUser(email, password, displayName, role) {
    const firebaseUser = await firebase_admin_1.default.auth().createUser({ email, password, displayName });
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    await firebase_admin_1.default.firestore().collection('users').doc(firebaseUser.uid).set({
        email,
        displayName,
        role,
        passwordHash,
        createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
    });
    return { uid: firebaseUser.uid };
}
//# sourceMappingURL=service.js.map