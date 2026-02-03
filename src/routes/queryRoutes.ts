import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getQueries,
  getQuery,
  updateQuery,
  deleteQuery,
  bulkUpdateStatus,
} from '../controllers/queryController';

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getQueries);
router.patch('/bulk/status', bulkUpdateStatus);
router.get('/:id', getQuery);
router.patch('/:id', updateQuery);
router.delete('/:id', deleteQuery);

export default router;
