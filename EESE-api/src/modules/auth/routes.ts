import { Router } from 'express';
import { login, sso, refresh, register } from './controller';

const router = Router();

router.post('/login', login);
router.post('/sso', sso);
router.post('/refresh', refresh);
router.post('/register', register);

export default router;
