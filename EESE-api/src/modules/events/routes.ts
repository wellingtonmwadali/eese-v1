import { Router } from 'express';
import { verifyToken, requireRole } from '../../middleware/auth';
import { Role } from '../auth/model';
import { create, list, getOne, update, remove, refreshWeather } from './controller';

const router = Router();

router.use(verifyToken);

router.post('/', requireRole(Role.Planner, Role.Admin), create);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id', update);
router.delete('/:id', remove);
router.get('/:id/weather', refreshWeather);

export default router;
