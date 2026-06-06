"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.sso = sso;
exports.refresh = refresh;
exports.register = register;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const model_1 = require("./model");
const service_1 = require("./service");
const JWT_SECRET = process.env.JWT_SECRET;
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
    }
    try {
        const user = await (0, service_1.verifyEmailPassword)(email, password);
        const token = (0, service_1.signToken)({ uid: user.uid, email: user.email, role: user.role });
        res.json({ token, role: user.role });
    }
    catch (err) {
        const code = err.code;
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        console.error('Login error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}
async function sso(req, res) {
    const { idToken } = req.body;
    if (!idToken) {
        res.status(400).json({ message: 'idToken is required' });
        return;
    }
    try {
        const user = await (0, service_1.verifySsoToken)(idToken);
        const token = (0, service_1.signToken)({ uid: user.uid, email: user.email, role: user.role, displayName: user.displayName });
        res.json({ token, role: user.role, displayName: user.displayName });
    }
    catch (err) {
        console.error('SSO error:', err);
        res.status(401).json({ message: 'Invalid SSO token' });
    }
}
function refresh(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'No token provided' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const newToken = (0, service_1.signToken)({ uid: decoded.uid, email: decoded.email, role: decoded.role });
        res.json({ token: newToken });
    }
    catch {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
}
async function register(req, res) {
    const { email, password, displayName, role } = req.body;
    if (!email || !password || !displayName) {
        res.status(400).json({ message: 'email, password, and displayName are required' });
        return;
    }
    const allowedRoles = [model_1.Role.Planner, model_1.Role.Attendee];
    const assignedRole = role || model_1.Role.Attendee;
    if (!allowedRoles.includes(assignedRole)) {
        res.status(400).json({ message: 'Invalid role. Only planner or attendee can self-register.' });
        return;
    }
    if (password.length < 8) {
        res.status(400).json({ message: 'Password must be at least 8 characters' });
        return;
    }
    try {
        const { uid } = await (0, service_1.registerUser)(email, password, displayName, assignedRole);
        const token = (0, service_1.signToken)({ uid, email, role: assignedRole });
        res.status(201).json({ token, role: assignedRole });
    }
    catch (err) {
        const code = err.code;
        if (code === 'auth/email-already-exists') {
            res.status(409).json({ message: 'An account with this email already exists' });
            return;
        }
        console.error('Register error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}
//# sourceMappingURL=controller.js.map