import express from 'express';
import { createQuery } from '../controllers/queryController';

const router = express.Router();
router.post('/', createQuery);
export default router;
