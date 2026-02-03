import express from 'express';
import { getPublicProperties, getPropertyBySlug } from '../controllers/publicPropertyController';

const router = express.Router();

router.get('/', getPublicProperties);
router.get('/slug/:slug', getPropertyBySlug);

export default router;
